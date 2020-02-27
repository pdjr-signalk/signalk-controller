const Programme = require("./Programme.js");

module.exports = class Schedule extends Programme {

    /**
     * Factory method to make a new Schedule instance.
     * @param options - a configuration object (see constructor).
     * @returns - new Schedule instance or null on error.
     */
    static create(options) {
        if (options.debug) console.log("Schedule.create(%s)...", JSON.stringify(options));

        try { return(new Schedule(options)); } catch(e) { return(null); }
    }

    /**
     * Construct a new Schedule instance.
     * @param options - a configuration object with the following attributes.
     * @attr storage - required persistent storage object supporting the localStorage interface.
     * @attr debug - optional boolean requesting or disabling (default) debug output to console.log.
     * @returns - new Schedule instance.
     */
    constructor(options) {
        if (options.debug) console.log("Schedule(%s)...", options);

        if (!options.storage) throw "configuration error: storage must be specified";
        options.debug = (options.debug)?options.debug:false;

        super({ storage: options.storage, debug: options.debug });

        this.options = options;
        this.schedule = require("node-schedule");
    }

    /**
     * Schedules a callback for execution at some future date.
     * @param date - Date object specifiying the moment when <callback> should be invoked.
     * @param callback - function to be invoked.
     * @returns - Job instance defining the scheduled task.
     */
    scheduleJob(date, callback) {
        return(this.schedule.scheduleJob(date, callback));
    }

    /**
     * Cancels a previously scheduled job.
     * @param job - Job instance specifying the callback to be cancelled.
     * @returns - null.
     */ 
    cancelJob(job) {
        if (job) job.cancel;
        return(null);
    }

    getCanonicalEventsForChannelWeek(channel, date, callback) {
        if (this.options.debug) console.log("Schedule.getCanonicalEvents(%s,%s,%s)...", channel, date, callback);

        super.getEventsForWeek(date, function(events) {
            var canonicalEvents = events
                .filter(e => (e.channel == channel))
                .reduce((a,e) => {
                    a.push(this.createCanonicalEvent('ON', e.start));
                    a.push(this.createCanonicalEvent('OFF', e.end ));
                    return(a);
                }, [])
                .sort((a,b) => ((a.date < b.date)?-1:((a.date > b.date)?1:0)));
            callback(channel, canonicalEvents);
        }.bind(this));
    }

    createCanonicalEvent(action, date, job=null) {
        return({ action: action, date: date, job: job });
    }

}
