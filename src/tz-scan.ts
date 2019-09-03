import fetch from 'cross-fetch';
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import { XMLHttpRequest } from 'w3c-xmlhttprequest';
import { OperationKind, OperationType, TzScanAccountStatus, TzScanOperationEnvelope, TzScanOperationEnvelopeOf } from './types';

const baseUrl = 'https://api6.tzscan.io';

export const tzScan = {
  xhrFactory() {
    return new XMLHttpRequest();
  },
  activeProvider: baseUrl,
  debugMode: false,
  async: true,

  getOperationType(kind: OperationKind): OperationType {
    return (kind.charAt(0).toUpperCase() + kind.substr(1)) as OperationType;
  },

  getOperationKind(type: OperationType): OperationKind {
    return type.toLowerCase() as OperationKind;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query(uri: string, d?: object | string, t?: any, versionPrefx = 'v3'): Promise<any> {
    let data: object | string | undefined;
    let m: string | undefined;
    if (d === undefined) {
      if (t === undefined) {
        m = 'GET';
      } else {
        data = {};
      }
    } else if (t === undefined) m = 'POST';

    const options: RequestInit = { method: m };

    if (this.debugMode) console.debug('TzScan request:', uri, data);

    if (t === 'POST') {
      options.headers = { 'Content-Type': 'application/json' };
      if (d !== undefined) options.body = JSON.stringify(d);
    }

    const fetched = await fetch(`${this.activeProvider}/${versionPrefx}${uri}`, options);

    if (fetched.status !== 200) {
      console.error('TzScan error:', uri, d, fetched.status, fetched.statusText);
      if (this.debugMode) console.error('TzScan error body:', await fetched.text());

      throw new Error(fetched.statusText);
    }

    const r = await fetched.json();
    if (this.debugMode) console.debug('TzScan response:', uri, d, r);

    return r;
  },
  getOperation(h: string): Promise<TzScanOperationEnvelope> {
    return this.query(`/operation/${h}`);
  },
  getOperations<T extends OperationKind>(h: string, type: T, page = 0, perPage = 50): Promise<TzScanOperationEnvelopeOf<T>[]> {
    return this.query(`/operations/${h}?type=${this.getOperationType(type)}&p=${page}&number=${perPage}`);
  },
  getAccountStatus(h: string): Promise<TzScanAccountStatus> {
    return this.query(`/account_status/${h}`);
  }
};
