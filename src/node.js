if (typeof Buffer == "undefined") Buffer = require("buffer/").Buffer;
if (typeof XMLHttpRequest == "undefined") XMLHttpRequest = require("xhr2");

const defaultProvider = "https://mainnet.tezrpc.me/";

const node = {
    defaultProvider,
    activeProvider: defaultProvider,
    debugMode: false,
    async: true,
    isZeronet: false,
    setDebugMode: function(t) {
      node.debugMode = t;
    },
    setProvider: function(u, z) {
      if (typeof z != "undefined") node.isZeronet = z;
      node.activeProvider = u;
    },
    resetProvider: function() {
      node.activeProvider = defaultProvider;
    },
    query: function(e, o, t) {
      if (typeof o === "undefined") {
        if (typeof t === "undefined") {
          t = "GET";
        } else o = {};
      } else {
        if (typeof t === "undefined") t = "POST";
      }
      return new Promise(function(resolve, reject) {
        try {
          const http = new XMLHttpRequest();
          http.open(t, node.activeProvider + e, node.async);
          if (node.debugMode) console.log("Node call", e, o);
          http.onload = function() {
            if (http.status === 200) {
              if (http.responseText) {
                let r = JSON.parse(http.responseText);
                if (node.debugMode) console.log("Node response", e, o, r);
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
                if (node.debugMode) console.log(e, o, http.responseText);
                reject(http.responseText);
              } else {
                if (node.debugMode) console.log(e, o, http.statusText);
                reject(http.statusText);
              }
            }
          };
          http.onerror = function() {
            if (node.debugMode) console.log(e, o, http.responseText);
            reject(http.statusText);
          };
          if (t == "POST") {
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
}

export default node