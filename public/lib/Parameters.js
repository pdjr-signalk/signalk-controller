class Parameters {

    static parse(string) {
        console.log("Parameters.parse(%s)...", string);
        var retval = {};
    
        var parts = string.split(";");
        var obj = {};
        parts.forEach(part => {
            if (part.charAt(0) == "!") {
                obj = LocalStorage.getAllItems(part.substr(1));
            } else {
                obj = JSON.parse(part);
            }
            if (typeof obj === "object") Object.keys(obj).forEach(key => { retval[key] = obj[key]; });
        });
        return(retval);
    }

    static get(params, name, parser) {
        //console.log("Parameters.get(%s,%s,%s)...", JSON.stringify(params), name, parser);
        var retval = params[name];
        if (retval !== undefined) {
            if ((typeof retval === "string") && (retval.charAt(0) == '#')) retval = document.getElementById(retval.substr(1)).innerHTML;
        } else {
            console.log("requested parameter %s not found in %s", name, JSON.stringify(params));
        }
    
        return((retval !== undefined)?((parser !== undefined)?parser(retval):retval):retval);
    }

}
