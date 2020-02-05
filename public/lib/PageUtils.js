class PageUtils {

	constructor(options) {
        PageUtils.overlayOnLoad = (options.overlayOnLoad)?options.overlayOnLoad:null;
        PageUtils.overlayObject = undefined;
        PageUtils.overlays = [];
	}

    static createElement(type, id, classname, content, parentNode) {
        var retval = document.createElement(type);
        if (retval) {
            if (id != null) retval.id = id;
            if (classname != null) retval.className = classname;
            if (content != null) {
                if (typeof content === "object") {
                    retval.appendChild(content);
                } else {
                     retval.innerHTML = content;
                }
            }
        }
        if (parentNode != null) parentNode.appendChild(retval);
        return(retval);
    }
 
    static waitFor(conditionFunction, timeout=500) {
        const poll = resolve => {
            if (conditionFunction()) {
                resolve();
            } else {
                setTimeout(_ => poll(resolve), timeout);
            }
        }
        return new Promise(poll);
    }

    /**
     * Return the value associated with <name> from local storage.  If the
     * named value is not defined then return <fallback> and create a new
     * local storage entry for <name>.
     *
     * param name - name of the storage item to be retrieved.
     * param fallback - value to be returned if the named item is not defined.
     */

    static getStorageItem(name, fallback) {
        //console.log("getStorageItem(%s,%s)...", name, fallback);

        var retval = window.localStorage.getItem("pdjr-" + name);
        if ((retval == null) && (fallback !== undefined)) {
            window.localStorage.setItem("pdjr-" + name, fallback);
            retval = fallback;
        }
        return(retval);
    }

    static setStorageItem(name, value) {
        console.log("setStorageItem(%s,%s)...", name, value);

        window.localStorage.setItem("pdjr-" + name, value);
    }

    static getAttributeValue(element, name, subname) {
        //console.log("getAttributeValue(%s,%s,%s)...", JSON.stringify(element), name, subname);
        var retval = undefined;
        if (element.hasAttribute(name)) {
            var value = element.getAttribute(name);
            try {
                retval = JSON.parse(value);
                if ((subname) && (retval[subname])) retval = retval[subname];
            } catch(e) {
                retval = value;
            }
        }
        return(retval);
    }

    static walk(root, classname, callback) {
        var elements = root.getElementsByClassName(classname);
        [...elements].forEach(element => {
            callback(element);
        });
    }

    static wildWalk(root, classnameRegex, callback) {
        var elements = root.getElementsByTagName('div');
        [...elements].forEach(element => {
            if (element.className.includes(classnameRegex)) callback(element);
        });
    }

	/**
	 * include - searches a DOM sub-tree identifying DIVs which contain
	 * a "data-include" attribute referencing an external HTML file which
	 * is loaded as the content of DIV.
	 *
	 * root - the root element of the tree to be processed.
	 */

	static include(root) {
    	var elements = root.getElementsByTagName("div");
    	[...elements].forEach(element => {
       		var path = element.getAttribute("data-include");
       		if (path) {
           			var html = PageUtils.httpGet(path);
                    if (html) {
          			    element.innerHTML = html;
           			    element.parentNode.replaceChild(element.children[0], element);
                        this.include(element);
                    } else {
                        console.log("PageUtils::include: error loading " + path);
                    }
       		}
    	});
	}

	static addHandler(root, selectorclass, eventtype, func) {
		var elements = root.getElementsByClassName(selectorclass);
		[...elements].forEach(element => {
    		if (element.hasAttribute("data-params")) {
        		try {
                    options = JSON.parse(element.getAttribute("data-params"));
                } catch(e) {
                    options = null;
                }
                if (options) {
				    element.addEventListener(eventtype, function(evt) { func(evt.target, params); });
				}
		    }
		});
	}

    static loadHTML(container, url, classname, callback) {
        if (container) {
            httpGetAsync(url, (content) => {
                if (content) {
                    container.innerHTML = content;
                    if (classname) container.classname = classname;
                    if (callback) callback(container);
                }
            });
        }
    }

    static httpGetAsync(theUrl, callback) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.onreadystatechange = function() { 
            if (xmlHttp.readyState == 4 && xmlHttp.status == 200) callback(xmlHttp.responseText);
        }
        xmlHttp.open("GET", theUrl, true); // true for asynchronous 
        xmlHttp.send(null);
    }

    static httpGet(theUrl) {
        //console.log("httpGet(%s)...", theUrl);

        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
        xmlHttp.send( null );
        return xmlHttp.responseText;
    }

    static activateEventListeners(classname, eventtype, callback) {
        var elements = document.getElementsByClassName(classname);
        for (var i = 0; i < elements.length; i++) elements[i].addEventListener(eventtype, callback);
    }

}
