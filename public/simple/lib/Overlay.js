class Overlay {

    static create(source) {
        return(new Overlay(source));
    }

    constructor(sources) {
        //console.log("Overlay(%s)...", sources);

        this.overlay = document.getElementById("overlay");
        this.overlayTitle = document.getElementById("overlay-title");
        this.container = document.getElementById("overlay-container");
        this.sources = (Array.isArray(sources))?sources:[sources];

        var _this = this;
        var es = this.overlay.getElementsByClassName("overlay-close");
        [...es].forEach(e => { e.addEventListener("click", function(e) { _this.close(); }); }); 
        var es = this.overlay.getElementsByClassName("overlay-next");
        [...es].forEach(e => { e.addEventListener("click", function(e) { _this.loadSource("next"); }); }); 
        var es = this.overlay.getElementsByClassName("overlay-prev");
        [...es].forEach(e => { e.addEventListener("click", function(e) { _this.loadSource("prev"); }); }); 

        this.loadSource();
        this.overlay.style.display = "flex";
    }

    loadSource(which=undefined) {
        //console.log("loadSource(%s)...", which);

        if (which == "next") this.sources.push(this.sources.shift());
        if (which == "prev") this.sources.unshift(this.sources.pop());

        var content = undefined;
        var _this = this;

        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        switch (typeof this.sources[0]) {
            case "function":
                content = this.sources[0]();
            case "object":
                if (content === undefined) content = this.sources[0].getTree();
                var titles = content.querySelectorAll('[data-overlay-title]');
                this.overlayTitle.innerHTML = (titles.length > 0)?titles[0].getAttribute("data-overlay-title"):"";
                break;
            case "string":
                content = this.container.appendChild(document.createElement("object"));
                content.id = "overlay-object";
                content.style.width = "100%";
                content.style.height = "50vh";
                content.addEventListener("load", function() {
                    var titles = content.contentDocument.getElementsByTagName("title");
                    _this.overlayTitle.innerHTML = (titles.length > 0)?titles[0].innerHTML:"";
                });
                content.data = this.sources[0];
                break;
            default:
                break;
        }
        if (content !== undefined) this.container.appendChild(content);
    }

    close() {
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        this.overlayTitle.innerHTML = "";
        this.overlay.style.display = "none";
    }

}
