import XMLHttpRequest from "xhr2"

const defaultProvider = "https://mainnet.tezrpc.me";

const node = {
    defaultProvider,
    xhrFactory: () => new XMLHttpRequest(),
    activeProvider: defaultProvider,
    debugMode: false,
    async: true,
    isZeronet: false,
    setDebugMode(t) {
      this.debugMode = t;
    },
    setProvider(u, z) {
      if (typeof z != "undefined") this.isZeronet = z;
      this.activeProvider = u;
    },
    resetProvider() {
      this.activeProvider = defaultProvider;
    },
    query(e, o, t) {
      if (typeof o === "undefined") {
        if (typeof t === "undefined") {
          t = "GET";
        } else o = {};
      } else {
        if (typeof t === "undefined") t = "POST";
      }
      return new Promise((resolve, reject) => {
        try {
          const http = this.xhrFactory();
          http.open(t, this.activeProvider + e, this.async);
          if (this.debugMode) console.log("Node call", e, o);
          http.onload = () => {
            if (http.status === 200) {
              if (http.responseText) {
                let r = JSON.parse(http.responseText);
                if (this.debugMode) console.log("Node response", e, o, r);
                if (typeof r.error !== "undefined") {
                  reject(r.error);
                } else {
                  if (typeof r.ok !== "undefined") r = r.ok;
                  resolve(r);
                }
              } else {
                reject("Empty response returned");
              }
            } else {
              if (http.responseText) {
                if (this.debugMode) console.log(e, o, http.responseText);
                reject(http.responseText);
              } else {
                if (this.debugMode) console.log(e, o, http.statusText);
                reject(http.statusText);
              }
            }
          };
          http.onerror = () => {
            if (this.debugMode) console.log(e, o, http.responseText);
            reject(http.statusText);
          };
          if (t === "POST") {
            http.setRequestHeader("Content-Type", "application/json");
            http.send(JSON.stringify(o));
          } else {
            http.send();
          }
        } catch (e) {
          reject(e);
        }
      });
    }
};

export default node
