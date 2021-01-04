class NameZ {
    constructor(str) {
        this.str = str;
        this.idLow = this.hashFnv32a(str);
        this.idHigh = this.hashFnv32a(this.idLow + str);
    }
    /**
     * Calculate a 32 bit FNV-1a hash
     * Found here: https://gist.github.com/vaiorabbit/5657561
     * Ref.: http://isthe.com/chongo/tech/comp/fnv/
     *
     * @param {string} str the input value
     * @param {integer} [seed] optionally pass the hash of the previous chunk
     * @returns {integer | string}
     */
    hashFnv32a(str, seed=0x811c9dc5) {
        /*jshint bitwise:false */
        var i, l, hval = seed;
        for (i = 0, l = str.length; i < l; i++) {
            hval ^= str.charCodeAt(i);
            hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
        }
        return hval >>> 0;
    }
}

class WebSimCockpitPanelData {
    constructor(name, x, y, X=x, Y=y) {
        this.sName = name;
        this.vDisplaySize = new Object();
        this.vDisplaySize.x = x;
        this.vDisplaySize.y = y;
        this.vLogicalSize = new Object();
        this.vLogicalSize.x = X;
        this.vLogicalSize.y = Y;
        this.daInstruments = new Array();
        this.daAttributes = new Array();
        this.sConfigFile = "";
        this.daPanels = [this];
        this.daOriginalMaterials = [];
    }

    setConfigFile(filename) {
        this.sConfigFile = filename;
    }

    addInstrument(url, name, x, y, z, w) {
        var instrument = new Object();

        instrument.sUrl = url;
        instrument.iGUId = name;
        instrument.nName = new Name_Z(name);
        instrument.vPosAndSize = new Object();
        instrument.vPosAndSize.x = x;
        instrument.vPosAndSize.y = y;
        instrument.vPosAndSize.z = z;
        instrument.vPosAndSize.w = w;

        this.daInstruments.push(instrument);
    }
}

class WebSimCockpitPanel {
    constructor(xmlPath) {
        this.xmlPath = xmlPath;
    }
    windowResize() {
        let vh = document.documentElement.style.getPropertyValue("--viewportHeight");
        document.documentElement.style.setProperty('--vhScale', (768/vh).toString());
        window["viewportRatioH"] = vh/592;
    }
    setupPanel(index) {
        VCockpitPanel.instrumentRoot = "Pages/VCockpit/Instruments/";
        VCockpitLogic.systemsRoot = "Pages/VCockpit/Systems/";
        Include.absoluteURL = function(current, relativePath) {
            return `${window.location.origin}` + Include.absolutePath(current, relativePath);
        }

        window.top["g_nameZObject"]=class {
            static GetNameZ(str) {
                return new NameZ(str);
            }
        }

        document.documentElement.style.setProperty('overflow', 'scroll');
        window.onresize = this.windowResize();
        this.windowResize();

        WebSim.requestXML(this.xmlPath).then(xmlConfig => {
            let panel = xmlConfig.getElementsByTagName("panel")[index];
            let name =  WebSim.basename(panel.getAttribute("path")).replace("_", " ");
            let data = new WebSimCockpitPanelData(name, panel.getAttribute("width"), panel.getAttribute("height"));
            data.setConfigFile(panel.getAttribute("path") + "/panel/panel.xml");
            for(let e of panel.getElementsByTagName("instrument")) {
                let x = e.getAttribute("x");
                let y = e.getAttribute("y");
                let w = e.getAttribute("width");
                let h = e.getAttribute("height");
                data.addInstrument(e.getAttribute("html"), e.getAttribute("name"), x, y, w, h);
            }

            Coherent.trigger("ShowVCockpitPanel", data);
            Coherent.trigger("OnAllInstrumentsLoaded");
            Coherent.trigger("InitVCockpitLogic", data);
        });
    }
}

websim = new WebSimCockpitPanel("/WebSim/CockpitPanelList.xml")
