var http = require('http');
const fs = require('fs');
const glob = require('glob');
const path = require('path');
const powershell = require('node-powershell');
const { Buffer } = require('buffer');
const { dir } = require('console');
const { runInContext } = require('vm');
const { type } = require('os');

var config = {
    "port": process.env.npm_package_config_port,
    "msfs_install_dir": process.env.npm_package_config_msfs_install_dir,
    "msfs_packages_dir": process.env.npm_package_config_msfs_packages_dir
};

async function findMSFS() {
    const msStoreName = "Microsoft.FlightSimulator";
    let msStorePubId;
    let ps = new powershell();

    if (!config.msfs_install_dir) {
        ps.addCommand(`Get-AppxPackage ${msStoreName} | ConvertTo-Json`)
        let res = JSON.parse(await ps.invoke());
        if (res) {
            config.msfs_install_dir = res.InstallLocation;
            msStorePubId = res.PublisherId;
        }
        ps.clear();
    }
    if (!config.msfs_packages_dir) {
        if (msStorePubId) {
            ps.addCommand(`cat ${process.env.LOCALAPPDATA}\\Packages\\${msStoreName}_${msStorePubId}\\LocalCache\\UserCfg.opt | Select-String InstalledPackagesPath`);
            let res = await ps.invoke();
            if (res) {
                config.msfs_packages_dir = res.match(/"(.*)"/)[1]
            }
        }
    }
    ps.dispose();
}

/**
 * Create a database with all of the files from all packages for a given
 * resource type.
 *
 *  @param {Array} top_dirs - top level directories to search
 * @param {string}} type - resource type (e.g. html_ui, SimObjects/Airplanes),
 *                  really the top directory name to look for in packages
 * @param {Array} filematch - optional, file match list
 */
function search_files(top_dirs, type, filematch=null) {
    var files = new Map()
    var dirs = []

    console.log(`looking for ${type}...`)

    for (let i = 0; i < top_dirs.length; i++) {
        dirs = dirs.concat(glob.sync(top_dirs[i]+'/*/' + type))
    }

    var paths = []

    for (let i = 0; i < dirs.length; i++) {
        paths = paths.concat(glob.sync(dirs[i] + "/**"))
    }

    console.log(`found ${dirs.length} dirs`)

    for (let i = 0; i < paths.length; i++) {
        if (!fs.statSync(paths[i]).isFile()) {
            continue;
        }

        if (filematch && !filematch.find(e => path.basename(paths[i]).toLowerCase().indexOf(e) >= 0)) {
            continue;
        }

        let index = paths[i].indexOf(type);
        if (index > 0) {
            files.set(paths[i].slice(index + type.length).toLowerCase(), paths[i]);
        } else {
            files.set('/' + paths[i].toLowerCase(), paths[i]);
        }
    }

    console.log(`found ${files.size} files`);
    return files;
}

async function findFiles() {
    await findMSFS();

    try {
        if (!fs.statSync(config.msfs_install_dir + '/Packages').isDirectory()) {
            throw "invalid MSFS install directory";
        } else {
            console.log(`MSFS install dir: ${config.msfs_install_dir}`);
        }
        if (!fs.statSync(config.msfs_packages_dir + '/Official/OneStore').isDirectory()) {
            throw ("invalid MSFS packages directory");
        } else {
            console.log(`MSFS packages dir: ${config.msfs_packages_dir}`);
        }
        if (!config.port) {
            console.warn("using default 8080 port")
            config.port = 8080;
        }
    } catch (err) {
        console.error("bad configuration, exiting");
        throw err;
    }

    let packages_dirs = [ 
        config.msfs_packages_dir + '/Official/OneStore/',
        config.msfs_packages_dir + '/Community/', '.' 
    ]

    html_ui_files = search_files([config.msfs_install_dir + '/Packages'].concat(packages_dirs), 'html_ui')
    vfs_files = search_files(packages_dirs, 'SimObjects', [ '.xml', 'thumbnail.jpg' ])

    /**
     * Some HTML files pull in CSS files by using relative paths (e.g. style.css
     * instead of a/b/style.css). To work-around this issue keep an array with the
     * directories of HTML files and search the CSS files in all of them.
     */
    html_dirs = new Array();
    html_dirs.push("");
}

function requestListener(req, resp) {
    var f = req.url.split('?')[0];
    let contentType = 'text/plain';
    var files = html_ui_files;

    if (f == '/') {
        f = '/index.html';
    } else if (f.startsWith('/VFS/')) {
        f = f.substring('/VFS'.length, f.length)
        files = vfs_files
    }

    f = f.toLowerCase();

    switch (path.extname(f)) {
    case '.html':
        contentType = 'text/html';
        html_dirs.push(path.dirname(f));
        break;
    case '.js':
        contentType = 'text/javascript; charset=utf-8';
        break;
    case '.css':
        contentType = 'text/css';
        if (path.dirname(f) == "/") {
            /**
             * A HTML file was using a relative path for the CSS file. Since
             * they are loaded async we don't know where to look for the CSS
             * file. Try all directories that had HTML requests.
             */
            for(let i = html_dirs.length - 1; i >= 0; i--) {
                let tmp = html_dirs[i] + f;
                if (files.get(tmp) != undefined)
                    f = tmp;
            }
        }
        break;
    case '.json':
        contentType = 'text/json';
        break;
    case '.png':
        contentType = 'image/png';
        break;
    case '.jpg':
        contentType = 'image/jpg';
        break;
    case '.xml':
        contentType = 'text/xml';
        break;
    case '.svg':
        contentType = 'image/svg+xml';
    }

    if (files.get(f) == undefined) {
        resp.writeHead(404, { 'Content-Type': 'text/plain' });
        resp.end('file not found');
        if (path.extname(f) != '.map')
            console.log(`${files == vfs_files?"vfs":"html_ui"}: file not found: ${f}`)
    } else {
        fs.readFile(files.get(f), function(error, content) {
            if (error) {
                resp.writeHead(500);
                resp.end(`error ${error.code} ${files.get(f)}`);
            } else {
                if (f == "/js/common.js" || f == "/pages/vcockpit/core/vcockpit.js") {
                    let tmp = content.toString();
                    tmp = tmp.replace(/"coui:\/\/html_ui([^"]*)"/ig, "\`${window.location.origin}$1\`");
                    tmp = tmp.replace(/bsolutePath\(window.location.pathname/g,'bsolutePath("/"')
                    content = new Buffer.from(tmp, 'utf-8');
                } else if (path.extname(f) == '.html') {
                    let tmp = content.toString();
                    tmp = tmp.replace(/<script type="text\/html" import-script="(.*)"><\/script>/g,  '<import-script src="$1"></import-script>');
                    tmp = tmp.replace(/<script type="text\/html" import-template="(.*)"><\/script>/g,  '<import-template href="$1"></import-template>')
                    content = new Buffer.from(tmp, 'utf-8');
                } else if (path.extname(f) == '.css') {
                    /* apply --vhScale correction to all vh terms */
                    let tmp = content.toString();
                    tmp = tmp.replace(/(.* )([-0-9.]+vh)(.*)/g,  '$1calc($2 * var(--vhScale))$3');
                    content = new Buffer.from(tmp, 'utf-8');
                }
                resp.writeHead(200, { 'Content-Type': contentType });
                resp.end(content, 'utf-8');
            }
        });
    }
}

async function main() {
    await findFiles();
    console.log(`starting server at http://localhost:${config.port}`)
    http.createServer(requestListener).listen(config.port);
}

main()