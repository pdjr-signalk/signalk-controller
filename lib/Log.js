module.exports = class Log {

    /*
    {
        prefix: string to prefix output message,
        statusCallback: function to call to generate a status output,
        errorCallback: function to call to generate an error output
    }
    */

    static create(object) {
        if (object.debug) console.log("Log.create(%s)...", JSON.stringify(object));

        return(new Log(object));
    }

    constructor(object) {
        if (object.debug) console.log("Log(%s)...", JSON.stringify(object));

        this.object = object;
    }

    N(message, toConsole) {
        this.log(message, (toConsole === undefined)?true:toConsole);
    }

    W(message, toConsole) {
        this.log(message, (toConsole === undefined)?true:toConsole);
    }

    E(message, toConsole) {
        this.log(message, (toConsole === undefined)?true:toConsole, true);
    }

    log(message, toConsole, toError) {
        if (message !== undefined) {
            // Always write message to syslog
	        if (this.object.prefix !== undefined) console.log("%s: %s", this.object.prefix, message);
    
            if (toConsole) {
                message = message.charAt(0).toUpperCase() + message.slice(1);
	            if ((toError === undefined) || (!toError)) {
                    if (this.object.statusCallback) this.object.statusCallback(message);
                } else {
                    if (this.object.errorCallback)  this.object.errorCallback(message);
                }
            }
        }
    }

}
