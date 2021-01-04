class ElectricalSwitches extends BaseInstrument {
    constructor() {
        super();
    }
    get templateID() { return "ElectricalSwitches"; }
    connectedCallback() {
        //super.connectedCallback();
        this.loadXMLConfig();
    }
    onXMLConfigLoaded(_xml) {
        this.xmlConfig = _xml.responseXML;
        if (!this.xmlConfig) {
            return;
        }

        let instruments = this.xmlConfig.getElementsByTagName("Instrument");
        for (let i = 0; i < instruments.length; i++) {
            let name = instruments[i].getElementsByTagName("Name")[0].textContent;
            let switches = instruments[i].getElementsByTagName("Electric");
            for (let j = 0; j < switches.length; j++) {
                let simvar = switches[j].getElementsByTagName("Simvar")[0].getAttribute("name");

                let div = document.createElement("div");
                div.className = "electrical-switches"
                {
                    let instrLabel = document.createElement("label");
                    instrLabel.className = "electrical-switches";
                    instrLabel.innerHTML=name;
                    div.appendChild(instrLabel);

                    let checkboxWithLabel = document.createElement("div");
                    {
                        let checkbox = document.createElement("input");
                        checkbox.setAttribute("type", "checkbox");
                        checkbox.setAttribute("simvar", simvar);
                        checkbox.addEventListener("change", this.switchHandler);
                        checkboxWithLabel.appendChild(checkbox);

                        let label = document.createElement("label");
                        label.innerHTML = simvar;
                        checkboxWithLabel.appendChild(label);
                    }
                    div.appendChild(checkboxWithLabel);
                }
                this.appendChild(div);
            }
        }
    }
    switchHandler(e) {
        var sw = e.currentTarget.getAttribute("simvar");
        SimVar.SetSimVarValue(sw, "Boolean", e.currentTarget.checked);
    }
}
registerInstrument("electrical-switches", ElectricalSwitches);