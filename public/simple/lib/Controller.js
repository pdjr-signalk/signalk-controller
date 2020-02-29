class Controller extends SignalK {

    static create(options) {
        if (options.debug) console.log("Controller.create(%s)...", JSON.stringify(options));

        try { return(new Controller(options)); } catch(e) { return(null); }
    }
    

    constructor(options) {
        if (options.debug) console.log("Controller(%s)...", JSON.stringify(options));

        super(options.host, options.signalkPort).waitForConnection().then(_ => {
            this.options = options;
            this.pageutils = new PageUtils({ "overlayOnLoad": function(r) { }});
            this.functionfactory = new FunctionFactory();
            this.client = null;
            this.calendar = null;
            this.week = 0;
            this.events = [];
            this.selectedChannel = null;
            this.flags = { pageReady: false };

            // Recursively load document fragments
            while (PageUtils.include(document));
            window.afterInclude();

            // Connect to server and wait for connection to complete...
            this.client = new ControllerClient({ server: this.options.host, port: this.options.controllerPort, debug: options.debug });
            this.client.waitForConnection().then(_ => {
                this.client.getChannelsInGroup("heating", function(channels) {
                    this.buildChannelButtonGroup(document.getElementById('header'), channels);
                    this.flags.pageReady = true;
                }.bind(this));
                PageUtils.waitForFlag(this.flags, "pageReady").then(_ => {
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

                    this.programmerInterface = ProgrammerInterface.create(document);
                    this.programmerInterface.addEventListener('click', '.channel-button', function(value) { this.channelClicked(); }.bind(this));
                    this.programmerInterface.addEventListener('click', '.mode-button', function() { this.modeClicked(); }.bind(this));
                    this.programmerInterface.addEventListener('click', '.override-button', function() { this.overrideClicked(); }.bind(this));

                    this.programmerInterface.addEventListener('click', '#saveas-button', function() { this.saveAsClicked(); }.bind(this));
                    this.programmerInterface.addEventListener('click', '.season-button', function() { this.seasonClicked(); }.bind(this));

                    controller.createCalendar(document.getElementById('calendar'));
                });
            });
        });
        this.swipe = new Swipe("pages");
    }

    connectionLost() {
        if (confirm("Server connection lost! Reconnect?")) {
            window.location = window.location;
        }
    }

    buildChannelButtonGroup(container, channels) {
        if (this.options.debug) console.log("Controller.buildChannelButtonGroup(%s,%s)...", container, channels);

        if ((container) && (channels)) {
            var table = document.createElement("div"); table.className = "table channel-button-group";
            var row = document.createElement("div"); row.classList.add("table-row");
            channels.forEach(channel => {
                var cell = document.createElement("div"); cell.classList.add("table-cell");
                var button = document.createElement("div");
                button.className = "btn button channel-button radio notification " + channel.name + " widget-indicator";
                button.setAttribute("data-button-group", "channel-button");
                button.setAttribute("data-button-value", channel.name);
                button.setAttribute("data-signalk-path", channel.statePath);
                button.setAttribute("data-icon-url", channel.iconUrl);
                button.appendChild(document.createTextNode(channel.name.toUpperCase()));
                var mode = document.createElement("div"); mode.classList.add("signalk-dynamic");
                mode.setAttribute("data-signalk-path", channel.modePath);
                mode.setAttribute("data-filter", "notification-value");
                button.appendChild(mode);
                var next = document.createElement("div"); mode.classList.add("signalk-dynamic");
                next.setAttribute("data-signalk-path", channel.nextPath);
                next.setAttribute("data-filter", "notification-value");
                button.appendChild(next);
                cell.appendChild(button);
                row.appendChild(cell);
            });
            table.appendChild(row);
            container.appendChild(table);
        }
    }

    getCalendar() {
        return(this.calendar);
    }

    getCalendarViewStartDate(controller) {
        var d = controller.calendar.view.activeStart;
    }

    channelClicked() {
        if (this.options.debug) console.log("channelClicked()...");

        if (this.programmerInterface.getState(".channel-button")) {
            document.getElementById("mode-button-group").classList.remove("hidden");
        } else {
            document.getElementById("mode-button-group").classList.add("hidden");
            this.programmerInterface.setState('channel-button', false);
        }
    }

    modeClicked() {
        if (this.options.debug) console.log("modeClicked()...");
    
        var channel = this.programmerInterface.getValue('.channel-button');
        var mode = this.programmerInterface.getValue('.mode-button');
        if ((channel) && (mode)) {
            this.client.setChannelMode(channel, mode);
            document.getElementById("mode-button-group").classList.add("hidden");
            this.programmerInterface.setState('channel-button', false);
        }
    }

    overrideClicked() {
        if (this.options.debug) console.log("overrideClicked()...");

        var override = this.programmerInterface.getValue('.override-button');
        if (override) {
            this.client.toggleOverride(override);
            this.programmerInterface.setState('override-button', false);
        }
    }

    seasonClicked() {
        var season = controller.programmerInterface.getValue('season-button');
        if (controller.programmerInterface.getState('saveas-button')) {
            // Save the current events as a pattern for <season> 
            var calendarEvents = controller.calendar.getEvents();
            if (calendarEvents.length > 0) controller.client.saveSeason(season, calendarEvents);
            controller.programmerInterface.setState('saveas-button', false);
            document.getElementById('season-button-group').classList.remove('lcars-flash');
        } else {
            (controller.calendar.getEvents()).forEach(e => { e.remove(); });
            var _controller = controller;
            calendarEvents = controller.client.getEventsForSeason(season, controller.calendar.view.startDate , function(calendarEvents) {
                if (calendarEvents) calendarEvents.forEach(e => _controller.calendar.addEvent(e));
            });
        }
    }

    saveAsClicked(controller) {
        if (this.options.debug) console.log("saveAsClicked(controller)...");
        this.getCalendarViewStartDate(controller);
        if (controller.programmerInterface.getState('saveas-button')) {
            document.getElementById('season-button-group').classList.add('lcars-flash');
        } else {
            document.getElementById('season-button-group').classList.remove('lcars-flash');
        }
    }
    
    async createCalendar(node) {
        if (node) {
        await sleep(1000);
        var _this = this;
        this.calendar = new FullCalendar.Calendar(node, {
            plugins: [ 'timeGrid', 'interaction', 'bootstrap' ],
            events: function(req, suc, err) { Controller.getEvents(_this, req, suc, err); },
            selectable: true,
            unselectAuto: false,
            defaultView: 'timeGridWeek',
            firstDay: 1,
            height: 400,
            themeSystem: 'bootstrap',
            header: { left: 'prev,next today', center: '', right: 'title' },
            displayEventTime: false,
            allDaySlot: false,
            slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false, omitZeroMinute: false, meridiem: 'false' },
            columnHeaderFormat: { weekday: 'short' },
            select: function(info) { Controller.createCalendarEvent(_this, info); },
            eventClick: function(info) { Controller.removeCalendarEvent(_this, info); }
        });
        this.calendar.render();
        }
    }

    /**
     * Return a collection of events for the currently displayed calendar week.
     * This method is called by the calendar system each time it requires
     * refreshed data.
     *
     * The method recovers the requested events from storage and returns them
     * via successCallback.
     */
    static getEvents(controller, request, successCallback, failureCallback) {
        var _controller = controller;
        var _start = request.start;
        var _successCallback = successCallback;
        if (controller.calendar) controller.calendar.getEvents().forEach(e => e.remove());
        controller.client.getCurrentSeasonName(_start, function(seasonName) {
            var _seasonName = seasonName;
            controller.client.getEventsForWeek(_start, function(calendarEvents) {
                if (calendarEvents) {
                    _successCallback(calendarEvents);
                } else {
                    controller.client.getEventsForSeason(_seasonName, _start, function(calendarEvents) {
                        if (calendarEvents) {
                            _successCallback(calendarEvents);
                        } else {
                            _successCallback([]);
                        }
                    });
                }
            });
        });
    }

    /**
     * Create a new event when a calendar drag-drop operation completes.  The
     * method is called by the calendar system with details of the new event
     * passed via info.  A new event is created and written to storage and
     * a call then made to refresh the calendar display.
     */
    static createCalendarEvent(controller, info) {
        console.log("createCalendarEvent(%s,%s)...", controller, info);
        var id = Date.now();
        var channel = controller.programmerInterface.getValue('.channel-button');
        console.log(channel);
        var calendarEvent = ControllerClient.makeCalendarEvent(id, channel, info.start, info.end);
        controller.client.saveEvent(calendarEvent);
        controller.calendar.addEvent(calendarEvent);
    }

    static removeCalendarEvent(controller, info) {
        console.log("removeCalendarEvent(%s,%s)...", controller, info);
        controller.client.removeEvent(info.event);
        info.event.remove();
    }

}
