class WebSim {
    static basename(path) {
        return path.split('/').reverse()[0];
    }
    static requestXML(xmlPath) {
        return new Promise((resolve, reject) => {
            let xhr = new XMLHttpRequest();
            xhr.open("GET", xmlPath, true);
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    if (xhr.responseXML) {
                        resolve(xhr.responseXML);
                    } else {
                        reject("bad XML");
                    }
                }
            }
            xhr.onerror = () => reject(xhr.statusText);
            xhr.send();
        });
    }
}
