module.exports = class Programme {

    static create(options) {
        if (options.debug) console.log("Programme.create(%s)...", options);

        try { return(new Programme(options)); } catch(e) { return(null); }
    }

    constructor(options) {
        if (options.debug) console.log("Programme(%s)...", options);

        if (!options.storage) throw "configuration error: storage option must be specified";
        this.options = options;
    }

    async saveState(state) {
        if (this.options.debug) console.log("Programme.saveState(%s)...", JSON.stringify(state));

        await this.options.storage.setItem("state", state);
    }

    async getState(callback) {
        if (this.options.debug) console.log("Programme.getState(%s)...", callback);

        var state = await this.options.storage.getItem("state");
        callback(state);
    }

    async saveSeasons(seasons) {
        if (this.options.debug) console.log("Programme.saveSeasons(%s)...", JSON.stringify(seasons));

        await this.options.storage.setItem("seasons", seasons);
    }
        
    async addEvent(e) {
        if (this.options.debug) console.log("Programme.addEvent(%s)...", JSON.stringify(e));

        var week = Programme.getWeek(e.start);
        var events = await this.options.storage.getItem(Programme.makeKey(week));
        if (events) { events.push(e); } else { events = [ e ]; }
        await this.options.storage.setItem(Programme.makeKey(week), events);
    }

    async removeEvent(e) {
        if (this.options.debug) console.log("Programme.removeEvent(%s)...", JSON.stringify(e));

        var week = Programme.getWeek(e.start);
        var events = await this.options.storage.getItem(Programme.makeKey(week));
        events = (events)?(events.filter(ev => (ev.id != e.id))):([]);
        if (events.length == 0) {
            await this.options.storage.removeItem(Programme.makeKey(week));
        } else { 
            await this.options.storage.setItem(Programme.makeKey(week), events);
        }
    }

    async getEventsForWeek(date, callback) {
        if (this.options.debug) console.log("Programme.getEventsForWeek(%s)...", callback);

        var events = await this.options.storage.getItem(Programme.makeKey(Programme.getWeek(date)));
        if (events) {
            callback(events);
        } else {
            this.getCurrentSeasonName(date, function(seasonName) {
                if (seasonName) {
                    this.getEventsForSeason(seasonName, date, function(events) {
                        if (events) {
                            callback(events);
                        } else {
                            callback([]);
                        }
                    }.bind(this));
                } else {
                    callback([]);
                }
            }.bind(this));
        }
    }

    async getEventsForSeason(season, date, callback) {
        if (this.options.debug) console.log("Programme.getEventsForSeason(%s,%s,%s)...", season, date, callback);

        var events = await this.options.storage.getItem(season);
        if ((events) && (events.length > 0)) {
            var date = Programme.startOfWeek(date);
            var seasonStartOfWeek = Programme.startOfWeek(events[0].start);
            var diff = date.getTime() - seasonStartOfWeek.getTime();
            events = events.filter(e => (e.id != 0)).map(e => {
                e.start =  (new Date((new Date(e.start)).getTime() + diff)).toISOString();
                e.end =  (new Date((new Date(e.end)).getTime() + diff)).toISOString();
                return(e);
            });
        }
        callback(events);
    }

    async saveSeason(season, events) {
        if (this.options.debug) console.log("Programme.saveSeason(%s,%s)...", season, JSON.stringify(events));

        if ((events) && (Array.isArray(events))) await this.options.storage.setItem(season, events);
    }

    async getCurrentSeasonName(date, callback) {
        if (this.options.debug) console.log("Programme.getCurrentSeasonName(%s,%s)...", date, callback);

        var week = Programme.getWeek(date);
        var seasonName = null;
        var seasons = await this.options.storage.getItem("seasons");
        if (seasons) seasonName = seasons.reduce((a,season) => { return((season.value.includes(week))?(season.name):a); }, null);
        callback(seasonName);
    }

    async getSeasonNames(callback) {
        if (this.options.debug) console.log("Programme.getSeasonNames(%s)...", callback);

        var seasonNames = null;
        var seasons = await this.options.storage.getItem("seasons");
        if (seasons) seasonNames = seasons.map(season => season.name);
        callback(seasonNames);
    }
    
    static makeKey(k) {
        return("" + k);
    }

    /**
     * Returns a Date object for midnight (00:00:00) on the Monday of the week
     * in which <date> lies.
     */
    static startOfWeek(date) {
        if (typeof date === "string") date = new Date(date);
        var diff = date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1);
        return(new Date(date.setDate(diff)));
    }

    static getWeek(date) {
        if (typeof date === "string") date = new Date(date);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        var week1 = new Date(date.getFullYear(), 0, 4);
        return(1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7));
    }

    static getProtocol(instance) {
        //if (this.options.debug) console.log("Programme.getProtocol(%s)...", instance);

        return({
            name: 'programme',
            verbs: {
	            saveEvent: {
	                requires: [ 'e' ],
	                returns: null,
	                func: function(params) { this.addEvent(params.e); }.bind(instance)
	            },
	            removeEvent: {
	                requires: [ 'e' ],
	                returns: null,
	                func: function(params) { this.removeEvent(params.e); }.bind(instance)
	            },
	            getEventsForWeek: {
	                requires: [ 'date' ],
	                returns: 'events',
	                func: function(params, callback) { this.getEventsForWeek(params.date, callback); }.bind(instance)
	            },
	            getEventsForSeason: {
	                requires: [ 'season', 'date' ],
	                returns: 'events',
	                func: function(params, callback) { this.getEventsForSeason(params.season, params.date, callback); }.bind(instance)
	            },
	            saveSeason: {
	                requires: [ 'season', 'events' ],
	                returns: null,
	                func: function(params) { this.saveSeason(params.season, params.events); }.bind(instance)
	            },
	            getCurrentSeasonName: {
	                requires: [ 'date' ],
	                returns: 'seasonName',
	                func: function(params, callback) { this.getCurrentSeasonName(params.date, callback); }.bind(instance)
	            },
	            getSeasonNames: {
	                requires: [],
	                returns: 'seasonNames',
	                func: function(params, callback) { this.getSeasonNames(callback); }.bind(instance)
	            }
            }
	    });
    }

}
