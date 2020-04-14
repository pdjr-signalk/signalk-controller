/**
 * A CanonicalEvent represents a simple timestamped binary action (notionally
 * 'ON' or 'OFF' with the facility for storing and managing an associated (and
 * externally implemented) CRON action which will, presumably, implement the
 * actual event action at the defined moment.
 */ 
module.exports = class CanonicalEvent {

    constructor(date, action, job=null) {
        this.date = date;
        this.action = action;
        this.fallback = false;
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

    isFallback() {
        return(this.fallback);
    }

    setFallback(fallback) {
        this.fallback = fallback;
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
