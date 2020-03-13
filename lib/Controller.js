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

        return(new Controller(options));
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

        if (!options.channels) throw "configuration error: some channels must be specified";
        if (!options.storage) throw "configuration error: storage must be specified";
        if (!options.issueNotificationCallback) throw "configuration error: issueNotificationCallback must be specified";
        if (!options.cancelNotificationCallback) throw "configuration error: cancelNotificationCallback must be specified";
        options.debug = (options.debug)?options.debug:false;

        super({ storage: options.storage, debug: options.debug });
        this.options = options;

        this.state = {
            channels: {}
        }
        this.options.channels.forEach(channel => {
            this.state.channels[channel.name] = { mode: channel.defaultMode, events: [], overrides: {} };
            channel.overrides.forEach(override => {
                this.state.channels[channel.name].overrides[override.name] = false;
            });
        });

        Object.keys(this.state.channels).forEach(channel => this.setChannelMode(channel, this.state.channels[channel].mode));
    }

    /**
     * Change the mode of a controller channel and immediately implement the
     * implied behavioural changes.
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
                        var e = CanonicalEvent.create(offtime, 'OFF', this.scheduleJob(offtime, function(ch,e) { this.actionEvent(ch,e); this.setChannelMode(ch,'OFF'); }.bind(this, channel, e)));
                        this.state.channels[channel].events = [ e ];
                        break;
                    case '2H':
                        this.performAction(channel, 'ON');
                        var offtime = new Date(); offtime.setHours(offtime.getHours() + 2);
                        var e = CanonicalEvent.create(offtime, 'OFF', this.scheduleJob(offtime, function(ch,e) { this.actionEvent(ch,e); this.setChannelMode(ch,'OFF'); }.bind(this, channel, e)));
                        this.state.channels[channel].events = [ e ];
                        break;
                    case 'ADVANCE':
                        if (this.state.channels[channel].mode == 'AUTO') this.actionEvent(channel, this.getNextEventOnChannel(channel));
                        break;
                    default:
                        break;
                }
                this.notifyMode(channel);
                this.notifyNext(channel);
            }
        }
    }

    /** Toggle a heating controller override state.
     * @param override - name of the override.
     */
    toggleOverride(channelName, overrideName) {
        if (this.options.debug) console.log("Controller.toggleOverride(%s,%s)...", channelName, overrideName);

        if ((this.state.channels.hasOwnProperty(channelName)) && (this.state.channels[channelName].overrides.hasOwnProperty(overrideName))) {
            this.state.channels[channelName].overrides[overrideName] = (! this.state.channels[channelName].overrides[overrideName]);
            this.notifyChannelOverrideState(channelName, overrideName);
        }
    }

    getChannelsInGroup(groupName, callback) {
        if (this.options.debug) console.log("Controller.getChannelsInGroup(%s)...", groupName);

        callback(this.options.channels.filter(channel => (channel.group == groupName)));
    }

    getChannelMode(channelName) {
        if (this.options.debug) console.log("Controller.getChannelMode(%s)...", channelName);

        return((this.state.channels.hasOwnProperty(channelName))?this.state.channels[channelName].mode:'OFF');
    }

    getOverrideState(channelName, overrideName) {
        if (this.options.debug) console.log("Controller.getChannelMode(%s,%s)...", channelName, overrideName);

        var retval = false;
        return(((this.state.channels.hasOwnProperty(channelName)) && (this.state.channels[channelName].overrides.hasOwnProperty(overrideName)))?this.state.channels[channelName].overrides[overrideName]:false);
    }
        

    /**
     * Translate a canonical channel event into a performative action and
     * cancel any job associated with the event.
     * @param channel - the heating channel to which the event relates.
     * @param e - the event to be actioned.
     */ 
    actionEvent(channelName, e) {
        if (this.options.debug) console.log("Controller.actionEvent(%s,%s)...", channelName, e);

        e.cancel();
        this.performAction(channelName, e.getAction());
    }

    /**
     * Perform the fundamental action of the controller by invoking the
     * callback methods responsible for issuing and removing the notifications
     * which switch heating channels on or off.
     * @param channel - the heating channel which should be notified.
     * @param action - 'ON' to raise an alert notification, 'OFF' to remove one.
     */
    performAction(channelName, action) {
        if (this.options.debug) console.log("Controller.performAction(%s,%s)...", channelName, action);

        this.notifyChannelState(channelName, (action == 'ON'));
    }

    /**
     * Stop issuing SignalK heating control notifications on a specified
     * channel and set the channel mode to 'OFF'.
     * @param channel - the heating channel whose 
     */
    cancelJobsOnChannel(channelName) {
        if (this.options.debug) console.log("Controller.cancelJobsOnChannel(%s)...", channelName);

        this.state.channels[channelName].events.forEach(e => e.cancel());
        this.state.channels[channelName].mode = 'OFF';
        this.performAction(channelName, 'OFF');
    }

    /**
     * Returns the next CanonicalEvent on <channel> or null if no future events
     * exents.
     */
    getNextEventOnChannel(channelName) {
        if (this.options.debug) console.log("Controller.getNextEventOnChannel(%s)...", channelName);

        var retval = null;
        var now = new Date();
        if (this.state.channels[channelName]) {
            retval = this.state.channels[channelName].events.reduce((a,e) => { return(((a == null) && (e.getDate() > now) && (e.getJob()))?e:a); }, null);
        }
        return(retval);
    }

    notifyChannelState(channelName, state) {
        if (this.options.debug) console.log("Controller.notifyChannelState(%s,%s)...", channelName, state);

        if (this.state.channels.hasOwnProperty(channelName)) {
            if (state) {
                this.options.issueNotificationCallback("controller." + channelName, "alert");
            } else {
                this.options.cancelNotificationCallback("controller." + channelName);
            }
        }
    }

    notifyChannelOverrideState(channelName, overrideName) {
        if ((this.state.channels.hasOwnProperty(channelName)) && (this.state.channels[channelName].overrides.hasOwnProperty(overrideName))) {
            if (this.state.channels[channelName].overrides[overrideName]) {
                this.options.issueNotificationCallback("controller." + channelName + "." + overrideName , "alert");
            } else {
                this.options.cancelNotificationCallback("controller." + channelName + "." + overrideName);
            }
        }
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
    notifyNext(channel) {
        if (this.options.debug) console.log("Controller.notifyNextEvent(%s)...", channel);

        this.options.cancelNotificationCallback("controller." + channel + ".next");
        if (['AUTO', '1H', '2H'].includes(this.state.channels[channel].mode)) {
            var message = "---";
            var nextEvent = this.getNextEventOnChannel(channel);
            if (nextEvent) message = "(Next " + nextEvent.action + "@" + nextEvent.date.getHours() + ":" + nextEvent.date.getMinutes() + ")";
            this.options.issueNotificationCallback("controller." + channel + ".next", "normal", message);
        }
    }
        
    /**
     * Return an object which specifies the protocol method names exported by
     * this Controller and its parent classes.  The returned object is suitable
     * for use by a ControllerServer.
     * @returns - protocol object.
     */
    static getProtocol(instance) {
        //if (this.options.debug) console.log("Controller.getProtocol(%s)...", instance);

        var protocol = {
            name: "controller",
            verbs: {
                getChannelsInGroup: {
                    requires: [ 'group' ],
                    returns: 'channels',
                    func: function(params, callback) { this.getChannelsInGroup(params.group, callback); }.bind(instance)
                },
                setChannelMode: {
                    requires: [ 'channel', 'mode' ],
                    returns: null,
                    func: function(params) { this.setChannelMode(params.channel, params.mode); }.bind(instance)
                },
                toggleOverride: {
                    requires: [ 'override' ],
                    returns: null,
                    func: function(params) { this.toggleOverride(params.override); }.bind(instance)
                }
            }
        }
        return(protocol); 
    }

}
