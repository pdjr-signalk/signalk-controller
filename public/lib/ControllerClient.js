/**
 * Client interface to a remote Controller server.
 */

class ControllerClient {

    static create(options) {
        if (options.debug) console.log("ControllerClient.create(%s)...", JSON.stringify(options));

        return(new ControllerClient(options));
    }

    /**
     * Create a new Programme instance and connect to the ProgrammeServer at
     * <url>.  The connection is made using the WebsocketR2 library which
     * provides a request-response protocol on top of a standard websocket
     * and offers some connection resilience.
     */
    constructor(options) {
        if (options.debug) console.log("ControllerClient(%s)...", JSON.stringify(options));

        if (!options.server) throw "ControllerClient: controller server hostname must be specified (options.server)";
        if (!options.port) throw "ControllerClient: controller server port number must be specified (options.port)";
        if (!options.debug) options.debug = false;

        this.options = options;
        this.ws = new WebSocketR2("ws://" + this.options.server + ":" + this.options.port); 
        this.wsIsOpen = false;

        this.ws.onopen(function() { this.wsIsOpen = true; }.bind(this));
    }

    waitForConnection(timeout=500) {
        if (this.options.debug) console.log("ControllerClient.waitForConnection(%s)...", timeout);

        const poll = resolve => {
            if (this.wsIsOpen) { resolve(); } else { setTimeout(_ => poll(resolve), timeout); }
        }
        return new Promise(poll);
    }

    getChannelsInGroup(group, callback) {
        if (this.options.debug) console.log("ControllerClient.getChannelsInGroup(%s,%s)...", group, callback);

        this.ws.send({ action: "getChannelsInGroup", params: { group: group }}, function(message) {
            var channels = message.data.value;
            callback(channels);
        }.bind(this));
    }

    setChannelMode(channel, mode) {
        if (this.options.debug) console.log("ControllerClient.setChannelMode(%s,%s)...", channel, mode);

        this.ws.send({ action: "setChannelMode", params: { channel: channel, mode: mode } });
    }

    toggleOverride(override) {
        if (this.options.debug) console.log("ControllerClient.toggleOverride(%s)...", override);

        this.ws.send({ action: "toggleOverride", params: { override: override } });
    }

    saveEvent(calendarEvent) {
        if (this.options.debug) console.log("ControllerClient.saveEvent(%s)...", calendarEvent);

        this.ws.send({ action: "saveEvent", params: { e: this.calendarEventToEvent(calendarEvent) }});
    }

    removeEvent(calendarEvent) {
        if (this.options.debug) console.log("ControllerClient.removeEvent(%s)...", calendarEvent);

        this.ws.send({ action: "removeEvent", params: { e: this.calendarEventToEvent(calendarEvent) }});
    }

    getEventsForWeek(date, callback) {
        if (this.options.debug) console.log("ControllerClient.getEventsForWeek(%s,%s)...", date, callback);

        this.ws.send({ action: "getEventsForWeek", params: { date: date }}, function(message) {
            var events = message.data.value;
            var calendarEvents = (events)?events.map(e => this.eventToCalendarEvent(e)):null;
            callback(calendarEvents);
        }.bind(this));
    }

    getEventsForSeason(season, date, callback) {
        if (this.options.debug) console.log("ControllerClient.getEventsForSeason(%s,%s,%s)...", season, date, callback);

        this.ws.send({ action: "getEventsForSeason", params: { season: season, date: date }}, function(message) {
            var events = message.data.value;
            var calendarEvents = (events)?events.map(e => this.eventToCalendarEvent(e)):null;
            callback(calendarEvents);
        }.bind(this));
    }

    saveSeason(season, calendarEvents) {
        if (this.options.debug) console.log("ControllerClient.saveSeason(%s,%s)...", season, calendarEvents);

        var events = calendarEvents.map(e => this.calendarEventToEvent(e));
        this.ws.send({ action: "saveSeason", params: { season: season, events: events }});
    }

    getCurrentSeasonName(date, callback) {
        if (this.options.debug) console.log("ControllerClient.getCurrentSeasonName(%s,%s)...", date, callback);

        this.ws.send({ action: "getCurrentSeasonName", params: { date: date }}, function(message) {
            var seasonName = message.data.value;
            callback(seasonName);
        }.bind(this));
    }

    getSeasonNames(callback) {
        if (this.options.debug) console.log("ControllerClient.getSeasonNames(%s)...", callback);

        this.ws.send({ action: "getSeasonNames", params: {}}, function(message) {
            var seasonNames = message.data.value;
            callback(seasonNames);
        }.bind(this));
    }
    
    eventToCalendarEvent(e) {
        return({ id: e.id, start: e.start, end: e.end, extendedProps: { channel: e.channel }, classNames: [ e.channel ]});
    }

    calendarEventToEvent(e) {
        return(this.makeEvent(e.id, e.extendedProps.channel, e.start, e.end));
    }

    makeCalendarEvent(id, channel, start, end) {
        return(this.eventToCalendarEvent(this.makeEvent(id, channel, start, end)));
    }

    makeEvent(id, channel, start, end) {
        return({ id: id, channel: channel, start: start, end: end });
    }

}
