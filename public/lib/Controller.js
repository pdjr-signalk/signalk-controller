class Controller {

    static create(options) {
        if (options.debug) console.log("Controller.create(%s)...", JSON.stringify(options));

        return(new Controller(options));
    }
    

    constructor(options) {
        if (options.debug) console.log("Controller(%s)...", JSON.stringify(options));

        if (!options.client) throw "Controller: signalk-controller client interface must be specified (options.client)";
        if (!options.channels) throw "Controller: controller channel definitions must be specified (options.channels)";
        if (!options.debug) options.debug = false;

        this.options = options;
        this.active = false;

        this.buildChannelButtonGroup(document.querySelector('#header'), this.options.channels);
        this.buildOverrideButtonGroups(document.querySelector('#popup'), this.options.channels);

        Interface.addEventListener('.channel-button', 'click', function(target) { this.channelClicked(target); }.bind(this));
        Interface.addEventListener('.mode-button', 'click', function(target) { this.modeClicked(target); }.bind(this));
        //this.programmerInterface.addEventListener('click', '.override-button', function() { this.overrideClicked(); }.bind(this));
    }

    activate(state) {
        this.active = state;
        if (this.active) {
            [...document.getElementsByClassName('channel-mode')].forEach(e => e.classList.remove('hidden'));
        } else {
            [...document.getElementsByClassName('channel-mode')].forEach(e => e.classList.add('hidden'));
        }
    }

    buildChannelButtonGroup(container, channels) {
        if (this.options.debug) console.log("Controller.buildChannelButtonGroup(%s,%s)...", container, channels);

        if ((container) && (channels)) {
            var leftElbow = document.createElement("div"); leftElbow.className = "lcars-elbow deep left-bottom";
            container.appendChild(leftElbow);
            channels.forEach(channel => {
                var button = document.createElement("div");
                button.id = channel.name + '-channel';
                button.className = "lcars-bar lcars-u-1 w3-theme-d1 horizontal deep top button channel-button radio notification " + channel.name + " widget-indicator";
                button.setAttribute("data-button-group", "channel-button");
                button.setAttribute("data-button-value", channel.name);
                button.setAttribute("data-signalk-path", channel.statePath);
                button.setAttribute("data-icon-url", channel.iconUrl);
                button.appendChild(document.createTextNode(channel.name.toUpperCase()));
                var mode = document.createElement("div");
                mode.id = channel.name + "-mode";
                mode.className = "signalk-dynamic channel-mode";
                mode.setAttribute("data-signalk-path", channel.modePath);
                mode.setAttribute("data-filter", "notification-value");
                button.appendChild(mode);
                var next = document.createElement("div"); mode.classList.add("signalk-dynamic");
                next.setAttribute("data-signalk-path", channel.nextPath);
                next.setAttribute("data-filter", "notification-value");
                button.appendChild(next);
                container.appendChild(button);
            });
            var padding = document.createElement("div"); padding.className = "lcars-bar horizontal deep top";
            container.appendChild(padding);
            var rightElbow = document.createElement("div"); rightElbow.className = "lcars-elbow deep right-bottom";
            container.appendChild(rightElbow);
        }
    }

    buildOverrideButtonGroups(container, channels) {
        if (this.options.debug) console.log("Controller.buildOverrideButtonGroups(%s,%s)...", container, channels);
       
        if ((container) && (channels)) {
            channels.forEach(channel => {
                if (channel.overrides.length) {
                    var table = document.createElement("div");
                    table.id = channel.name + "-override-button-group";
                    table.className = "table hidden override-button-group";
                    var row = document.createElement("div"); row.classList.add("table-row");
                    channel.overrides.forEach(override => {
                        var cell = document.createElement("div"); cell.classList.add("table-cell");
                        var button = document.createElement("div");
                        button.className = "btn button override-button radio notification " + override.name + " widget-indicator";
                        button.setAttribute("data-button-value", override.name);
                        button.setAttribute("data-signalk-path", override.path);
                        button.appendChild(document.createTextNode(override.name.toUpperCase()));
                        cell.appendChild(button);
                        row.appendChild(cell);
                    });
                    table.appendChild(row);
                    container.appendChild(table);
                }
            });
        }
    }

    channelClicked(elem) {
        if (this.options.debug) console.log("Controller.channelClicked(%s)...", elem);

        if (this.active) {
            var channel = Interface.processEvent(elem, 'on');
            if (channel) {
                var mode = document.getElementById(channel + "-mode").textContent.toLowerCase();
                this.openModePanel(channel, mode);
            } else {
                this.closeModePanel();
            }
        }
    }

    openModePanel(channel, mode) {
        if (this.options.debug) console.log("Controller.openModePanel(%s,%s)...", channel, mode);

        document.getElementById('popup').classList.add('slide-in');
        document.getElementById('popup').classList.remove('slide-out');
        [...document.getElementsByClassName('mode-button')].forEach(e => e.classList.remove('on'));
        document.querySelector('#popup #mode-button-' + mode).classList.add('on');
    }

    closeModePanel() {
        if (this.options.debug) console.log("Controller.closeModePanel()...");

        Interface.setState('channel-button', false);
        document.getElementById('popup').classList.add('slide-out');
        document.getElementById('popup').classList.remove('slide-in');
    }

    modeClicked(elem) {
        if (this.options.debug) console.log("modeClicked(%s)...", elem);
    
        var mode = Interface.processEvent(elem, 'on');
        if (mode) {
            var channel = Interface.getSelectedValue('channel-button');
            if (channel) {
                this.options.client.setChannelMode(channel, mode);
            }
        }
        this.closeModePanel();
    }

    overrideClicked() {
        if (this.options.debug) console.log("overrideClicked()...");

        var override = this.programmerInterface.getValue('.override-button');
        if (override) {
            this.options.client.toggleOverride(override);
            this.programmerInterface.setState('override-button', false);
        }
    }

}
