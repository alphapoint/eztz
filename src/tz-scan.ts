/// <reference path="tz-scan.d.ts"/>
/// <reference path="rpc.d.ts"/>

// @ts-ignore
import {XMLHttpRequest} from "w3c-xmlhttprequest"
import fetch from 'cross-fetch';

var baseUrl = "https://api.alphanet.tzscan.io/v3";

export const tzScan = {
    baseUrl,
    xhrFactory: () => new XMLHttpRequest(),
    activeProvider: baseUrl,
    debugMode: false,
    async: true,

    getOperationType(kind : OperationKind) : OperationType {
        return <OperationType> (kind.charAt(0).toUpperCase() + kind.substr(1));
    },

    getOperationKind(type : OperationType) : OperationKind {
        return <OperationKind> type.toLowerCase();
    },

    async query(e: string, o?: object | string, t?: any): Promise<any> {
        if (o === undefined) {
            if (t === undefined) {
                t = "GET";
            } else {
                o = {};
            }
        } else {
            if (t === undefined)
                t = "POST";
        }

        const options: RequestInit = {
            method: t
        };

        if (this.debugMode)
            console.debug("TzScan request:", e, o);

        if (t === "POST") {
            options.headers = {'Content-Type': 'application/json'};
            if (o !== undefined)
                options.body = JSON.stringify(o);
        }

        const fetched = await fetch(this.activeProvider + e, options);

        if (fetched.status !== 200) {
            console.error("TzScan error:", e, o, fetched.status, fetched.statusText);
            if (this.debugMode)
                console.error("TzScan error body:", await fetched.text());

            throw new Error(fetched.statusText);
        }

        const r = await fetched.json();
        if (this.debugMode)
            console.debug("TzScan response:", e, o, r);

        return r;
    },
    getOperation(h: string): Promise<TzScanOperationEnvelope> {
        return this.query(`/operation/${h}`);
    },
    getOperations<T extends OperationKind>(h: string, type: T, page: number = 0, perPage: number = 50): Promise<TzScanOperationEnvelopeOf<T>[]> {
        return this.query(`/operations/${h}?type=${this.getOperationType(type)}&p=${page}&number=${perPage}`);
    },
    getAccountStatus(h: string): Promise<TzScanAccountStatus> {
        return this.query(`/account_status/${h}`);
    }
};

