class Controller extends SignalK {

    static createController(container, host, port) {
        return(new Controller(container, host, port));
    }

    constructor(container, host, port) {
        super(host, port).waitForConnection().then(_ => {
            // Initialise page helper library
            this.pageutils = new PageUtils({ "overlayOnLoad": function(r) { }});
            this.functionfactory = new FunctionFactory();
            this.localStorage = StructuredStorage.create(window.localStorage, "pdjr");
            window.myStorage = this.localStorage


            // Load document fragments
            PageUtils.include(document);

            // Load application configuration into local storage
            PageUtils.walk(document, "storage-config", element => this.localStorage.initialise(element));

            // Populate page with local storage item values
            PageUtils.walk(document, "storage-item-value", element => element.innerHTML = this.localStorage.getValue(element.getAttribute("data-storage-item-name")));

            // Populate page with static values derived from Signal K server
            PageUtils.walk(document, "signalk-static", element => {
                var path = PageUtils.getAttributeValue(element, "data-signalk-path");
                var filter = this.functionfactory.getFilter(PageUtils.getAttributeValue(element, "data-filter"));
                super.interpolateValue(path, element, filter);
            });

            // Populate page with dynamic values derived from Signal K server
            PageUtils.walk(document, "signalk-dynamic", element => {
                var path = PageUtils.getAttributeValue(element, "data-signalk-path");
                var filter = this.functionfactory.getFilter(PageUtils.getAttributeValue(element, "data-filter"));
                super.registerCallback(path, function(v) { alert("Hello"); });
            });

            // Populate page with widgets
            PageUtils.wildWalk(document, "widget-", element => {
                if (element.hasAttribute("data-source")) this.localStorage.setAsAttributes(element.getAttribute("data-source"), element); 
                if (element.hasAttribute("data-signalk-path")) {
                    super.registerCallback(element.getAttribute("data-signalk-path"), Widget.createWidget(element, element.getAttribute("data-filter")));
                }
            });
        });

    }

    connectionLost() {
        if (confirm("Server connection lost! Reconnect?")) {
            window.location = window.location;
        }
    }

    rightClick(e) {
        alert("Hello");
    }

    setChannel(channel) {
        console.log("setChannel(%s)...", channel);
        [...document.getElementsByClassName('channel-button')].forEach(e => {
            e.classList.remove('on');
            if (e.classList.contains(channel)) e.classList.add('on');
        });
    }

    getChannel() {
        var e = window.getComputedStyle(document.getElementById("channel-button-group").getElementsByClassName("on")[0]).backgroundColor;
        return(e);
    }

}
