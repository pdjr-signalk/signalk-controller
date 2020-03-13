class Interface {
    
    static addEventListener(selector, eventType, handler) {
        if (selector.charAt(0) == '#') {
            var e = document.getElementById(selector.substr(1));
            if (e) e.addEventListener(eventType, function(e) { handler(e.target); }.bind(this));
        } else {
            [...document.getElementsByClassName(selector.substr(1))].forEach(e => e.addEventListener(eventType, function(e) { handler(e.target); }.bind(this)));
        }
    }

    static processEvent(elem, className) {
        var retval = null;

        if ((elem.classList.contains('radio')) && (className)) {
            [...document.getElementsByClassName(elem.getAttribute('data-button-group'))].filter(e => (e != elem)).forEach(e => e.classList.remove(className));
            elem.classList.toggle(className);
        } else {
            elem.classList.toggle(className);
        }
        return((className)?((elem.classList.contains(className))?elem.getAttribute('data-button-value'):null):elem.getAttribute('data-button-value'));
    }

    static getSelectedValue(classname) {
        var retval = null;
        var elems = [...document.getElementsByClassName(classname)].filter(e => e.classList.contains('on'));
        if (elems.length == 1) retval = elems[0].getAttribute('data-button-value');
        return(retval);
    }

    static setState(classname, state) {
        [...document.getElementsByClassName(classname)].forEach(e => {
            if (state) e.classList.add('on'); else e.classList.remove('on');
        });
    }

}
