/**
 * StructuredStorage provides a generic interface to a Storage instance and is
 * designed to extend localStorage and sessionStorage classes by overlaying an
 * arrangement for application specific structured keys.
 *
 * In this scheme, stored item key names have a prefix which allows, inter-
 * alia, some certainty of unique naming.  Support is also provided for a
 * dotted key name structure of the form "prefix.part1.part2...".
 */

class StructuredStorage {

    /**
     * Factory function for creating a new StructuredStorage instance.
     * @param storage - a Storage instance.
     * @param prefix - a string which will be prepended to all key names.
     * @returns - a new StructuredStorage instance.
     */
    static create(storage, prefix) {
        return(new StructuredStorage(storage, prefix));
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
    
    /**
     * Initialises the Storage instance from one or more storage definitions
     * embedded in the DOM.
     * @root - the DOM element containing the storage definition.
     * @force - true says overwrite any existing storage items.
     */
    initialise(root, force, _name) {
        //console.log("initialise(%s,%s,%s)...", root, force, _name);
        var elements = root.getElementsByClassName("storage-group");
        [...elements].forEach(element => {
            var name = element.getAttribute("data-name");
            if (name !== undefined) {
                this.initialise(element, force, ((_name && (_name != ""))?(_name + "."):"") + name);
            }
        });
        if (_name && (_name != "")) {
            elements = root.getElementsByClassName("storage-item");
            [...elements].forEach(element=> {
                var name = element.getAttribute("data-name");
                var value = element.getAttribute("data-value");
                if ((name !== undefined) && (value !== undefined)) {
                    var key = this.makeKey([_name, name]);
                    if ((this.storage.getItem(key) == null) || force) {
                        this.storage.setItem(key, value);
                    }
                }
            });
        }
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

    setItem(name, value, force=false) {
        console.log("setItem(%s,%s,%s)...", name, value, force);
        if ((!this._exists(name)) || force) this._setItem(name, value);
    }

    getItem(name, parser) {
        console.log("getItem(%s,%s)...", name, parser);
        var value = this._getItem(name);
        return((parser)?parser(value):value);
    }

    getItems(prefix) {
        //console.log("getItems(%s)...", prefix);
        var retval = {};
        var keyPrefix = this.prefix + "." + prefix + ".";
        Object.keys(this.storage).forEach(key => {
            if (key.startsWith(keyPrefix)) {
                var name = key.substring(keyPrefix.length);
                var value = this.getItem(prefix + "." + name);
                retval[name] = value;
            }
        });
        return(retval);
    }

    getItemNames() {
        var keyPrefix = (this.prefix)?(this.prefix + "."):"";
        return(Object.keys(this.storage).filter(k => k.startsWith(keyPrefix)).map(k => k.substr(keyPrefix.length)));
    }

    setAsAttributes(prefix, element) {
        //console.log("setAsAttributes(%s,%s)...", prefix, element);
        var items = this.getItems(prefix);
        Object.keys(items).forEach(key => {
            var value = JSON.stringify(items[key]).replace(/^"(.+(?="$))"$/, '$1');
            element.setAttribute(key, value);
        });
    }

    makeKey(parts) {
        if (!Array.isArray(parts)) parts = [parts];
        if (this.prefix) parts.unshift(this.prefix);
        return(parts.join("."));
    }
 
}

