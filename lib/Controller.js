var CanonicalEvent = require("./CanonicalEvent.js");
var Schedule = require("./Schedule.js");

module.exports = class Controller extends Schedule {

    /**
     * Factory method to make a new Controller instance.
     * @param options - a configuration object (see constructor).
     * @returns - new Controller instance or null on error.
     */
    static create(options) {
        if (options.debug) console.log("Controller.create(%s)...", options);

        try { return(new Controller(options)); } catch(e) { return(null); }
    }

    /**
     * Construct a new Controller instance.
     * @param options - a configuration object with the following attributes.
     * @attr storage - required persistent storage object supporting the localStorage interface.
     * @attr issueNotificationCallback - required function capable of issuing a SignalK notification. 
     * @attr cancelNotificationCallback - required function capable of cancelling a SignalK notification. 
     * @attr debug - optional boolean requesting or disabling (default) debug output to console.log.
     * @returns - new Controller instance.
     */
    constructor(options) {
        if (options.debug) console.log("Controller(%s)...", options);

        if (!options.storage) throw "configuration error: storage must be specified";
        if (!options.issueNotificationCallback) throw "configuration error: issueNotificationCallback must be specified";
        if (!options.cancelNotificationCallback) throw "configuration error: cancelNotificationCallback must be specified";
        options.defaults = (options.defaults)?options.defaults:{ heating: 'OFF', water: 'OFF', ensuite: 'OFF', dayhead: 'OFF' };
        options.debug = (options.debug)?options.debug:false;

        super({ storage: options.storage, debug: options.debug });
        this.options = options;

        this.state = {
            channels: {
                heating: { events: [], mode: options.defaults.heating },
                water:   { events: [], mode: options.defaults.water },
                ensuite: { events: [], mode: options.defaults.ensuite },
                dayhead: { events: [], mode: options.defaults.dayhead }
            },
            modulation: false,
            frost: false
        };
        Object.keys(this.state.channels).forEach(channel => this.setChannelMode(channel, this.state.channels[channel].mode));
    }

    /**
     * Change the mode of a controller channel and immediately implement the
     * implied bhavioural changes.
     * @param channel -  string naming the heating channel to which the mode change applies.
     * @param mode - string specifying the new channel mode.
     */
    setChannelMode(channel, mode) {
        if (this.options.debug) console.log("Controller.setChannelMode(%s,%s)...", channel, mode);

        if ((channel) && (mode)) {
            channel = channel.toLowerCase();
            mode = mode.toUpperCase();
            if ((this.state.channels[channel]) && (['ON','OFF','AUTO','1H','2H','ADVANCE'].includes(mode))) {
                this.cancelJobsOnChannel(channel);
                if (mode != 'ADVANCE') this.state.channels[channel].mode = mode;
                switch (mode) {
                    case 'ON':
                        this.performAction(channel, 'ON');
                        break;
                    case 'OFF':
                        this.performAction(channel, 'OFF');
                        break;
                    case 'AUTO':
                        var now = new Date();
                        super.getCanonicalEventsForChannelWeek(channel, now, function(ch, events) {
                            this.state.channels[ch].events = events;
                            var upcomingEvents = this.state.channels[ch].events.filter(e => (e.date > now));
                            // Set the current state implied by the upcomong events....
                            var currentState = ((upcomingEvents.length == 0)?'OFF':((upcomingEvents[0].action == 'ON')?'OFF':'ON'));
                            this.performAction(ch, currentState);
                            // Schedule upcoming events...
                            upcomingEvents.forEach(e => {
                                e.schedule(this.scheduleJob(e.date, function(ch, e) { this.actionEvent(ch, e); }.bind(this, ch, e)));
                            });
                        }.bind(this)); 
                        break;
                    case '1H':
                        this.performAction(channel, 'ON');
                        var offtime = new Date(); offtime.setHours(offtime.getHours() + 1);
                        var e = this.createCanonicalEvent(offtime, 'OFF', this.scheduleJob(offtime, function(ch,e) { this.actionEvent(ch,e); this.setChannelMode(ch,'OFF'); }.bind(this, channel, e)));
                        this.state.channels[channel].events = [ e ];
                        break;
                    case '2H':
                        this.performAction(channel, 'ON');
                        var offtime = new Date(); offtime.setHours(offtime.getHours() + 2);
                        var e = this.createCanonicalEvent(offtime, 'OFF', this.scheduleJob(offtime, function(ch,e) { this.actionEvent(ch,e); this.setChannelMode(ch,'OFF'); }.bind(this, channel, e)));
                        this.state.channels[channel].events = [ e ];
                        break;
                    case 'ADVANCE':
                        if (this.state.channels[channel].mode == 'AUTO') this.actionEvent(channel, this.getNextEventOnChannel(channel));
                        break;
                    default:
                        break;
                }
                this.notifyMode(channel);
                this.notifyNextEvent(channel);
            }
        }
    }

    /**
     * Set the heating controller modulation state.
     * @param state - boolean specifying the new modulation state.
     */
    setModulation(state) {
        if (this.options.debug) console.log("Controller.setModulation(%s)...", state);

        this.state.modulation = state;
        this.engage();
    }

    /** Set the heating controller frost protection state.
     * @param state - boolean specifying the new frost protection state.
     */
    setFrost(state) {
        if (this.options.debug) console.log("Controller.setFrost(%s)...", state);

        this.state.frost = state;
        this.engage();
    }

    getChannelMode(channel) {
        if (this.options.debug) console.log("Controller.getChannelMode(%s)...", channel);

        return((this.state.channels[channel])?this.channels[channel].mode:'OFF');
    }

    getModulation() {
        if (this.options.debug) console.log("Controller.getModulation()...");

        return(this.state.modulation);
    }

    getFrost() {
        if (this.options.debug) console.log("Controller.getFrost()...");

        return(this.state.frost);
    }

    /**
     * Translate a canonical channel event into a performative action and
     * cancel any job associated with the event.
     * @param channel - the heating channel to which the event relates.
     * @param e - the event to be actioned.
     */ 
    actionEvent(channel, e) {
        if (this.options.debug) console.log("Controller.actionEvent(%s,%s)...", channel, e);

        e.cancel();
        this.performAction(channel, e.getAction());
    }

    /**
     * Perform the fundamental action of the controller by invoking the
     * callback methods responsible for issuing and removing the notifications
     * which switch heating channels on or off.
     * @param channel - the heating channel which should be notified.
     * @param action - 'ON' to raise an alert notification, 'OFF' to remove one.
     */
    performAction(channel, action) {
        if (this.options.debug) console.log("Controller.performAction(%s,%s)...", channel, action);

        if ((this.state.channels[channel]) && (action)) {
            switch (action) {
                case 'ON':  this.options.issueNotificationCallback("controller." + channel, "alert"); break;
                case 'OFF': this.options.cancelNotificationCallback("controller." + channel); break;
                default: break;
            }
        }
    }

    /**
     * Stop issuing SignalK heating control notifications on a specified
     * channel and set the channel mode to 'OFF'.
     * @param channel - the heating channel whose 
     */
    cancelJobsOnChannel(channel) {
        if (this.options.debug) console.log("Controller.cancelJobsOnChannel(%s)...", channel);

        this.state.channels[channel].events.forEach(e => e.cancel());
        this.state.channels[channel].mode = 'OFF';
        this.performAction(channel, 'OFF');
    }

    /**
     * Issues a normal notification on notifications.controller.<channel>.mode
     * with a message value which describes the current mode of <channel>. This
     * notification can be used by clients that wish to report the real-time
     * state of the heating system.
     * @param channel - name of the channel which sould be notified.
     */
    notifyMode(channel) {
        if (this.options.debug) console.log("Controller.notifyMode(%s)...", channel);

        this.options.issueNotificationCallback("controller." + channel + ".mode", "normal", this.state.channels[channel].mode);
    }

    /**
     * If the heating system channel is operating in a programmed mode (AUTO,
     * 1H or 2H) then this method issues a normal notification on
     * notification.controller.<channel>.next with a message that indicates
     * the time and type of the next scheduled heating system event.  If the
     * heating system is in a non-programmed mode, the the notification is
     * cancelled.
     * @param channel - name of the channel which should be notified.
     */
    notifyNextEvent(channel) {
        if (this.options.debug) console.log("Controller.notifyNextEvent(%s)...", channel);

        this.options.cancelNotificationCallback("controller." + channel + ".next");
        if (['AUTO', '1H', '2H'].includes(this.state.channels[channel].mode)) {
            var message = "---";
            var nextEvent = this.getNextEventOnChannel(channel);
            console.log("NEXT EVENT %s", JSON.stringify(nextEvent));
            if (nextEvent) message = "(Next " + nextEvent.action + "@" + nextEvent.date.getHours() + ":" + nextEvent.date.getMinutes() + ")";
            this.options.issueNotificationCallback("controller." + channel + ".next", "normal", message);
        }
    }
        
    getNextEventOnChannel(channel) {
        if (this.options.debug) console.log("Controller.getNextEventOnChannel(%s)...", channel);

        console.log(JSON.stringify(this.state.channels[channel].events));
        var retval = null;
        var now = new Date();
        console.log(now.toISOString());
        if (this.state.channels[channel]) {
            retval = this.state.channels[channel].events.reduce((a,e) => { return(((a == null) && (e.getDate() > now) && (e.getJob()))?e:a); }, null);
        }
        return(retval);
    }

    /**
     * Return an object which specifies the protocol method names exported by
     * this Controller and its parent classes.  The returned object is suitable
     * for use by a ControllerServer.
     * @returns - protocol object.
     */
    getProtocol() {
        if (this.options.debug) console.log("Controller.getProtocol()...");

        var protocol = {
            name: "controller",
            verbs: {
                setChannelMode: {
                    requires: [ 'channel', 'mode' ],
                    returns: null,
                    func: function(params) { this.setChannelMode(params.channel, params.mode); }.bind(this)
                },
                setModulation: {
                    requires: [ 'state' ],
                    returns: null,
                    func: function() { this.setModulation(params.state); }.bind(this)
                },
                setFrost: {
                    requires: [ 'state' ],
                    returns: null,
                    func: function() { this.setFrost(params.state); }.bind(this)
                }
            }
        }
        var programmeProtocol = super.getProtocol();
        Object.keys(programmeProtocol).forEach(key => { protocol.verbs[key] = programmeProtocol[key]; });
        return(protocol); 
    }

}
