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

        //this.programmerInterface.addEventListener('click', '#saveas-button', function() { this.saveAsClicked(); }.bind(this));
        //this.programmerInterface.addEventListener('click', '.season-button', function() { this.seasonClicked(); }.bind(this));

        this.options.client.getSeasonNames(function(seasonNames) {
            this.options.client.getCurrentSeasonName(new Date(), function(currentSeasonName) {
                this.buildSeasonButtonGroup(document.getElementById('left-menu'), seasonNames, currentSeasonName);
                Interface.addEventListener('.season-button', 'click', function(target) { this.seasonClicked(target); }.bind(this));
                this.buildChannelButtonGroup(document.getElementById('left-menu'), this.options.channels.map(c => c.name));
            }.bind(this));
        }.bind(this));
        this.createCalendar(document.getElementById('calendar'));
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

    buildChannelButtonGroup(container, channelNames) {
        if (this.options.debug) console.log("Programmer.buildChannelButtonGroup(%s)...", channelNames);

        if (channelNames) {
            var panel = document.createElement('div'); panel.className = 'lcars-bar lcars-u-1';
            var table = document.createElement('div'); table.className = 'table';
            var row, cell;
            for (var i = 0; i < channelNames.length; i++) {
                if ((i % 2) == 0) { row = document.createElement('div'); row.className = 'table-row'; table.appendChild(row); }
                cell = document.createElement('div');
                cell.className = 'table-cell button programme-channel-button programme-channel-button-' + i;
                cell.setAttribute('data-button-value', channelNames[i]);
                cell.appendChild(document.createTextNode(channelNames[i].charAt(0).toUpperCase()));
                row.appendChild(cell);
            }
            panel.appendChild(table);
            container.appendChild(panel);
        }
    }


    getCalendarViewStartDate(controller) {
        var d = controller.calendar.view.activeStart;
    }

    seasonClicked(elem) {
        var season = Interface.processEvent(elem);

        (this.calendar.getEvents()).forEach(e => { e.remove(); });
        this.options.client.getEventsForSeason(season, this.calendar.view.startDate , function(calendarEvents) {
            if (calendarEvents) calendarEvents.forEach(e => this.calendar.addEvent(e));
        }.bind(this));
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
                    successCallback(calendarEvents);
                } else {
                    this.options.client.getEventsForSeason(seasonName, request.start, function(calendarEvents) {
                        if (calendarEvents) {
                            successCallback(calendarEvents);
                        } else {
                            successCallback([]);
                        }
                    }.bind(this));
                }
            }.bind(this));
        }.bind(this));
    }

    /**
     * Create a new event when a calendar drag-drop operation completes.  The
     * method is called by the calendar system with details of the new event
     * passed via info.  A new event is created and written to storage and
     * a call then made to refresh the calendar display.
     */
    createCalendarEvent(info) {
        console.log("Programmer.createCalendarEvent(%s)...", info);

        var id = Date.now();
        var channel = this.programmerInterface.getValue('.channel-button');
        console.log(channel);
        var calendarEvent = this.options.client.makeCalendarEvent(id, channel, info.start, info.end);
        this.options.client.saveEvent(calendarEvent);
        this.calendar.addEvent(calendarEvent);
    }

    removeCalendarEvent(info) {
        console.log("Programmer.removeCalendarEvent(%s)...", info);

        this.options.client.removeEvent(info.event);
        info.event.remove();
    }

}
