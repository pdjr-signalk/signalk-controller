class RemoteStorage {

    static create() {
        return(new RemoteStorage());
    }

    constructor() {
        console.log("RemoteStorage()...");
        this.url = null;
        this.ws = null;
    }

   connect(url) {
        console.log("RemoteStorage.connect(%s)...", url);
        this.url = url;
        this.ws = new WebSocketR2(this.url); 
    }

    setItem(name, value) {
        console.log("RemoteStorage.setItem(%s,%s)...", name, value);
        if (this.ws != null) {
            this.ws.send({ action: "setItem", params: { name: name, value: value }});
        }
    }

    getItem(name, callback) {
        console.log("RemoteStorage.getItem(%s,%s)...", name, callback);
        if (this.ws != null) {
            this.ws.send({ action: "getItem", params: { name: name }}, callback);
        }
    }

    removeItem(name) {
        console.log("RemoteStorage.removeItem(%s)...", name);
        if (this.ws != null) {
            this.ws.send({ action: "removeItem", params: { name: name }});
        }
    }

}
