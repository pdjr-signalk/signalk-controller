const http = require('http');
const WebSocketServer = require('websocket').server;

/**
 * ControllerServer implements a websocket interface to a heating system
 * Controller providing a means for heating controller clients to remotely
 * operate the controller and update the heating programer.
 *
 * The ControllerServer is configured through an options object containing the
 * following attributes:
 *
 * allowedClients - an optional array of strings specifying the URL prefixes
 * which define allowed clients.  Defaults to [] which allows connection by
 * any client.
 *
 * controller - a required Controller instance to which the server will give
 * allowed clients access.
 * 
 * debug - an optional boolean which enables or disables trace logging via
 * console.log.  Defaults to false (no logging).
 *
 * logCallback - an optional callback function which can be used to report
 * server life-cycle events to the host application. Defaults to null.
 *
 * port - an optional integer port number for the websocket on which the
 * server will listen. Defaults to 9000.
 */
 
module.exports = class ControllerServer {

    static create(options) {
        if (options.debug) console.log("ControllerServer.create(%s)...", options);

        if (options.controller) {
            options.port = (options.port)?options.port:9000;
            options.allowedClients = (options.allowedClients)?options.allowedClients:[];
            options.debug = (options.debug)?options.debug:false;
            return(new ControllerServer(options));
        } else {
            return(null);
        }
    }

    constructor(options) {
        if (options.debug) console.log("ControllerServer(%s)...", options);

        this.options = options;
        this.server = null;
        this.wsServer = null;
    }

    start() {
        if (this.options.debug) console.log("ControllerServer.start()...");

        this.server = http.createServer(); this.server.listen(this.options.port);
        this.wsServer = new WebSocketServer({ httpServer: this.server });

        if (this.options.logCallback) this.options.logCallback("accepting connections on port " + this.options.port);

        var controllerProtocol = this.options.controller.getProtocol();

        this.wsServer.on('request', function(request) {
            if (!this.options.allowedClients.reduce((a,c) => { return(a || (request.origin.startsWith(c))); }, false)) {
                if (this.options.logCallback) this.options.logCallback("rejecting connection request from " + JSON.stringify(request.origin));
                request.reject();
                return;
            }
            if (this.options.logCallback) this.options.logCallback("accepting connection request from " + JSON.stringify(request.origin));
        
            var connection = request.accept(null, request.origin);

            connection.on('message', function(message) {
                message = JSON.parse(message.utf8Data);
                var id = message.id;
                if (message.data) {
                    if (this.options.debug) console.log("ControllerServer: received message %s", JSON.stringify(message.data));
                    var action = message.data.action;
                    var params = message.data.params;
                    if (Object.keys(controllerProtocol.verbs).includes(action)) {
                        if (controllerProtocol.verbs[action].requires.every(p => Object.keys(params).includes(p))) {
                            controllerProtocol.verbs[action].func(params, function(response) {
                                connection.send(JSON.stringify({ id: id, data: { name: controllerProtocol.verbs[action].returns, value: response } }));
                            });
                        } else {
                            if (this.options.logCallback) this.options.logCallback("rejecting message with garbled parameters");
                        }
                    } else {
                        if (this.options.logCallback) this.options.logCallback("rejecting message with invalid action request");
                    }
                }
            }.bind(this));

            connection.on('close', function(reasonCode, description) {
                if (this.options.logCallback) this.options.logCallback("client has disconnected");
            }.bind(this));
        }.bind(this));
	}

    stop() {
        if (this.options.debug) console.log("ControllerServer.stop()...");
    }

}
