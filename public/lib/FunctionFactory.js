class FunctionFactory {

    constructor() {
        this.filters = {

            "multiply":             function(params) {
                                        if (!params) return([ "factor","offset","places" ]);
                                        var _params = params;
                                        return(
                                            function(v) {
                                                v = (v == null)?0:v;
                                                var factor = Parameters.get(_params, "factor", parseFloat);
                                                var offset = Parameters.get(_params, "offset", parseFloat);
                                                var places = Parameters.get(_params, "places", parseInt);
                                                return(((parseFloat(v) * factor) + offset).toFixed(places));
                                            }
                                        );
                                    },
    
            "multiplyPercent":      function(params) {
                                        if (!params) return(["factor","min","max","offset","places"]);
                                        var _params = params;
                                        return(
                                            function(v) {
                                                v = (FunctionFactory.getFilter("multiply", _params))(v);
                                                var min = Parameters.get(_params, "min", parseFloat)
                                                var max = Parameters.get(_params, "max", parseFloat)
                                                return(FunctionFactory.percent(v, min, max));
                                            }
                                        );
                                    },
    
            "notification":         function(args={}) {
                                        var level = (args.level)?args.level:"alert";
                                        return(
                                            function(v) {
                                                return((v.state == level)?v.message:null);
                                            }
                                        );
                                    },
    
            "identity":             function(params) {
                                        if ((typeof params === "string") && (params == "?")) return([]);
                                        return(
                                            function(v) {
                                                return((typeof v === "string")?v.trim():v);
                                            }
                                        );
                                    },
    
            "date":                 function(context) {
                                        if ((typeof params === "string") && (params == "?")) return([]);
                                        return(
                                            function(v) {
                                                return(v.substr(0, v.indexOf('T')));
                                            }
                                        );
                                    },
    
            "time":                 function(context) {
                                        if ((typeof params === "string") && (params == "?")) return([]);
                                        return(
                                            function(v) {
                                                return(v.substr(v.indexOf('T')+1));
                                            }
                                        );
                                    },
    
            "latitude":             function(context) {
                                        return(
                                            function({ latitude, longitude }) {
                                                return(FunctionFactory.degToDMS(latitude, { "hemis": ['N','S'] })); 
                                            }
                                        );
                                    },
    
            "longitude":            function(context) {
                                        return(
                                            function({ latitude, longitude }) {
                                                return(FunctionFactory.degToDMS(longitude, { "hemis": ['E','W'] })); 
                                            }
                                        );
                                    },
    
            "degrees":              function(context) {
                                        var context = context;
                                        return(
                                            function(v) {
                                                return(("00" + (Math.round(v * 57.2958) % 360)).slice(-3));
                                            }
                                        );
                                    },
    
            "loAlarm":              function(args={}) {
                                        var threshold = (args.threshold)?args.threshold:1;
                                        return(
                                            function(v) {
                                                return(v < threshold);
                                            }
                                        );
                                    }, 
    
            "hiAlarm":              function(args={}) {
                                        var threshold = (args.threshold)?args.threshold:1;
                                        return(
                                            function(v) {
                                                return(v > threshold);
                                            }
                                        );
                                    } 
        } 
    }

    getFilterNames() {
        return(Object.keys(this.filters));
    }
    
    getFilter(name="identity", context) {
        //console.log("FunctionFactory.getFilter(%s,%s)...", name, context);

        var retval = this.filters[name](context);
        if (retval === undefined) {
            console.log("filter '%s' is not defined - falling back on 'identity'", name);
            retval = this.filters("identity", context);
        }
        return(retval);
    }

    static percent(v, min, max) {
        v = Math.round(((v - min) / (max - min)) * 100);
        return((v < 0)?0:((v > 100)?100:v)); 
    }

    static degToDMS(v, args={ "hemis": ["N", "S"] }) {  
        var h = args["hemis"][(v >= 0)?0:1];
        var d = Math.floor(v);  
        var minfloat = (v - d) * 60;  
        var m = Math.floor(minfloat);  
        var secfloat = (minfloat - m) * 60;  
        var s = Math.round(secfloat);  
        var ds = Math.round((secfloat - s) * 10);
      
        if (s == 60) { m++; s=0; }  
        if (m==60) { d++; m=0; }  
        return ("" + ("00" + d).slice(-3) + '&deg;' + ("0" + m).slice(-2) + '\'' + ("0" + s).slice(-2) + '.' + ds + '"' + h);  
    }

}
