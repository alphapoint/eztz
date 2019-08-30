// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
import MockXHR from 'mock-xmlhttprequest';
import { node } from '../src';

describe('eztz', () => {
  describe('node', () => {
    test('query on error', async () => {
      const mockXhrProvider = MockXHR.newServer({
        post: [
          'https://mainnet.tezrpc.me/test',
          {
            status: 500,
            statusText: 'test'
          }
        ]
      });
      mockXhrProvider.setDefaultHandler((xhr: Request) => {
        throw new Error(`${xhr.method} ${xhr.url}\n${xhr.body}`);
      });
      node.xhrFactory = mockXhrProvider.xhrFactory;

      // noinspection ES6MissingAwait
      const p = node.query('/test', {});

      return expect(p).rejects.toEqual('test');
    });

    test('query on 200 error', async () => {
      const mockXhrProvider = MockXHR.newServer({
        get: [
          'https://mainnet.tezrpc.me/test',
          {
            status: 200,
            body: JSON.stringify({ error: 'err' })
          }
        ]
      });
      mockXhrProvider.setDefaultHandler((xhr: Request) => {
        throw new Error(`${xhr.method} ${xhr.url}\n${xhr.body}`);
      });
      node.xhrFactory = mockXhrProvider.xhrFactory;

      const p = node.query('/test');

      return expect(p).rejects.toEqual('err');
    });

    test('query on 200 empty response', async () => {
      const mockXhrProvider = MockXHR.newServer({
        get: [
          'https://mainnet.tezrpc.me/test',
          {
            status: 200,
            body: ''
          }
        ]
      });
      mockXhrProvider.setDefaultHandler((xhr: Request) => {
        throw new Error(`${xhr.method} ${xhr.url}\n${xhr.body}`);
      });
      node.xhrFactory = mockXhrProvider.xhrFactory;

      // noinspection ES6MissingAwait
      const p = node.query('/test');

      return expect(p).rejects.toEqual('Empty response returned');
    });

    test('query on 200 empty response without', async () => {
      const mockXhrProvider = MockXHR.newServer({
        get: [
          'https://mainnet.tezrpc.me/test',
          {
            status: 200,
            body: JSON.stringify({ test: 'test' })
          }
        ]
      });
      mockXhrProvider.setDefaultHandler((xhr: Request) => {
        throw new Error(`${xhr.method} ${xhr.url}\n${xhr.body}`);
      });
      node.xhrFactory = mockXhrProvider.xhrFactory;

      // noinspection ES6MissingAwait
      const p = node.query('/test');

      return expect(p).resolves.toEqual({
        test: 'test'
      });
    });

    test('query on 200 ok', async () => {
      const mockXhrProvider = MockXHR.newServer({
        get: [
          'https://mainnet.tezrpc.me/test',
          {
            status: 200,
            body: JSON.stringify({ ok: 'ok' })
          }
        ]
      });
      mockXhrProvider.setDefaultHandler((xhr: Request) => {
        throw new Error(`${xhr.method} ${xhr.url}\n${xhr.body}`);
      });
      node.xhrFactory = mockXhrProvider.xhrFactory;

      const p = node.query('/test');

      return expect(p).resolves.toEqual('ok');
    });

    test('query non 200', async () => {
      const mockXhrProvider = MockXHR.newServer({
        get: [
          'https://mainnet.tezrpc.me/test',
          {
            status: 400,
            statusText: 'err'
          }
        ]
      });
      mockXhrProvider.setDefaultHandler((xhr: Request) => {
        throw new Error(`${xhr.method} ${xhr.url}\n${xhr.body}`);
      });
      node.xhrFactory = mockXhrProvider.xhrFactory;

      // noinspection ES6MissingAwait
      const p = node.query('/test');

      return expect(p).rejects.toEqual('err');
    });
  });
});
