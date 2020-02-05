class Notifier {

    constructor(parentNode, options) {
        this.parentNode = parentNode;
        this.options = JSON.parse(options);
        this.parentNode.addClass("widget-notifications");
    }

    updateFunction(v) {
        if (v.state == "alert") {
            var hash = this.hashCode(v.message + v.timestamp);
            if (this.notificationExists(hash) == null) {
                var notification = document.createElement("div");
                div.addClass("widget-notification");
                div.addAttribute("hash", hash);
                div.addAttribute("method", v.method); 
                var message = document.createTextNode(v.message);
                notification.appendChild(message);
                this.parentNode.appendChild(notification);
            } else {
            }
        }
    }
                    
        
    notificationExists(hash) {
        var found = null;
        var notifications = this.parentNode.children;
        for (var i = 0; ((i < notifications.length) && (!found)); i++) {
            var childHash = notifications[i].getAttribute("hash");
            if ((childHash) && (hash == childHash)) found = notifications[i];
        });
        return(found);
    }
        
    static hashCode(str) {
        var hash = 0;
        if (str.length == 0) return hash;
        for (i = 0; i < str.length; i++) {
            char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return(hash);
    }
    
}

