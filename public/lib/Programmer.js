class Programmer {

    static create(options) {
        if (options.debug) console.log("Programmer.create(%s)...", JSON.stringify(options));

        return(new Programmer(options));
    }

    constructor(options) {
        if (options.debug) console.log("Programmer(%s)...", JSON.stringify(options));

        if (!options.client) throw "SignalkController client instance must be specified (options.client)"
        if (!options.debug) options.debug = false;

        this.options = options;
        this.calendar = null;
        this.week = 0;
        this.events = [];
        this.flags = { pageReady: false };
        this.active = false;

        Kellycolors.init();
        this.options.channels.forEach(channel => { channel.color = Kellycolors.getNextColor(); });

        this.configureChannelButtons();

        this.options.client.getSeasonNames(function(seasonNames) {
            this.options.client.getCurrentSeasonName(new Date(), function(currentSeasonName) {
                this.buildSeasonButtonGroup(document.getElementById('left-menu'), seasonNames, currentSeasonName);
                Interface.addEventListener('.season-button', 'click', function(target) { this.seasonClicked(target); }.bind(this));
            }.bind(this));
        }.bind(this));
        this.createCalendar(document.getElementById('calendar'));
    }

    /**
     * Configures buttons in the .channel-buttons class by adding an indicator
     * element and assigning it a unique key color.  The indicator is hidden
     * from display and will only become visible when this component class is
     * active.
     */
    configureChannelButtons() {
        this.options.channels.forEach(c => {
            var button = document.getElementById(c.name + '-channel');
            if (button) {
                var indicator = document.createElement('div');
                indicator.className = 'programme-indicator ' + c.color.name + ' hidden';  
                indicator.setAttribute('data-channel-name', c.name);
                indicator.setAttribute('data-channel-color', c.color.name);
                button.appendChild(indicator);
            }
        });
    }
    
    activate(state) {
        this.active = state;
        if (this.active) {
            [...document.getElementsByClassName('season-button')].forEach(e => e.classList.remove('hidden'));
            [...document.getElementsByClassName('programme-indicator')].forEach(e => e.classList.remove('hidden'));
            Interface.addEventListener('.programme-indicator', 'click', function(target) { this.programmeIndicatorClickHandler(target); }.bind(this));
        } else {
            [...document.getElementsByClassName('season-button')].forEach(e => e.classList.add('hidden'));
            [...document.getElementsByClassName('programme-indicator')].forEach(e => e.classList.add('hidden'));
        }
    }


    buildSeasonButtonGroup(container, seasonNames, currentSeasonName) {
        if (this.options.debug) console.log("Programmer.buildSeasonButtonGroup(%s)...", seasonNames);

        if (seasonNames) {
            var filler = document.createElement('div'); filler.className = 'lcars-bar lcars-u-1-1';
            container.appendChild(filler);
            seasonNames.forEach(seasonName => {
                var button = document.createElement('div');
                button.id = seasonName + '-season';
                button.className = 'lcars-bar lcars-u-1-1 button season-button' + (((currentSeasonName) && (currentSeasonName == seasonName))?' on':'');
                button.setAttribute('data-button-value', seasonName);
                button.appendChild(document.createTextNode(seasonName));
                container.appendChild(button);
            });
            filler = document.createElement('div'); filler.className = 'lcars-bar';
            container.appendChild(filler);
        }
    }

    getCalendarViewStartDate(controller) {
        var d = controller.calendar.view.activeStart;
    }

    programmeIndicatorClickHandler(button) {
        [...document.getElementsByClassName('programme-indicator')].forEach(e => e.classList.remove('selected'));
        button.classList.add('selected');
    }
        

    seasonClicked(elem) {
        var season = Interface.processEvent(elem);
        alert(season);

        this.options.client.saveSeason(season, this.calendar.getEvents());
    }

    async createCalendar(node) {
        this.calendar = new FullCalendar.Calendar(node, {
            plugins: [ 'timeGrid', 'interaction', 'bootstrap' ],
            events: function(req, suc, err) { this.getEvents(req, suc, err); }.bind(this),
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
            select: function(info) { this.createCalendarEvent(info); }.bind(this),
            eventClick: function(info) { this.removeCalendarEvent(info); }.bind(this)
        });
        this.calendar.render();
    }

    /**
     * Return a collection of events for the currently displayed calendar week.
     * This method is called by the calendar system each time it requires
     * refreshed data.
     *
     * The method recovers the requested events from storage and returns them
     * via successCallback.
     */
    getEvents(request, successCallback, failureCallback) {
        if (this.calendar) this.calendar.getEvents().forEach(e => e.remove());
        this.options.client.getCurrentSeasonName(request.start, function(seasonName) {
            this.options.client.getEventsForWeek(request.start, function(calendarEvents) {
                if (calendarEvents) {
                    successCallback(this.appendChannelColorToCalendarEvents(calendarEvents));
                } else {
                    this.options.client.getEventsForSeason(seasonName, request.start, function(calendarEvents) {
                        if (calendarEvents) {
                            successCallback(this.appendChannelColorToCalendarEvents(calendarEvents));
                        } else {
                            successCallback([]);
                        }
                    }.bind(this));
                }
            }.bind(this));
        }.bind(this));
    }

    appendChannelColorToCalendarEvents(events) {
        events.forEach(e => {
            var color = this.options.channels.reduce((a,c) => { return((c.name == e.extendedProps.channel)?c.color.name:a); }, 'red');
            e.classNames.push(color);
        });
        return(events);
    }

    /**
     * Create a new event when a calendar drag-drop operation completes.  The
     * method is called by the calendar system with details of the new event
     * passed via info.  A new event is created and written to storage and
     * a call then made to refresh the calendar display.
     */
    createCalendarEvent(info) {
        console.log("Programmer.createCalendarEvent(%s)...", info);

        if (this.active) {
            var id = Date.now();
            var channels= [...document.getElementsByClassName('programme-indicator')].filter(e => e.classList.contains('selected'));
            if (channels.length == 1) {
                var channel = channels[0].getAttribute('data-channel-name');
                var color = channels[0].getAttribute('data-channel-color');
                console.log(channel);
                var calendarEvent = this.options.client.makeCalendarEvent(id, channel, info.start, info.end);
                calendarEvent.classNames.push(color);
                this.options.client.saveEvent(calendarEvent);
                this.calendar.addEvent(calendarEvent);
            }
        } else {
            alert("Select 'PROGRAMMME' mode to modify this programme");
        }
    }


    removeCalendarEvent(info) {
        console.log("Programmer.removeCalendarEvent(%s)...", info);

        if (this.active) {
            this.options.client.removeEvent(info.event);
            info.event.remove();
        } else {
            alert("Select 'PROGRAMMME' mode to modify this programme");
        }
    }

}
