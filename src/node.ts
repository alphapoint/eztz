// @ts-ignore
import {XMLHttpRequest} from "w3c-xmlhttprequest"

const defaultProvider = "https://mainnet.tezrpc.me";

export const node = {
    defaultProvider,
    xhrFactory: () => new XMLHttpRequest(),
    activeProvider: defaultProvider,
    debugMode: false,
    async: true,
    isZeronet: false,
    setDebugMode(t: boolean): void {
        this.debugMode = t;
    },
    setProvider(u: string, z?: boolean): void {
        if (typeof z != "undefined") this.isZeronet = z;
        this.activeProvider = u;
    },
    resetProvider(): void {
        this.activeProvider = defaultProvider;
    },
    query(e: string, o?: object | string, t?: any): Promise<any> {
        if (typeof o === "undefined") {
            if (typeof t === "undefined") {
                t = "GET";
            } else o = {};
        } else {
            if (typeof t === "undefined") t = "POST";
        }
        return new Promise((resolve, reject) => {
            try {
                const xhr = this.xhrFactory();
                xhr.open(t, this.activeProvider + e, this.async);
                if (this.debugMode) console.log("Node call", e, o);
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        if (xhr.responseText) {
                            let r = JSON.parse(xhr.responseText);
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
                        if (xhr.responseText) {
                            if (this.debugMode) console.log(e, o, xhr.responseText);
                            reject(xhr.responseText);
                        } else {
                            if (this.debugMode) console.log(e, o, xhr.statusText);
                            reject(xhr.statusText);
                        }
                    }
                };
                xhr.onerror = () => {
                    if (this.debugMode) console.log(e, o, xhr.responseText);
                    reject(xhr.statusText);
                };
                if (t === "POST") {
                    xhr.setRequestHeader("Content-Type", "application/json");
                    xhr.send(JSON.stringify(o));
                } else {
                    xhr.send();
                }
            } catch (e) {
                reject(e);
            }
        });
    }
};
