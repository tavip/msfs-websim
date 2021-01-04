class WebSimCockpitPanelList {
    constructor(xmlPath) {
        this.xmlPath = xmlPath;
    }
    loadPanels() {
        WebSim.requestXML(this.xmlPath).then(xmlConfig => {
            let xmlPanels = xmlConfig.getElementsByTagName("panel");

            let panelList = document.querySelector("div.panels");
            let dotList = document.querySelector("div.dots");
            let panelTemplate = panelList.querySelector(".panel");
            let dotTemplate = document.querySelector(".dot")
            let next = document.querySelector(".prev");

            for(let i =0; i < xmlPanels.length - 1; i++) {
                /* keep the prev / next last so that they are always rendered, even during fade events */
                panelList.insertBefore(panelTemplate.cloneNode(true), next);
                dotList.appendChild(dotTemplate.cloneNode(true));
            }

            this.panels = panelList.querySelectorAll(".panel");
            this.dots = dotList.children;

            for(let i = 0; i < xmlPanels.length; i++) {
                let path = xmlPanels[i].getAttribute("path");
                let thumbnail = "/VFS/" + path + "/TEXTURE/thumbnail.JPG";
                let name = WebSim.basename(path).replace(/_/g, " ");
                this.panels[i].querySelector("img").setAttribute("src", thumbnail);
                let title = this.panels[i].querySelector("a.title");
                title.innerHTML= name;
                title.setAttribute("href", `/WebSim/CockpitPanel.html?index=${i}`);

                this.dots[i].id = i;
            }

            panelList.querySelector(".next").addEventListener("click", e => this.nextPanel(e));
            panelList.querySelector(".prev").addEventListener("click", e => this.prevPanel(e));
            for (let i = 0; i < this.dots.length; i++) {
                this.dots[i].addEventListener("click", e => this.showPanel(e));
            }

            this.currentPanel = 0;
            this.update(0);
        });
    }
    update(panel) {
        if (panel == this.currentTarget) {
            return;
        }
        this.panels[this.currentPanel].style.display = "none";
        this.dots[this.currentPanel].className = this.dots[this.currentPanel].className.replace(" active", "");
        this.panels[panel].style.display = "flex";
        this.dots[panel].className += " active"
        this.currentPanel = panel;
    }
    nextPanel(e) {
        let next = this.currentPanel + 1;
        if (next >= this.panels.length) {
            next = 0;
        }
        this.update(next);
    }
    prevPanel(e) {
        let prev = this.currentPanel - 1
        if (prev < 0) {
            prev = this.panels.length - 1;
        }
        this.update(prev);
    }
    showPanel(e) {
        this.update(e.currentTarget.id);
    }
}

websim = new WebSimCockpitPanelList("/WebSim/CockpitPanelList.xml")
