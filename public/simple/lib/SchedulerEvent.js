ublic class SchedulerEvent {

    static parse(string) {
        var retval = null;
        try {
            var obj = JSON.parse(string);
            if ((obj.type) && (obj.start) && (obj.end)) {
                retval = new SchedulerEvent(obj.type, obj.start, obj.end);
            }
        catch(e) { }
        return(retval);
    }

    static toString() {
        return(JSON.stringify({ "type": this.type, "start": this.start, "end": this.end }));
    }

}
