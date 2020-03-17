start(options) {
    if (options.debug) console.log("start(%s)...", JSON.stringify(options));

    this.options = options;
    this.client = ControllerClient(options.host, options.signalkPort).waitForConnection().then(_ => {
    this.pageutils = new PageUtils({ "overlayOnLoad": function(r) { }});
    this.functionfactory = new FunctionFactory();
    this.controller = null;
    this.programmer = null;

    // Recursively load document fragments
    while (PageUtils.include(document));
    window.afterInclude();

    // Connect to server and wait for connection to complete...
    this.client = new ControllerClient({ server: this.options.host, port: this.options.controllerPort, debug: options.debug });
    this.client.waitForConnection().then(_ => {

        this.controller = new Controller({ client: this.client });
        this.programmer = new Programmer({ client: this.client });

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
            super.registerInterpolation(path, element, filter);
        });

        // Populate page with widgets
        PageUtils.wildWalk(document, "widget-", element => {
            if (element.hasAttribute("data-source")) this.localStorage.setAsAttributes(element.getAttribute("data-source"), element); 
            if (element.hasAttribute("data-signalk-path")) {
                super.registerCallback(element.getAttribute("data-signalk-path"), Widget.createWidget(element, element.getAttribute("data-filter")));
            }
        });

        controller.createCalendar(document.getElementById('calendar'));
    });
    this.swipe = new Swipe("pages");

}
