class Interface {
    
    static addEventListener(selector, eventType, handler) {
        if (selector.charAt(0) == '#') {
            var e = document.getElementById(selector.substr(1));
            if (e) e.addEventListener(eventType, function(e) { handler(e.target); }.bind(this));
        } else {
            [...document.getElementsByClassName(selector.substr(1))].forEach(e => e.addEventListener(eventType, function(e) { handler(e.target); }.bind(this)));
        }
    }

    static removeEventListener(selector, eventType, listener) {
        if (typeof selector != 'string') {
            selector.removeEventListener(eventType, listener);
        } else {
            switch (selector.charAt(0)) {
                case '#':
                    var e = document.getElementById(selector.substr(1));
                    if (e) e.addEventListener(eventType, function(e) { listener(e.target); }.bind(this));
                    break;
                case ".":
                    [...document.getElementsByClassName(selector.substr(1))].forEach(e => e.addEventListener(eventType, function(e) { listener(e.target); }.bind(this)));
                    break;
                default:
                    break;
            }
        }
    }

    static toggleClass(elem, className='on') {
        if (elem.classList.contains('radio')) {
            [...document.getElementsByClassName(elem.getAttribute('data-button-group'))].filter(e => (e != elem)).forEach(e => e.classList.remove(className));
            elem.classList.toggle(className);
        } else {
            elem.classList.toggle(className);
        }
        return(elem);
    }

    static getValueState(selector, classname='on') {
        var elem = selector;
        if (typeof selector == 'string') {
            switch (selector.charAt(0)) {
                case '#':
                    elem = document.getElementById(selector.substr(1));
                    break;
                case '.':
                    elem = [...document.getElementsByClassName(selector.substr(1))].filter(e => e.classList.contains(classname));
                    elem = (elem.length == 1)?elem[0]:null;
                    break;
                default:
                    elem = null;
                    break;
            }
        }
        return({ value: selector.getAttribute('data-button-value'), state: selector.classList.contains(classname) });
    }
    
        
    static processEvent(elem, className) {
        var retval = null;

        if ((elem.classList.contains('radio')) && (className)) {
            [...document.getElementsByClassName(elem.getAttribute('data-button-group'))].filter(e => (e != elem)).forEach(e => e.classList.remove(className));
            elem.classList.toggle(className);
        } else {
            elem.classList.toggle(className);
        }
        var retval = { value: undefined, state: undefined };
        retval.value = (className)?((elem.classList.contains(className))?elem.getAttribute('data-button-value'):null):elem.getAttribute('data-button-value');
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

    static getState(selector) {
        if (selector.charAt(0) == '#') {
            return(document.getElementById(selector.substr(1)).classList.contains('on'));
        }
    }

}
