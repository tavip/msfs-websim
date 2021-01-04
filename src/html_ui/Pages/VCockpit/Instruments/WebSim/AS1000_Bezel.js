class AS1000_Bezel extends BaseInstrument {
    constructor() {
        super();
    }
    get templateID() { return "AS1000_Bezel"; }
    connectedCallback() {
        super.connectedCallback();
        this.querySelectorAll("button").forEach(b => b.addEventListener("click", (e) => this.keyHandler(e)));
        ["svg.nav", "svg.hdg", "svg.alt", "svg.com", "svg.crs-baro", "svg.range", "svg.fms"].forEach(sel => {
            let svg = this.querySelector(sel);
            svg.addEventListener("click", (e) => this.keyHandler(e));
            svg.addEventListener("wheel", (e) => this.rotationHandler(e));
            svg.addEventListener("mousemove", (e) => this.positionHandler(e));
        });
    }
    getGuidFromEvent(event) {
        var elem = event.currentTarget;

        while (elem && elem.tagName.toLowerCase() != "as1000-bezel-element") {
            elem = elem.parentElement;
        }

        if (elem) {
            return elem.getAttribute("guid");
        }
    }
    dispatchSimEvent(simEvent, uiEvent) {
        if (simEvent.startsWith("H:")) {
            var instr = this.getGuidFromEvent(uiEvent);
            Coherent.trigger("OnInteractionEvent", null, [`${instr.replace(/_BEZEL/,"")}_${simEvent.substring(2)}`]);
        } else {
            SimVar.SetSimVarValue(simEvent, null, 0);
        }
    }
    keyHandler(uiEvent) {
        var simEvent = uiEvent.currentTarget.getAttribute("event");
        this.dispatchSimEvent(simEvent, uiEvent);
    }
    positionHandler(uiEvent) {
        var svg = uiEvent.currentTarget;
        var inner = svg.querySelector("circle.inner");
        /* inner knob is selected if the distance between the inner circle center and the current
           mouse cursor is less then the radius. */
        var cx = inner.getAttribute("cx");
        var cy = inner.getAttribute("cy");
        var dist = Math.sqrt(Math.pow(uiEvent.offsetX - cx, 2) + Math.pow(uiEvent.offsetY - cy, 2));
        if (dist < inner.getAttribute("r")) {
            svg.setAttribute("knob", "inner");
        } else if (svg.hasAttribute("outer-degrees")) {
            svg.setAttribute("knob", "outer");
        }
    }
    rotationHandler(uiEvent) {
        var svg = uiEvent.currentTarget;
        var knob = svg.getAttribute("knob");
        var marker = svg.querySelector(`circle.${knob}-dot`);
        var cx = svg.querySelector("circle.inner").getAttribute("cx");
        var cy = svg.querySelector("circle.inner").getAttribute("cy");
        var sign = uiEvent.deltaY < 0 ? -1 : 1;
        var incdec = uiEvent.deltaY < 0 ? "dec" : "inc";
        var degrees = parseInt(svg.getAttribute(`${knob}-degrees`));
        var simEvent = svg.getAttribute(`event-${knob}-${incdec}`)

        uiEvent.preventDefault();

        degrees += sign * parseInt(svg.getAttribute(`${knob}-step`));
        if (degrees < 0) {
            degrees += 360;
        } else if (degrees > 360) {
            degrees -= 360;
        }

        svg.setAttribute(`${knob}-degrees`, degrees);
        marker.setAttribute("transform", `rotate(${degrees}, ${cx}, ${cy})`);

        this.dispatchSimEvent(simEvent, uiEvent);
    }
}
registerInstrument("as1000-bezel-element", AS1000_Bezel);