class Controller extends SignalK {

    static create(options) {
        if (options.debug) console.log("Controller.create(%s)...", JSON.stringify(options));

        return(new Controller(options));
    }
    

    constructor(options) {
        if (options.debug) console.log("Controller(%s)...", JSON.stringify(options));

        super(options.host, options.signalkPort).waitForConnection().then(_ => {
            this.options = options;
            this.pageutils = new PageUtils({ "overlayOnLoad": function(r) { }});
            this.functionfactory = new FunctionFactory();
            this.client = new ControllerClient({ server: "ws://" + options.host + ":" + options.controllerPort, debug: options.debug });
            this.calendar = null;
            this.week = 0;
            this.events = [];
            this.selectedOverride = null;

            // Load document fragments
            while (PageUtils.include(document));
            window.afterInclude();

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
                super.registerCallback(path, function(v) { alert("Hello"); });
            });

            // Populate page with widgets
            PageUtils.wildWalk(document, "widget-", element => {
                if (element.hasAttribute("data-source")) this.localStorage.setAsAttributes(element.getAttribute("data-source"), element); 
                if (element.hasAttribute("data-signalk-path")) {
                    super.registerCallback(element.getAttribute("data-signalk-path"), Widget.createWidget(element, element.getAttribute("data-filter")));
                    //super.getValue(element.getAttribute("data-signalk-path"), Widget.createWidget(element, element.getAttribute("data-filter")));
                }
            });

            this.programmerInterface = ProgrammerInterface.create(document);
            this.programmerInterface.addEventListener('click', '#saveas-button', function() { this.saveAsClicked(); }.bind(this));
            this.programmerInterface.addEventListener('click', '.season-button', function() { this.seasonClicked(); }.bind(this));
            this.programmerInterface.addEventListener('click', '.override-button', function(value) { this.overrideClicked(); }.bind(this));
            this.programmerInterface.addEventListener('click', '.mode-button', function() { this.modeClicked(); }.bind(this));

            controller.createCalendar(document.getElementById('calendar'));
        });

    }

    connectionLost() {
        if (confirm("Server connection lost! Reconnect?")) {
            window.location = window.location;
        }
    }

    rightClick(e) {
        alert("Hello");
    }

    getCalendar() {
        return(this.calendar);
    }

    getCalendarViewStartDate(controller) {
        var d = controller.calendar.view.activeStart;
    }

    overrideClicked() {
        if (this.options.debug) console.log("overrideClicked()...");

        if (this.programmerInterface.getState(".override-button")) {
            if (this.selectedOverride) document.getElementById("mode-button-group").classList.remove(this.selectedOverride);
            this.selectedOverride = this.programmerInterface.getValue(".override-button");
            document.getElementById("mode-button-group").classList.add(this.selectedOverride);
            document.getElementById("mode-button-group").classList.remove("hidden");
        } else {
            this.programmerInterface.setState("override-button", false);
            document.getElementById("mode-button-group").classList.remove(this.selectedOverride);
            document.getElementById("mode-button-group").classList.add("hidden");
            this.selectedOverride = null;
        }
    }

    modeClicked() {
        if (this.options.debug) console.log("modeClicked()...");
    
        var channel = this.programmerInterface.getValue('.override-button');
        var mode = this.programmerInterface.getValue('.mode-button');
        console.log("Channel = %s, mode = %s", channel, mode);
        switch (mode) {
            case "on":
                this.client.channelOn(channel);
                break;
            case "off":
                this.client.channelOff(channel);
                break;
            case "auto":
                this.client.channelAuto(channel);
                break;
            default:
                break;
        }
        document.getElementById("mode-button-group").classList.remove(this.selectedOverride + "-override-button");
        document.getElementById("mode-button-group").classList.add("hidden");
        this.programmerInterface.setState('override-button', false);
    }

    seasonClicked() {
        console.log("seasonClicked()...");
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
        console.log("saveAsClicked(controller)...");
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
        console.log("getEvents(%s,%s,%s,%s)...", "controller", request, "successCallback", "failureCallback");
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
