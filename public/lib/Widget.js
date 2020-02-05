class Widget {

    static createWidget(element, filterName) {
        //console.log("createWidget(%s,%s)...", element, filterName);

        var retval = null;
        var type = element.className.split(" ").reduce((a,v) => { return((v.startsWith("widget-"))?v.substr(7):null); }, null);
        var params = {};
        var filter = undefined;

        if (type) {
            var displaymode = element.getAttribute("data-widget-display-mode") || "0";
            var params = JSON.parse(element.getAttribute("data-widget-display-mode." + displaymode)) || {};
            for (var i = 0; i < element.attributes.length; i++) {
                var name = element.attributes[i].name;
                var value = element.attributes[i].value;
                if (name.startsWith("data-widget-display-mode." + displaymode + ".")) params[name.substr(25)] = value;
            }
            if (filterName) filter = (new FunctionFactory()).getFilter(filterName, params);
            retval = new Widget(element, type, params, filter);
        } else {
            console.log("element does not have a 'widget-type' class");
        }
        return(retval);
    }

    constructor(parentNode, type, params, filter) {
        //console.log("Widget(%s,%s,%s)...", parentNode, type, JSON.stringify(params)); 

        this.parentNode = parentNode;
        this.type = type;
        this.params = params;
        this.filter = filter;
        this.components = [];
        this.labels = document.querySelectorAll('[for="' + parentNode.id + '"]');
        [...this.labels].forEach(label => { label.innerHTML = this.params.name; });

        switch (type) {
            case "alert":
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "alert", params));
                break;
            case "cursor":
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "cursor", params));
                break;
            case "gauge":
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "scale", params));
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "cursor", params));
                break;
            case "indicator":
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "indicator", params));
                break;
            case "scale":
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "scale", params));
                break;
            case "textgauge":
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "text", params));
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "scale", params));
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "cursor", params));
                break;
            case "text":
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "text", params));
                break;
            case "textcursor":
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "text", params));
                this.components.push(WidgetComponent.createWidgetComponent(parentNode, "cursor", params));
                break;
        }

        if (this.components.reduce((a,c) => ((c.getTree() !== undefined) || a), false)) {
            var card = document.createElement("div");
            card.className = "widget-card";
            this.components.filter(component => (component.getTree() !== undefined)).forEach(component => {
                card.appendChild(component.getTree());
            });
            this.parentNode.innerHTML = "";
            this.parentNode.appendChild(card);
        }
    }

    static availableComponents() {
        return([ "alert", "cursor", "scale", "text", "indicator" ]);
    }

    /**
     * Returns an array of parameter names accepted by component <cname>, or
     * null if <cname> does not identify a valid component.
     */

    static getParameterNamesForComponent(cname) {
        return((Widget.availableComponents().contains(cname))?WidgetComponent.getParameterNames(cname):null);
    }

    update(value) {
        //console.log("Widget.update(%s)...", JSON.stringify(value));

        this.timestamp = Date().now;
        this.latest = value;
        this.components.forEach(component => component.update((this.filter !== undefined)?this.filter(value):value));
    }

}

class WidgetComponent {

    static createWidgetComponent(parentNode, type, params) {
        //console.log("createWidgetComponent(%s,%s,%s)...", parentNode, type, JSON.stringify(params));

        var retval = undefined;

        switch (type) {
            case "alert":
                retval = new AlertComponent(parentNode, params);
                break;
            case "scale":
                retval = new ScaleComponent(parentNode, params);
                break;
            case "cursor":
                retval = new CursorComponent(parentNode, params);
                break;
            case "text":
                retval = new TextComponent(parentNode, params);
                break;
            case "indicator":
                retval = new IndicatorComponent(parentNode, params);
                break;
            default:
                break;
        }
        return(retval);
    }

    static getParameterNames(cname) {
        var retval = [];
        switch (cname) {
            case "alert":
                retval = AlertComponent.getParameterNames();
                break;
            case "scale":
                retval = ScaleComponent.getParameterNames();
                break;
            case "cursor":
                retval = CursorComponent.getParameterNames();
                break;
            case "text":
                retval = TextComponent.getParameterNames();
                break;
            case "indicator":
                retval = IndicatorComponent.getParameterNames();
                break;
            default:
                break;
        }
        return(retval);
    }
        
    constructor(parentNode, params) {
        this.parentNode = parentNode;
        this.params = params;

        this.tree = undefined;
        this.updateFunction = undefined;
    }

    setTree(tree) {
        this.tree = tree;
    }

    getTree() {
        return(this.tree);
    }

    setUpdateFunction(func) {
        this.updateFunction = func;
    }

    update(value) {
        if (this.updateFunction !== undefined) this.updateFunction(value);
    }

    resetAnimation(element) {
        element.style.animation = 'none';
        element.offsetHeight; /* trigger reflow */
        element.style.animation = null; 
    }

}

class AlertComponent extends WidgetComponent {

    constructor(parentnode, params) {
        //console.log("AlertComponent(%s,%s)...", parentNode, JSON.stringify(params));

        super(parentnode, params);
        this.parentNode = parentnode;
        this.parameters = params;

        try {

            // Update parentNode class membership
            //
            var alertClass = this.parentNode.id;
            this.parentNode.classList.add(alertClass);

            // Add event listener to parentNode so that alerts can be cancelled
            //
            this.parentNode.addEventListener("click", function(e) { 
                var elems = document.getElementsByClassName(alertClass);
                [...elems].forEach(e => {
                    if (this.parentNode.classList.contains("alert-cancelled")) {
                        e.classList.remove("alert-cancelled");
                    } else {
                        e.classList.add("alert-cancelled");
                    }
                });
            });
            
            var _parentNode = this.parentNode;
            var _parameters = this.parameters;

            super.setUpdateFunction(function(v) {
                var test = _parameters["alert-test"][0];
                var threshold = parseFloat(_parameters["alert-threshold"]);
                var disabled = parseInt(_parameters["alert-disabled"]);
                var elems = document.getElementsByClassName(alertClass);
                if (!disabled) {
                    if (((test == "lt") && (v < threshold)) || ((test == "eq") && (v == threshold)) || ((test == "gt") && (v > threshold))) {
                        [...elems].forEach(e => { e.classList.add("alert-active"); if (e != _parentNode) e.classList.add("alert-cancelled"); });
                    } else {
                        [...elems].forEach(e => { e.classList.remove("alert-active"); e.classList.remove("alert-cancelled"); });
                    }
                } else {
                    _parentNode.classList.add("alert-disabled");
                    [...elems].forEach(e => { e.classList.remove("alert-active"); e.classList.remove("alert-cancelled"); });
                }
            });
        } catch(e) {
        }
    }

    static getParameterNames() {
        return([ "alert-disabled", "alert-test", "alert-threshold" ]);
    }

}

class ScaleComponent extends WidgetComponent {

    constructor(parentNode, params) {
        //console.log("ScaleComponent(%s,%s)...", parentNode, params);

        super(parentNode, params);

        var direction = (parentNode.classList.contains("vertical"))?"vertical":"horizontal";
        var navigation = parentNode.classList.contains("navigation");

        var div = document.createElement("div");
        div.className = "widget-component widget-scale" + ((direction == "horizontal")?" widget-horizontal":" widget-vertical");

        var min = parseFloat(params.min) || 0;
        var max = parseFloat(params.max) || 100;
        var ticks = parseInt(params.ticks, 10) || 10;

        for (var i = 0; i <= ticks; i++) {
            var tick = document.createElement("div");
            var tickValue = Number(min) + (((max - min) / ticks) * i);
            tick.setAttribute("data-tick-value", Math.abs(tickValue));
            tick.className = "widget-scale-tick";
            if (navigation && (tickValue < 0)) tick.classList.add("port");
            if (navigation && (tickValue > 0)) tick.classList.add("starboard");
            
            if (direction == "horizontal") {
                tick.style.width = ((i / ticks) * 100) + "%";
            } else {
                tick.style.height = ((i / ticks) * 100) + "%";
            }
            div.appendChild(tick); 
        }
        super.setTree(div);
    }

    static getParameterNames() {
        return([ "max", "min", "ticks" ]);
    }

}

class CursorComponent extends WidgetComponent {

    constructor(parentNode, params) {
        //console.log("CursorComponent(%s,%s)...", parentNode, params);

        super(parentNode, params);

        var direction = (parentNode.classList.contains("vertical"))?"vertical":"horizontal";

        var div = document.createElement("div");
        div.className = "widget-component widget-cursor " + ((direction == "horizontal")?"widget-horizontal":"widget-vertical");
        super.setTree(div);

        var funcra = super.resetAnimation;
        var min = parseFloat(params.min) || 0;
        var max = parseFloat(params.max) || 100; 
        if (direction == "horizontal") {
            super.setUpdateFunction(function(v) {
                v = Math.round(((v - min) / (max - min)) * 100);
                v = ((v < 0)?0:((v > 100)?100:v)); 
                div.style.width = v + "%";
                funcra(div);
            });
        } else {
            super.setUpdateFunction(function(v) {
                v = Math.round(((v - min) / (max - min)) * 100);
                v = ((v < 0)?0:((v > 100)?100:v)); 
                div.style.height = v + "%";
                funcra(div);
            });
        }
    }

    static getParameterNames() {
        return([ "max", "min" ]);
    }

}

class TextComponent extends WidgetComponent {

    constructor(parentNode, params) {
        //console.log("TextComponent(%s,%s)...", parentNode, params);

        super(parentNode, params);

        var direction = (parentNode.classList.contains("vertical"))?"vertical":"horizontal";

        var table  = document.createElement("div");
        table.className = "widget-component widget-text";
        var cell = document.createElement("div");
        cell.className = "widget-text-cell timeout";
        table.appendChild(cell);
        var span = document.createElement("span");
        span.innerHTML = "???";
        var found = parentNode.innerHTML.trim().match(/(.*)---(.*)/);
        if ((found) && (found.length >= 2) && (found[1] != "")) { var d = document.createElement("div"); d.innerHTML = found[1]; cell.appendChild(d.firstChild); }
        cell.appendChild(span);
        if ((found) && (found.length >= 3) && (found[2] != "")) { var d = document.createElement("div"); d.innerHTML = found[2]; cell.appendChild(d.firstChild); }
        super.setTree(table);

        var funcra = super.resetAnimation;
        super.setUpdateFunction(function(v) {
            span.innerHTML = (v.charAt(0) == "-")?v.substr(1):v;
            funcra(cell);
        });
    }

    static getParameterNames() {
        return([]);
    }

}

class IndicatorComponent extends WidgetComponent {

    constructor(parentNode, params) {
        //console.log("IndicatorComponent(%s,%s)...", parentNode, JSON.stringify(params));

        super(parentNode, params);

        var onclass = params.onclass || "widget-indicator-on";
        var onvalue = params.onvalue || "";
        var offclass = params.offclass || "widget-indicator-off";
        var offvalue = params.offvalue || ""
        var notification = parentNode.innerHTML.includes("---");

        var div = document.createElement("div");
        div.className = "widget-component " + ((notification)?"widget-notification":"widget-indicator");
        //var span = document.createElement("span"); 
        //span.innerHTML = "";
        //var found = parentNode.innerHTML.match(/(.*)---(.*)/);
        //if ((found) && (found.length >= 2)) div.appendChild(document.createTextNode(found[1]));
        //div.appendChild(span);
        //if ((found) && (found.length >= 3)) div.appendChild(document.createTextNode(found[2]));
        super.setTree(div);

        var rafunc = super.resetAnimation;
        super.setUpdateFunction(function(v) {
            if (v) {
                if (notification) div.innerHTML = onvalue;
                div.classList.remove(offclass);
                div.classList.add(onclass);
            } else {
                if (notification) div.innerHTML = offvalue;
                div.classList.remove(onclass);
                div.classList.add(offclass);
            }
        });
    }
 
    static getParameterNames() {
        return([ "offclass", "offvalue", "onclass", "onvalue" ]);
    }

}
