public class SchedulerWeek {

    parse(string) {
        var retval = null;
        try {
            obj = JSON.parse(string);
            if ((obj.id) && (obj.events)) {
                var events = 
                retval = new SchedulerWeek(obj.id, obj.events);
            }
        } catch(e) { }
        return(retval);
    }

    constructor(id, events) {
        this.id = id;
        this.events = events;
    }

    getId() {
        return(this.id);
    }

    getEvents() {
        return(this.events);
    }

    toString() {
        return(JSON.stringify({ "id": id, "events": this.events }));
    }
}
