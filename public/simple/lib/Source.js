/**
 * Package: SignalkPanel
 * 
 * Source binds together and names an arbitrary collection of data values and
 * provides a mechanism for saving them in browser persistent storage.
 *  SignalK path, a filter for processing
 * values delivered on that path and one or more collections of Widget
 * configuration parameters.  It is useful because it simplifies embedding a
 * panel display widget into a web interface. For example, a tag such as:
 *
 * <div class="widget-text" data-source="sog"></div>
 *
 * is sufficient to define a real-time instrument displaying a vessel's speed
 * over ground.  A full definition of the same thing might look like this:
 *
 * <div class="widget-text"
 *   data-signalk-path="navigation.speedOverGround"
 *   data-filter="multiply"
 *   data-widget-display-mode.0='{ "name": "kph", "factor": 3.6, "offset": 0, "places": 1 }'>
 * </div>
 *
 * or even this:
 *
 * <div class="widget-text"
 *   data-signalk-path="navigation.speedOverGround"
 *   data-filter="multiply"
 *   data-widget-display-mode.0.name="kph"
 *   data-widget-display-mode.0.factor="3.6"
 *   data-widget-display-mode.0.offset="0"
 *   data-widget-display-mode.0.places="1">
 * </div>
 *
 * Source provides an internal representation for this data and an external
 * representation as values in a browser's persistent local storage.
 */

class Source {

    /**
     * Create a Source instance by reading critical data values from the host
     * browser's persistent storage.  Source values are saved in local storage
     * under keys of the form sourcename.attributename. For example, the
     * SignalK class assumes an attribute called "data-signalk-path", so the
     * equivalent item in local storage managed by Source might be something
     * like "sog.data-signalk-path".
     * @param name - the name of the Source definition.
     * @return - newly created Source instance populated with whatever
     * definitions values exist in local storage.
     */
 
    static createFromStorage(name, storage) {
        //console.log("createFromLocalStorage(%s,%s)...", name, storage);
        var source = new Source(name);
        var items = storage.getItems(name);

        Object.keys(items).forEach(key => {
            console.log("*** " + key);
            var parts = key.split('.');
            switch (parts.length) {
                case 1:
                    source.setAttribute(parts[0], storage.getItem(name + "." + key));
                    break;
                case 2:
                    var value = storage.getItem(name + "." + key);
                    var oname = value["name"]; delete value.name;
                    source.setAttribute(parts[0], oname, value);
                    break;
                default:
                    break;
            }
        });
        console.log(JSON.stringify(source));
        return(source);
    }
               
    constructor(name) {
        this.name = name;
        this.attributes = {};
    }

    setAttribute(name, a2, a3, a4) {
        console.log("setAttribute(%s,%s,%s,%s)...", name, a2, a3, a4);
        if (a4) {
            this.attributes[name][a2][a3] = a4;
        } else if (a3) {
            if (!this.attributes.hasOwnProperty(name)) this.attributes[name] = {};
            this.attributes[name][a2] = a3;
        } else {
            this.attributes[name] = a2;
        }
        return(this);
    }

    getAttribute(name, a2) {
        if (a2) {
            return(this.attributes[name][a2]);
        } else {
            return(this.attributes[name]);
        }
    }

    saveToLocalStorage(storage) {
        var idx = 0;
        Object.keys(this.attributes).forEach(key => {
            if (typeof this.attributes[key] === "object") {
                Object.keys(this.attributes[key]).forEach(k => {
                    var o = this.attributes[key][k]; o["name"] = k;
                    storage.setItem(key + "." + idx, o, this.name, true);
                });
            } else {
                storage.setItem(key, this.attributes[key], this.name, true);
            }
        });
    }

}
