/**
 * A CanonicalEvent represents a simple timestamped binary action (notionally
 * 'ON' or 'OFF' with the facility for storing and managing an associated (and
 * externally implemented) CRON action which will, presumably, implement the
 * actual event action at the defined moment.
 */ 
module.exports = class CanonicalEvent {

    /**
     * Factory method for creating a new CanonicalEvent.
     * @param date - timestamp of the event.
     * @param action - the action associated with the event.
     * @param job - an optional CRON task to be associated with the event.
     * @returns - a new CanonicalEvent or null on error.
     */
    static create(date, action, job=null) {
        return(new CanonicalEvent(date, action, job));
    }

    /**
     * Creates a new CanonicalEvent (see create() method for details).
     */
    constructor(date, action, job=null) {
        this.date = date;
        this.action = action;
        this.job = job;
    }

    getDate() {
        return(this.date);
    }

    getAction() {
        return(this.callback);
    }

    getJob() {
        return(this.job);
    }

    schedule(job) {
        this.job = job;
        return(this);
    }

    cancel() {
        if (this.job) { this.job.cancel(); this.job = null; }
        return(this);
    }

}
