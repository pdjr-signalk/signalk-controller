/**
 * JSONStorage is a simple interface to classes which implement the Storage
 * interface.  It overlays a simple arrangement for structured keys and
 * implements a user defined key prefix which, inter-alia, can support
 * application specific use of persistent storage.
 *
 * JSONStorage keys have the form prefix.dotted-name where:
 *
 * dottedname = name | name.dottedname
 */

class JSONStorage {

    static test() {
        var storage = JSONStorage.create(window.localStorage, "pdjr");

        console.log(storage.getItem("sog.data-filter"));

        console.log(JSON.stringify(storage.getItem("sog")));

        console.log(JSON.stringify(storage.getItem("sog.data-widget-display-mode.0")));
    }

    /**
     * Factory function for creating a new StructuredStorage instance.
     * @param storage - a Storage instance.
     * @param prefix - a string which will be prepended to all key names.
     * @returns - a new StructuredStorage instance.
     */
    static create(storage, prefix) {
        return(new JSONStorage(storage, prefix));
    }

    /**
     * Creates a new StructuredStorage instance which uses <storage> as its
     * underlying Storage instance and which prepends <prefix> to all key
     * names.
     * @param storage - a Storage instance.
     * @param prefix - a string which will be prepended to all key names.
     * @returns - a new StructuredStorage instance.
     */
    constructor(storage, prefix) {
        //console.log("StructuredStorage(%s,%s)...", storage, prefix);
        this.storage = storage;
        this.prefix = prefix;
    }
    
    _setItem(name, value) {
        this.storage.setItem(this.prefix + "." + name, JSON.stringify(value).replace(/^"(.+(?="$))"$/, '$1'));
    }

    _getItem(name) {
        var value = this.storage.getItem(this.prefix + "." + name);
        if (value.startsWith('{') || value.startsWith('[')) value = JSON.parse(value);
        return(value);
    }

    _exists(name) {
        return(this.storage.hasOwnProperty(this.prefix + "." + name));
    }

    _getMatchedKeys(prefix) {
        var retval = [];
        Object.keys(this.storage).forEach(key => {
            var realkey = this.prefix + "." + prefix + ".";
            if (key.startsWith(realkey)) {
                retval.push(key.substr(this.prefix.length + 1));
            }
        });
        return(retval);
    }

    setItem(name, value, force=false) {
        //console.log("setItem(%s,%s,%s)...", name, value, force);
        if ((!this._exists(key)) || force) {
            _setItem(name, value);
        }
    }

    getItem(name) {
        var retval = null;

        if (this._exists(name)) {
            return(this._getItem(name));
        } else {
            retval = {};
            var keys = this._getMatchedKeys(name);
            keys.forEach(key => {
                if (key.startsWith(name + ".")) {
                    var newkey = key.substr(name.length + 1).split(".")[0];
                    retval[newkey] = this.getItem(name + "." + newkey);
                }
            });
        }
        return(retval);
    }

}

