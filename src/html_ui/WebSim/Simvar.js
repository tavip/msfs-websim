class SimVar {
    constructor() {
        this.time = 0;
        this.vars = new Map();

        this.SetSimVarValue("NAV STANDBY FREQUENCY:1", null, 111.1);
        this.SetSimVarValue("NAV STANDBY FREQUENCY:2", null, 111.1);
        this.SetSimVarValue("NAV ACTIVE FREQUENCY:1", null, 111.1);
        this.SetSimVarValue("NAV ACTIVE FREQUENCY:2", null, 111.1);
        this.SetSimVarValue("COM STANDBY FREQUENCY:1", null, 122.8);
        this.SetSimVarValue("COM STANDBY FREQUENCY:2", null, 122.8);
        this.SetSimVarValue("COM ACTIVE FREQUENCY:1", null, 122.8);
        this.SetSimVarValue("COM ACTIVE FREQUENCY:2", null, 122.8);
        this.SetSimVarValue("C:fs9gps:FlightPlanIsActiveApproach", null, false);
        this.SetSimVarValue("C:fs9gps:FlightPlanIsLoadedApproach", null, false);
        this.SetSimVarValue("C:fs9gps:NearestIntersectionItemsNumber", null, 0);
        this.SetSimVarValue("C:fs9gps:NearestVorItemsNumber", null, 0);
        this.SetSimVarValue("C:fs9gps:NearestNdbItemsNumber", null, 0);
        this.SetSimVarValue("C:fs9gps:NearestAirportItemsNumber", null, 0);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.SetSimVarValue("PLANE LATITUDE", null, position.coords.latitude);
                this.SetSimVarValue("PLANE LONGITUDE", null, position.coords.longitude);
            });
        }
    }
    /**
     * Handle simvar updates for K prefixed variables. These seem to be commands
     * rather then proper simvars which modify simvars (e.g. switch coms, navs,
     * spacing mode, etc.)
     *
     * @param {*} code - simvar command
     * @param {*} type - simvar type
     * @param {*} arg - argument for command
     */
    handle_keys(code, type, arg) {
        var cmd = code.split('_');

        switch (code) {
        case "COM_1_SPACING_MODE_SWITCH":
        case "COM_2_SPACING_MODE_SWITCH":
        {
            let idx = cmd[1];
            let svar = `COM SPACING MODE:${idx}`;
            let sval;

            /* spacing mode switch command */
            switch (arg) {
            case 0: /* toggle spacing mode between 8.33Khz/25Khz */
                sval = this.GetSimVarValue(svar) == 0 ? 1: 0;
                break;
            case 1: /* reset spacing mode to 25Khz */
                sval = 0;
                break;
            }
            this.SetSimVarValue(svar, null, sval);
            break;
        }
        case 'NAV1_RADIO_FRACT_INC':
        case 'NAV2_RADIO_FRACT_INC':
        case 'NAV1_RADIO_FRACT_DEC':
        case 'NAV2_RADIO_FRACT_DEC':
        case 'NAV1_RADIO_WHOLE_INC':
        case 'NAV2_RADIO_WHOLE_INC':
        case 'NAV1_RADIO_WHOLE_DEC':
        case 'NAV2_RADIO_WHOLE_DEC':
        case 'COM_RADIO_FRACT_INC':
        case 'COM_RADIO_FRACT_DEC':
        case 'COM_RADIO_FRACT_INC':
        case 'COM_RADIO_FRACT_INC':
        case 'COM_RADIO_WHOLE_INC':
        case 'COM_RADIO_WHOLE_DEC':
        case 'COM2_RADIO_FRACT_INC':
        case 'COM2_RADIO_FRACT_DEC':
        case 'COM2_RADIO_WHOLE_INC':
        case 'COM2_RADIO_WHOLE_DEC':
        {
            let radio = cmd[0].substring(0, 3);
            let no = cmd[0].substring(3) || "1";
            let min = radio == "NAV" ? 108 : 118;
            let max = radio == "NAV" ? 117 : 136;
            let step = 1;

            if (cmd[2] == "FRACT") {
                switch (radio) {
                case "NAV":
                    step = 0.05;
                    break;
                case "COM":
                    if (this.GetSimVarValue(`COM SPACING MODE:${no}`) > 0) {
                        step = 0.005;
                    } else {
                        step = 0.025;
                    }
                    break;
                }
            }

            if (cmd[3] == "DEC") {
                step = -step;
            }

            this.updateStandbyRadio(radio, no, step, min, max);
            break;
        }
        case "NAV1_RADIO_SWAP":
        case "NAV2_RADIO_SWAP":
        case "COM_STBY_RADIO_SWAP":
        case "COM2_RADIO_SWAP":
        {
            let radio = cmd[0].substring(0, 3);
            let no = cmd[0].substring(3) || "1";
            let activeVarName = `${radio} ACTIVE FREQUENCY:${no}`;
            let standbyVarName = `${radio} STANDBY FREQUENCY:${no}`;
            let active = this.GetSimVarValue(activeVarName);
            let standby = this.GetSimVarValue(standbyVarName);

            this.SetSimVarValue(activeVarName, null, standby);
            this.SetSimVarValue(standbyVarName, null, active);
            break;
        }
        case "KOHLSMAN_INC":
        case "KOHLSMAN_DEC":
            {
                let varName = `KOHLSMAN SETTING HG:${arg}`;
                let hg = this.GetSimVarValue(varName);
                let step = cmd[1] == "INC" ? 0.01 : -0.01;

                this.SetSimVarValue(varName, null, parseFloat((hg + step).toFixed(2)));
                break;
            }
        case "XPNDR_SET":
            {
                let decode = Math.trunc(arg / 4096) * 1000 + Math.trunc((arg % 4096 ) / 256) * 100  +
                             Math.trunc((arg % 256) / 16) * 10 + arg % 16;
                this.SetSimVarValue("TRANSPONDER CODE:1", null, decode);
                break;
            }
        case "HEADING_BUG_INC":
        case "HEADING_BUG_DEC":
        {
            let hdg = this.GetSimVarValue("AUTOPILOT HEADING LOCK DIR", "degrees");
            let step = cmd[2] == "INC" ? 1 : -1;

            hdg += step;
            if (hdg < 0 || hdg > 360) {
                hdg -= 360 * step;
            }

            this.SetSimVarValue("AUTOPILOT HEADING LOCK DIR", null, hdg + step);
            break;
        }
        case "HEADING_BUG_SET":
        {
            let hdg = this.GetSimVarValue("PLANE HEADING DEGREES MAGNETIC", "degrees");
            this.SetSimVarValue("AUTOPILOT HEADING LOCK DIR", null, hdg);
            break;
        }
        default:
            console.log(`unhandled K:${code} ${arg} ${type}`);
        }
    }

    /**
     * Update the radio with the given value.
     *
     * @param {string} radio - radio type (e.g. "COM", "NAV")
     * @param {string} no - radio number (e.g. 1, 2)
     * @param {number} step - can be either fractionar or integer as well
     *                        positive or negative
     * @param {number} min - minimum value before wrap-around
     * @param {number} min - maximum value before wrap-around
     * @param {boolean} fractWrap - wraparound the fractionar part
     */
    updateStandbyRadio(radio, no, step, min, max, fractWrap=true) {
        let svar = `${radio} STANDBY FREQUENCY:${no}`;
        var val = this.GetSimVarValue(svar);
        var whole = Math.trunc(val);
        var fract = parseFloat((val - whole).toFixed(3));

        if (Math.abs(step) < 1) {
            fract += step;
            if (fractWrap && (fract >= 1 || fract < 0)) {
                fract -= Math.sign(step);
            }
        } else {
            whole += step;
            if (whole > max || whole < min) {
                whole -= Math.sign(step) * (max - min + 1)
            }
        }
        this.SetSimVarValue(svar, null, whole + fract);
    }

    /**
     * Handle simvar updates for C:fs9gps prefixed variables.
     *
     * @param {*} code - simvar command
     * @param {*} type - simvar type
     * @param {*} arg - argument for command
     * @param {*} id - argument for command
     */
    handle_fs9gps(code, type, arg, id) {
        switch (code) {
        case "IcaoSearchStartCursor":
        {
            this.vars.set("C:fs9gps:IcaoSearchCurrentIcao", "000LZ");
            this.vars.set("C:fs9gps:IcaoSearchCurrentIdent", "000LZ");
            this.vars.set("C:fs9gps:IcaoSearchCursorPosition", 0);
            break;
        }
        case 'IcaoSearchAdvanceCursor':
        {  
            let cpos = this.vars.get("C:fs9gps:IcaoSearchCursorPosition") + arg;
            this.vars.set("C:fs9gps:IcaoSearchCursorPosition", cpos);
            break;
        }
        case 'NearestAirportMaximumDistance':
        case 'NearestIntersectionMaximumDistance':
        case 'NearestVorMaximumDistance':
        case 'NearestNdbMaximumDistance':
        case 'NearestIntersectionCurrentLongitude':
        case 'NearestAirportCurrentLongitude':
        case 'NearestNdbCurrentLongitude':
        case 'NearestVorCurrentLongitude':
        case 'NearestIntersectionCurrentLatitude':
        case 'NearestAirportCurrentLatitude':
        case 'NearestNdbCurrentLatitude':
        case 'NearestVorCurrentLatitude':
        case 'NearestIntersectionMaximumItems':
        case 'NearestAirportMaximumItems':
        case 'NearestNdbMaximumItems':
        case 'NearestVorMaximumItems':
        case 'NearestIntersectionItemsNumber':
        case 'NearestAirportItemsNumber':
        case 'NearestNdbItemsNumber':
        case 'NearestVorItemsNumber':
        case 'FlightPlanIsLoadedApproach':
        case 'FlightPlanIsActiveApproach':
            this.vars.set("C:fs9gps:" + code, arg);
            break;
        default:
            console.log(`unhandled fs9gps ${code} ${type} ${arg} ${id}`);
        }
    }

    IsReady() {
        return true;
    }
    GetSimVarValue(code, unit=null, id=null) {
        var val = this.vars.get(code);

        if (val != undefined)
            return val;

        if (code.startsWith("C:fs9gps:")) {
            console.log(`unhandled get var ${code} / ${unit}`);
        }

        switch (unit) {
        case "degrees":
        case "degree":
        case "number":
        case "feet":
        case "knots":
            return 0;
        case "Bool":
        case "bool":
           return false;
        case "inches of mercury":
            return 29.92;
        default:
            return "";
        }
    }
    SetSimVarValue(code, type, value, id) {
        if (code.startsWith("K:")) {
            this.handle_keys(code.substring(2), type, value);
        } else if (code.startsWith("C:fs9gps:")) {
            this.handle_fs9gps(code.substring(9), type, value, id);
        } else {
            this.vars.set(code, value);
        }
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }
    GetGameVarValue = function (name, unit) {
        switch (unit) {
            case "feet":
                return 0;
        }
        return "";
    }
    GetGlobalVarValue = function (name, unit) {
        return "";
    }
    GetSimVarArrayValues(name, unit) {
        return Array();
    }
}

SimVar = new SimVar();

SimVar.SimVarBatch = class SimVarBatch {
    constructor(a, b) {
    }
    add(a, b, c) {
    }
}
