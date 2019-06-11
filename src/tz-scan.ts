/// <reference path="tz-scan.d.ts"/>
/// <reference path="rpc.d.ts"/>

// @ts-ignore
import {XMLHttpRequest} from "w3c-xmlhttprequest"

var baseUrl = "https://api.alphanet.tzscan.io/v3";

export const tzScan = {
    baseUrl,
    xhrFactory: () => new XMLHttpRequest(),
    activeProvider: baseUrl,
    debugMode: false,
    async: true,
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
                if (this.debugMode) console.log("TzScan call", e, o);
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
            } catch (e) {
                reject(e)
            }
        })
    },
    getOperation(h: string): Promise<TzScanOperation> {
        return this.query(`/operation/${h}`);
    },
    getOperations(h: string, type: OperationType | string, page: number = 0, perPage: number = 50): Promise<TzScanOperation[]> {
        return this.query(`/operations/${h}?type=${type}&p=${page}&number=${perPage}`);
    }
};

