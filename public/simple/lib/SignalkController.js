class SignalkController extends SignalK {

    static create(options) {
        if (options.debug) console.log("SignalkController.create(%s)...", JSON.stringify(options));

        return(new SignalkController(options));
    }

    constructor(options) {
        if (options.debug) console.log("SignalkController(%s)...", JSON.stringify(options));

        if (!options.host) throw "SignalkController: SignalK server hostname must be specified (options.host)"
        if (!options.signalkPort) throw "SignalkController: SignalK server port number must be specified (options.signalkPort)"
        if (!options.controllerPort) throw "SignalkController: signalk-controller plugin service port must be specified (options.controllerPort)" 
        if (!options.debug) options.debug = false;

        super(options.host, options.signalkPort).waitForConnection().then(_ => {
            this.options = options;
            this.pageutils = new PageUtils({ "overlayOnLoad": function(r) { }});
            this.functionfactory = new FunctionFactory();
            this.client = null;
            this.channels = null;
            this.controller = null;
            this.programmer = null;
            this.flags = { controllerReady: false, programmerReady: false };

            // Recursively load document fragments
            while (PageUtils.include(document));

            // Connect to server and wait for connection to complete...
            this.client = new ControllerClient({ server: this.options.host, port: this.options.controllerPort, debug: options.debug });
            this.client.waitForConnection().then(_ => {

                this.client.getChannelsInGroup("heating", function(channels) {
				    this.controller = new Controller({
					    client: this.client,
                        channels: channels,
					    debug: options.debug
				    });
				    
                    this.programmer = new Programmer({
					    container: document.getElementById('programmer'),
					    client: this.client,
                        channels: channels,
					    debug: options.debug
				    });
                    
                    this.flags.pageReady = true;

                }.bind(this));

                PageUtils.waitForFlag(this.flags, "pageReady").then(_ => {
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
                });
            });
        });
    }

    connectionLost() {
        if (confirm("Server connection lost! Reconnect?")) {
            window.location = window.location;
        }
    }

}
