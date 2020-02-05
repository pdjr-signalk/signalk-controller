var WIDGET_DIRECTORY = {};
const DEBUG = false;

// Initialise page immediately it has loaded.
//
function init() {
    // Stop the browser from displaying the right-click context menu.
    document.addEventListener("contextmenu", (e) => { contextHandler(e); e.preventDefault(); });
    window.event.cancelBubble = true;

    // Process "<div data-include=" tags by interpolating HTML fragments into page.
    interpolate();
    // Process "<div data-path=" tags by interpolating widgets and associating with Signal K updates.
    configure();
    // Process "<div class="button... data-button=" tags by associating with event handler.
    activate("button", "click", FUNCTIONS);
    
    httpGetAsync("/signalk/v1/api/vessels/self/name/", (v) => { document.getElementById("vesselName").innerHTML = v.replace(/"/g, ""); });
    
    // Connect to Signal K server and start processing received data.
    //
    updateStateFromWebSocket(WIDGET_DIRECTORY);
}

/**
 * Load external HTML fragments and interpolate them into the main document.
 * This include mechanism is triggered by a tag of the form:
 *   <div data-include="path/to/HTMLfragment"></div>
 * The entire tag is replaced by the referenced content, or by an XML
 * comment if the content cannot be loaded.
 */
function interpolate() {
    var elements = document.getElementsByTagName("div");
    [...elements].forEach(element => {
        var path = element.getAttribute("data-include");
        if (path) {
            var html = httpGet(path);
            element.innerHTML = (html)?html:("<!-- ERROR: unable to GET " + path + " -->");
            element.parentNode.replaceChild(element.children[0], element);
        }
    });
}

/**
 * Populate the document with widgets and associate these with their defined
 * data sources, returning a dictionary which maps data paths to associated
 * widgets.
 *
 * The process is triggered by a DIVs which contain at least a "data-source"
 * attribute.  This attribute value must have the form "provider:path", where
 * provider identifies a source of real-time data and "path" selects the data
 * required.
 *
 * DIVs may also contain one or more attributes of the form "data-widget-type"
 * where type identifies a particular type if user-interface object supported
 * by the widget.js library.  The attribute value provides configuration
 * options for the widget (see widget.js for details).
 *
 * configure() returns a data structure which maps paths to widgets.
 */
function configure() {
    var widget, path, options, soptions, woptions;
    var elements = document.getElementsByTagName("div");
    [...elements].forEach(element => {
        if (element.hasAttribute("data-source")) {
            try { soptions = JSON.parse(element.getAttribute("data-source")); } catch(e) { soptions = null; console.log("error parsing %s", element.getAttribute("data-source")); }
            if ((soptions != null) && ((path = soptions.signalk) != null)) {
                if (!WIDGET_DIRECTORY[path]) WIDGET_DIRECTORY[path] = [];
                var attributes = element.attributes;
                [...attributes].forEach(attribute => {
                    if (attribute.name.startsWith("data-widget-")) {
                        try { woptions = JSON.parse(attribute.value); } catch(e) { woptions = null; console.log("error parsing %s", attribute.value); }
                        if (woptions != null) {
                            woptions["type"] = attribute.name.split("-").pop().trim();
                            if ((widget = new Widget(element, woptions)) != null) {
                                WIDGET_DIRECTORY[path].push(widget);
                            }
                        }
                    }
                });
            }
        }
    });
    return;
}

/**
 * Processes the document for elements of a defined class and associates with
 * them and event handler for a particular type of event.  Selected elements
 * must contain a tag named "data-button" which provides configuration for
 * actions to be performed by the specified handler. 
 */
function activate(selectorclass, eventtype, dictionary) {
    var elements = document.getElementsByClassName(selectorclass);
    [...elements].forEach(element => {
        activateElement(element, eventtype, dictionary);
    });
}

function activateElement(element, eventtype, dictionary) {
    console.log("activateElement(%s,%s,%s)...", JSON.stringify(element), eventtype, JSON.stringify(dictionary));
    var options;
    if (element.hasAttribute("data-button")) {
        console.log("Got attribute");
        try { options = JSON.parse(element.getAttribute("data-button")); } catch(e) { options = null; }
        if (options) {
            console.log("parsed attribute");
            var func = options["function"];
            if (func) {
                if (Object.keys(dictionary).includes(func)) {
                    element.addEventListener(eventtype, function(evt) {
                        dictionary[func](evt.target, options.params, options.furtheraction);
                    });
                }
            }
        }
    }
}

function updatePath(dictionary, path, value) {
    if (DEBUG) console.log("updatePath(%s,%s,%s)...", "dictionary", path, value);

    dictionary[path].forEach(widget => widget.update(value));
}

function updateStateFromWebSocket(dictionary) {
    if ("WebSocket" in window) {
        var ws = new WebSocket("ws://"+window.location.hostname+":"+window.location.port+"/signalk/v1/stream?subscribe=none");
        ws.onopen = function(evt) {
            var subscriptions = Object.keys(dictionary).map(v => ({ "path": v, "minPeriod": 1000, "policy": "instant" }));
            var msg = {
                "context": "vessels.self",
                "subscribe": subscriptions
            };
            ws.send(JSON.stringify(msg));
        };
        
        ws.onmessage = function(evt) {
            var data = JSON.parse(evt.data);
            if ((data.updates !== undefined) && (data.updates.length > 0)) {
                if ((data.updates[0].values !== undefined) && (data.updates[0].values.length > 0)) {
                    var path = data.updates[0].values[0].path;
                    var value = data.updates[0].values[0].value;
                    if ((path) && (value)) updatePath(dictionary, path, value);
                }
            }
        }
    }
}
