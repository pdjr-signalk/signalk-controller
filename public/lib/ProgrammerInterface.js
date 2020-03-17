class ProgrammerInterface {

    static create(root) {
        if (typeof root === "string") root = document.getElementById(root);
        return((root)?(new ProgrammerInterface(root)):null);
    }

    constructor(root) {
        //console.log("ProgrammerInterface(%s)...", root);
        this.root = root;

        [...this.root.getElementsByClassName('button')].forEach(button => {
            if (button.classList.contains('radio')) {
                button.addEventListener('click', function(elem) {
                    alert(elem.target);
                    var group = elem.target.getAttribute('data-button-group');
                    var value = elem.target.getAttribute('data-button-value');
                    this.getSelectedElements("." + group).forEach(e => {
                        if (e.getAttribute('data-button-value') == value) {
                            e.classList.toggle('on');
                        } else {
                            e.classList.remove('on');
                        }
                    });
                }.bind(this));
            } else {
                button.addEventListener('click', function() {
                    this.classList.toggle('on');
                });
            }
        });
    }

    addEventListener(type, selector, callback) {
        (this.getSelectedElements(selector)).forEach(e => e.addEventListener(type, callback));
    }

    getValue(selector) {
        return(this.getSelectedElements(selector).reduce((a,e) => { return((e.classList.contains('on'))?e.getAttribute('data-button-value'):a); }, null));
    }

    getState(selector) {
        var ons = this.getSelectedElements(selector).filter(e => (e.classList.contains('on')));
        return(ons.length > 0);
    }

    setState(selector, state) {
        var elem = document.getElementById(selector);
        if (elem) {
            if (state) {
                document.getElementById(selector).classList.add('on');
            } else {
                document.getElementById(selector).classList.remove('on');
            }
        } else {
            [...this.root.getElementsByClassName(selector)].forEach(e => {
                if (state) {
                    e.classList.add('on');
                } else {
                    e.classList.remove('on');
                }
            });
        }
    }

    getSelectedElements(selector) {
        //console.log("getSelectedElements(%s)...", selector);
        var retval = null;
        switch (selector.charAt(0)) {
            case '#':
                var elem = document.getElementById(selector.substr(1));
                if (elem) retval = [elem];
                break;
            case '.':
                retval = [...document.getElementsByClassName(selector.substr(1))];
                break;
            default:
                break;
        }
        return((retval)?retval:[]);
    }

}
