module.exports = class Notification {

    static cancelNotification(app, id, key) {
        //console.log("Notification: cancelNotification(%s,%s,%s)...", app, id, key);

        if ((app) && (id) && (key)) {
            key = "notifications." + key;
		    var delta = {
                "context": "vessels." + app.selfId,
                "updates": [
                    {
                        "source": { "label": "self.notificationhandler" },
                        "values": [ { "path": key, "value": null } ]
                    }
                ]
            };
		    app.handleMessage(id, delta);
        }
        return;
    }

	static issueNotification(app, id, key, state, message, method) {
        //console.log("Notification: issueNotification(%s,%s,%s,%s,%s,%s)...", app, id, key, message, state, method);

        if ((app) && (id) && (key)) {
            key = "notifications." + key;
            state = (state)?state:"normal";
            message = (message)?message:"This delta has no message";
            method = ((method) && (Array.isArray(method)))?method:[ "visual", "sound" ];
		    var delta = {
                "context": "vessels." + app.selfId,
                "updates": [
                    {
                        "source": { "label": "self.notificationhandler" },
                        "values": [ { "path": key, "value": null } ]
                    }
                ]
            };
            delta.updates[0].values[0].value = { "state": state, "message": message, "method": method, "timestamp": (new Date()).toISOString() };
		    app.handleMessage(id, delta);
        }
        return;
	}

}
