var OVERLAY_DICTIONARY = {};

FUNCTIONS = {

    openOverlay: function(target, params) {
        console.log("openOverlay(%s,%s)...", JSON.stringify(target), JSON.stringify(params));
        var overlay, overlayContainer, overlayOverlay, overlayCancel, currentContent;
	    if ((overlay = document.getElementById("overlay")) != null) {
            currentContent = overlay.getAttribute("data-current-content") || "";
	        overlay.style.display = "flex";
            if ((overlayContainer = document.getElementById("overlay-container")) != null) {
                overlayContainer.width = params.width || "70%";
                overlayContainer.minWidth = params.width || "70%";
                overlayContainer.height = params.height || "70%";
                overlayContainer.minHeight = params.height || "70%";
	            if (currentContent != params.overlay) {
	                loadHTML(overlayContainer, params.overlay, params.overlay, (container) => {
                        overlay.setAttribute("data-current-content", params.overlay);
                        walkTheDOM(container, (node) => {
                            if ((node.classList) && (node.classList.contains("button"))) activateElement(node, "click", FUNCTIONS);
                        });
	                    if (params["function"]) FUNCTIONS[params["function"]](target, params.params);
	                });
                }
            }
	    }
    
        function walkTheDOM(node, func) {
            func(node);
            node = node.firstChild;
            while (node) {
                walkTheDOM(node, func);
                node = node.nextSibling;
            }
        }
    },
    closeOverlay: function(target, params, extrafunction) {
        var overlay, overlayContainer;
        if ((overlay  = document.getElementById("overlay")) != null) {
            overlay.removeAttribute("data-current-content");
            overlay.style.display = "none";
            document.getElementById("overlay-container").innerHTML="";
        }
    },
    toggleOverlay: function(target, params, extrafunction) {
        if ((overlay.style.display == "none") || (overlay.style.display == "")) {
            FUNCTIONS.openOverlay(target, params, extrafunction);
        } else {
            FUNCTIONS.closeOverlay(target, params, extrafunction);
        }
    },
    expandContractOverlay: function(target, dictionary) {
        if (target.classList.contains("overlay-fullscreen")) {
            target.classList.remove("overlay-fullscreen");
        } else {
            target.classList.add("overlay-fullscreen");
        }
    },
    displaySensorLog: function(target, params) {
        console.log("displaySensorLog(%s,%s)...", JSON.stringify(target), JSON.stringify(params));
        OVERLAY_DICTIONARY = params;
        var buttons = document.getElementsByClassName("sensorlog-button");
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove("lcars-selected");
            if (buttons[i].id == OVERLAY_DICTIONARY.chart) buttons[i].classList.add("lcars-selected");
        };
        var img = document.getElementById("overlay-sensorlog");
        img.setAttribute("src", "/signalk-sensor-log/charts/" + OVERLAY_DICTIONARY.group + "." + OVERLAY_DICTIONARY.chart + ".svg");
    }
}
