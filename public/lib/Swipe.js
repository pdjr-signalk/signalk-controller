class Swipe {

	constructor(options={}) { 
        if ((options) && (options.debug)) console.log("Swipe(%s)...", JSON.stringify(options));

        if (!options.container) options.container = 'pages';
        if (typeof options.container == 'string') options.container = document.getElementById(options.container);
        if (!options.container) throw "Swipe: bad container specification (options.container)";
        if ((options.callback) && (typeof options.callback != 'function')) throw "Swipe: callback is not a function (options.callback)";
        if (!options.left) options.left = 'swipe-left-button';
        if ((options.left) && (typeof options.left == 'string')) options.left = document.getElementById(options.left);
        if ((options.right) && (typeof options.right == 'string')) options.right = document.getElementById(options.right);
        if (options.debug) options.debug = false;
        
        this.options = options;
        this.touch = { startX: 0, startY: 0, endX: 0, endY: 0 };

        [...this.options.container.children].forEach(child => child.classList.add('hidden'));
        this.options.container.firstElementChild.classList.remove("hidden");

        document.addEventListener('touchstart', function(event) {
            this.touch.startX = event.changedTouches[0].screenX;
            this.touch.startY = event.changedTouches[0].screenY;
        }.bind(this), false);

        document.addEventListener('touchend', function(event) {
            this.touch.endX = event.changedTouches[0].screenX;
            this.touch.endY = event.changedTouches[0].screenY;
            this.handleGesture();
        }.bind(this), false); 

        if (this.options.left) this.options.left.addEventListener('click', this.swipeLeft);
        if (this.options.right) this.options.right.addEventListener('click', this.swipeRight);
    }

    handleGesture() {
        if (this.options.debug) console.log("Swipe.handleGesture()...");

        if ((this.touch.endX < this.touch.startX) && (this.touch.startX - this.touch.endX) > 200) this.swipeLeft();
        if ((this.touch.endX > this.touch.startX) && (this.touch.endX - this.touch.startX) > 200) this.swipeRight();
    }

    swipeLeft() {
        alert("left");
        if (this.options.debug) console.log("Swipe.swipeLeft()...");
    }

    swipeRight() {
        if (this.options.debug) console.log("Swipe.swipeRight()...");

        if ((!this.options.callback) || (this.options.callback(this.touch))) {
            var target = -1;
            var children = this.options.container.children;
            for (var i = 0; i < children.length; i++) {
                if (!children[i].classList.contains("hidden")) { target = i; children[i].classList.add("hidden"); }
            }; 
            children[(((target + 1) < children.length)?(target + 1):0)].classList.remove("hidden");
        }
    }

}
