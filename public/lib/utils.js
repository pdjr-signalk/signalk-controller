function loadHTML(container, url, classname, callback) {
    if (container) {
        httpGetAsync(url, (content) => {
            if (content) {
                container.innerHTML = content;
                if (classname) container.classname = classname;
                if (callback) callback(container);
            }
        });
    }
}

function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

function activateEventListeners(classname, eventtype, callback) {
    var elements = document.getElementsByClassName(classname);
    for (var i = 0; i < elements.length; i++) elements[i].addEventListener(eventtype, callback);
}
