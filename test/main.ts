// non-file scope variable names
import { node } from '../src';

describe('eztz.node', () => {
  test('should have activeProvider set to defaultProvider', () => {
    expect(node.activeProvider).toBe(node.defaultProvider);
  });

  test('should provide setProvider method to be able to configure defaultProvider', () => {
    const previousProvider = node.activeProvider;
    const newProvider = 'http://example.com/rpc';
    node.setProvider(newProvider);
    expect(node.activeProvider).toBe(newProvider);
    expect(node.activeProvider).not.toBe(previousProvider);
  });

  test('should provide resetProvider method', () => {
    const defaultProvider = node.activeProvider;
    const newProvider = 'http://example.com/rpc';
    node.setProvider(newProvider);
    expect(node.activeProvider).toBe(newProvider);
    node.resetProvider();
    expect(node.activeProvider).not.toBe(defaultProvider);
  });
});
