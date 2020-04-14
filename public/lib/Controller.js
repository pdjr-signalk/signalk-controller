class Controller {

    static create(options) {
        var client = null;

        if (window.parent.window.SignalkClient) {
            client = window.parent.window.SignalkClient;
        } else {
            if ((options.signalkHost) && (options.signalkPort)) {
                client = new SignalkClient(options.signalkHost, options.signalkPort);
            }
        }
        return(new Controller(client, options));
    }

    constructor(signalkClient, options) {
        if ((options) && (options.debug)) console.log("Controller(%s,%s)...", signalkClient, JSON.stringify(options));

        if (!signalkClient) throw "Controller: SignalkClient must be specified";
        if (!options.controllerHost) options.controllerHost = signalkClient.getHost();
        if (!options.controllerPort) options.controllerPort = 9000;
        if (!options.debug) options.debug = false;

        this.signalkClient = signalkClient;
        this.options = options;

        signalkClient.waitForConnection().then(_ => {
            this.pageutils = new PageUtils({ "overlayOnLoad": function(r) { }});
            this.functionfactory = new FunctionFactory();
            this.client = null;
            this.channels = null;
            this.controller = null;
            this.programmer = null;
            this.mode = 'controller';
            this.flags = { pageReady: false };

            // Recursively load document fragments
            while (PageUtils.include(document));

            // Connect to server and wait for connection to complete...
            this.client = new ControllerClient({ server: this.options.controllerHost, port: this.options.controllerPort, debug: this.options.debug });
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
                        this.signalkClient.interpolateValue(path, element, filter);
                    });

                    // Populate page with dynamic values derived from Signal K server
                    PageUtils.walk(document, "signalk-dynamic", element => {
                        var path = PageUtils.getAttributeValue(element, "data-signalk-path");
                        var filter = this.functionfactory.getFilter(PageUtils.getAttributeValue(element, "data-filter"));
                        this.signalkClient.registerInterpolation(path, element, filter);
                    });

                    // Populate page with widgets
                    PageUtils.wildWalk(document, "widget-", element => {
                        if (element.hasAttribute("data-source")) this.localStorage.setAsAttributes(element.getAttribute("data-source"), element); 
                        if (element.hasAttribute("data-signalk-path")) {
                            this.signalkClient.registerCallback(element.getAttribute("data-signalk-path"), Widget.createWidget(element, element.getAttribute("data-filter")));
                        }
                    });
    
                    Interface.addEventListener('#app-mode-button', 'click', function(target) {
                        Interface.toggleClass(target);
                        this.appModeButtonHandler(target);
                    }.bind(this));
                    this.appModeButtonHandler(document.getElementById('app-mode-button'));
                });
            });
        });
    }

    connectionLost() {
        if (confirm("Server connection lost! Reconnect?")) {
            window.location = window.location;
        }
    }

    appModeButtonHandler(elem) {
        var buttonVS = Interface.getValueState(elem);
        if (buttonVS.state) {
            this.controller.activate(false);
            this.programmer.activate(true);
        } else {
            this.programmer.activate(false);
            this.controller.activate(true);
        }
    }
}
