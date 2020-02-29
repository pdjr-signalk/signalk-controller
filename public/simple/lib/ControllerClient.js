/**
 * Client interface to a remote Controller server.
 */

class ControllerClient {

    static create(options) {
        if (options.debug) console.log("ControllerClient.create(%s)...", JSON.stringify(options));

        try { return(new ControllerClient(options)); } catch(e) { return(null); }
    }

    /**
     * Create a new Programme instance and connect to the ProgrammeServer at
     * <url>.  The connection is made using the WebsocketR2 library which
     * provides a request-response protocol on top of a standard websocket
     * and offers some connection resilience.
     */
    constructor(options) {
        if (options.debug) console.log("ControllerClient(%s)...", JSON.stringify(options));

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
        var _callback = callback;
        this.ws.send({ action: "getChannelsInGroup", params: { group: group }}, function(message) {
            var channels = message.data.value;
            _callback(channels);
        });
    }

    setChannelMode(channel, mode) {
        this.ws.send({ action: "setChannelMode", params: { channel: channel, mode: mode } });
    }

    toggleOverride(override) {
        this.ws.send({ action: "toggleOverride", params: { override: override } });
    }

    saveEvent(calendarEvent) {
        if (this.options.debug) console.log("ControllerClient.saveEvent(%s)...", JSON.stringify(calendarEvent));

        this.ws.send({ action: "saveEvent", params: { e: ControllerClient.calendarEventToEvent(calendarEvent) }});
    }

    removeEvent(calendarEvent) {
        if (this.options.debug) console.log("ControllerClient.removeEvent(%s)...", calendarEvent);

        this.ws.send({ action: "removeEvent", params: { e: ControllerClient.calendarEventToEvent(calendarEvent) }});
    }

    getEventsForWeek(date, callback) {
        if (this.options.debug) console.log("ControllerClient.getEventsForWeek(%s,%s)...", date, callback);

        var _callback = callback;
        this.ws.send({ action: "getEventsForWeek", params: { date: date }}, function(message) {
            var events = message.data.value;
            var calendarEvents = (events)?events.map(e => ControllerClient.eventToCalendarEvent(e)):null;
            _callback(calendarEvents);
        });
    }

    getEventsForSeason(season, date, callback) {
        if (this.options.debug) console.log("ControllerClient.getEventsForSeason(%s,%s,%s)...", season, date, callback);

        var _callback = callback;
        this.ws.send({ action: "getEventsForSeason", params: { season: season, date: date }}, function(message) {
            var events = message.data.value;
            var calendarEvents = (events)?events.map(e => ControllerClient.eventToCalendarEvent(e)):null;
            _callback(calendarEvents);
        });
    }

    saveSeason(season, calendarEvents) {
        if (this.options.debug) console.log("ControllerClient.saveSeason(%s,%s)...", season, calendarEvents);

        var events = calendarEvents.map(e => ControllerClient.calendarEventToEvent(e));
        this.ws.send({ action: "saveSeason", params: { season: season, events: events }});
    }

    getCurrentSeasonName(date, callback) {
        if (this.options.debug) console.log("ControllerClient.getCurrentSeasonName(%s,%s)...", date, callback);

        var _callback = callback;
        this.ws.send({ action: "getCurrentSeasonName", params: { date: date }}, function(message) {
            var seasonName = message.data.value;
            _callback(seasonName);
        });
    }

    getSeasonNames(callback) {
        if (this.options.debug) console.log("ControllerClient.getSeasonNames(%s)...", callback);

        var _callback = callback;
        this.ws.send({ action: "getSeasonNames", params: {}}, function(message) {
            var seasons = message.data.value;
            _callback(seasons);
        });
    }
    
    static eventToCalendarEvent(e) {
        return({ id: e.id, start: e.start, end: e.end, extendedProps: { channel: e.channel }, classNames: [ e.channel ]});
    }

    static calendarEventToEvent(e) {
        return(ControllerClient.makeEvent(e.id, e.extendedProps.channel, e.start, e.end));
    }

    static makeCalendarEvent(id, channel, start, end) {
        return(ControllerClient.eventToCalendarEvent(ControllerClient.makeEvent(id, channel, start, end)));
    }

    static makeEvent(id, channel, start, end) {
        return({ id: id, channel: channel, start: start, end: end });
    }

}
