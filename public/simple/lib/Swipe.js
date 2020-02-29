
class Swipe {

	constructor(containerId, callback, options) {
        //console.log("Swipe(%s,callback,%s)...", containerId, JSON.stringify(options));
        this.containerId = containerId;
        this.callback = callback;
        this.options = options;
        this.touch = { startX: 0, startY: 0, endX: 0, endY: 0 };

        this.container = null;

        var containerId;

        if ((this.containerId) && (this.container = document.getElementById(this.containerId))) {
            [...this.container.children].forEach(child => child.classList.add('hidden'));
            this.container.firstElementChild.classList.remove("hidden");

            var _touch = this.touch;
            var _handleGesture = this.handleGesture;
            var _container = this.container;

            this.container.addEventListener('touchstart', function(event) {
                _touch.startX = event.changedTouches[0].screenX;
                _touch.startY = event.changedTouches[0].screenY;
            }, false);

            this.container.addEventListener('touchend', function(event) {
                _touch.endX = event.changedTouches[0].screenX;
                _touch.endY = event.changedTouches[0].screenY;
                _handleGesture(_container, _touch);
            }, false); 

            if (options) {
                if (options.rightButton) {
                    this.registerFallback(options.rightButton, this.swipeRight);
                }
                if (options.leftButton) {
                    this.registerFallback(options.leftButton, this.swipeLeft);
                }
            }
        }
    
    }

    registerFallback(classname, callback) {
        console.log("registerFallback(%s,callback)...", classname);
        var _callback = callback;
        var _container = this.container;
        var elements = document.getElementsByClassName(classname);
        [...elements].forEach(element => element.addEventListener('click', function() { _callback(_container); }));
    } 

    handleGesture(container, touch) {
        console.log("handleGesture()...");
        if (touch.endX < touch.startX) { this.swipeLeft(container); }
        if (touch.endX >= touch.startX) { this.swipeRight(container); }
    }

    swipeLeft(container) {
        console.log("swipeLeft()...");
    }

    swipeRight(container) {
        console.log("swipeRight()...");
        var target = -1;
        if (container) {
            var children = container.children;
            for (var i = 0; i < children.length; i++) {
                if (!children[i].classList.contains("hidden")) { target = i; children[i].classList.add("hidden"); }
            }; 
            children[(((target + 1) < children.length)?(target + 1):0)].classList.remove("hidden");
        }
    }

}
