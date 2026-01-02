import * as assert from 'assert';
import { isRpcCall, exposeApi, Webview } from '../shared/rpc';

function createMockWebview(): Webview & {
    messages: unknown[];
    listener: ((e: unknown) => void) | null;
    disposed: boolean;
} {
    const mock = {
        messages: [] as unknown[],
        listener: null as ((e: unknown) => void) | null,
        disposed: false,
        postMessage(message: unknown): Thenable<boolean> {
            this.messages.push(message);
            return Promise.resolve(true);
        },
        onDidReceiveMessage(listener: (e: unknown) => void): { dispose(): void } {
            this.listener = listener;
            return {
                dispose: () => {
                    mock.disposed = true;
                    mock.listener = null;
                }
            };
        }
    };
    return mock;
}

suite('RPC Module Test Suite', () => {
    suite('isRpcCall()', () => {
        test('returns true for valid RPC call with all fields', () => {
            const msg = {
                type: 'rpc-call',
                id: 'test-id',
                method: 'testMethod',
                args: [1, 2, 3]
            };
            assert.strictEqual(isRpcCall(msg), true);
        });

        test('returns true for RPC call with null id (fire-and-forget)', () => {
            const msg = {
                type: 'rpc-call',
                id: null,
                method: 'testMethod',
                args: []
            };
            assert.strictEqual(isRpcCall(msg), true);
        });

        test('returns true for RPC call with empty args', () => {
            const msg = {
                type: 'rpc-call',
                id: 'test-id',
                method: 'testMethod',
                args: []
            };
            assert.strictEqual(isRpcCall(msg), true);
        });

        test('returns false for null', () => {
            assert.strictEqual(isRpcCall(null), false);
        });

        test('returns false for undefined', () => {
            assert.strictEqual(isRpcCall(undefined), false);
        });

        test('returns false for primitive string', () => {
            assert.strictEqual(isRpcCall('rpc-call'), false);
        });

        test('returns false for primitive number', () => {
            assert.strictEqual(isRpcCall(42), false);
        });

        test('returns false for primitive boolean', () => {
            assert.strictEqual(isRpcCall(true), false);
        });

        test('returns false for array', () => {
            assert.strictEqual(isRpcCall(['rpc-call']), false);
        });

        test('returns false for empty object', () => {
            assert.strictEqual(isRpcCall({}), false);
        });

        test('returns false for object with wrong type value', () => {
            const msg = {
                type: 'rpc-result',
                id: 'test-id',
                method: 'testMethod',
                args: []
            };
            assert.strictEqual(isRpcCall(msg), false);
        });

        test('returns false for object with type as number', () => {
            const msg = {
                type: 123,
                id: 'test-id',
                method: 'testMethod',
                args: []
            };
            assert.strictEqual(isRpcCall(msg), false);
        });

        test('returns false for object without type property', () => {
            const msg = {
                id: 'test-id',
                method: 'testMethod',
                args: []
            };
            assert.strictEqual(isRpcCall(msg), false);
        });

        test('returns false for object with undefined type', () => {
            const msg = {
                type: undefined,
                id: 'test-id',
                method: 'testMethod',
                args: []
            };
            assert.strictEqual(isRpcCall(msg), false);
        });
    });

    suite('exposeApi()', () => {
        suite('message handling', () => {
            test('ignores non-RPC messages', async () => {
                const webview = createMockWebview();
                const impl = { test: () => 'result' };
                
                exposeApi(webview, impl);
                
                webview.listener?.({ type: 'other-message' });
                webview.listener?.('string message');
                webview.listener?.(null);
                webview.listener?.(42);
                
                await new Promise(resolve => setTimeout(resolve, 10));
                assert.strictEqual(webview.messages.length, 0);
            });

            test('returns dispose function that unregisters listener', () => {
                const webview = createMockWebview();
                const impl = { test: () => 'result' };
                
                const { dispose } = exposeApi(webview, impl);
                
                assert.notStrictEqual(webview.listener, null);
                assert.strictEqual(webview.disposed, false);
                
                dispose();
                
                assert.strictEqual(webview.disposed, true);
                assert.strictEqual(webview.listener, null);
            });
        });

        suite('method not found', () => {
            test('sends error for unknown method when id is present', async () => {
                const webview = createMockWebview();
                const impl = { existingMethod: () => 'result' };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'unknownMethod',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-error',
                    id: 'req-1',
                    error: 'Method "unknownMethod" not found'
                });
            });

            test('silently ignores unknown method when id is null (fire-and-forget)', async () => {
                const webview = createMockWebview();
                const impl = { existingMethod: () => 'result' };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: null,
                    method: 'unknownMethod',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 0);
            });
        });

        suite('successful method calls', () => {
            test('calls method and returns result', async () => {
                const webview = createMockWebview();
                const impl = {
                    add: (a: number, b: number) => a + b
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'add',
                    args: [2, 3]
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-result',
                    id: 'req-1',
                    result: 5
                });
            });

            test('calls method with no arguments', async () => {
                const webview = createMockWebview();
                const impl = {
                    getConstant: () => 42
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'getConstant',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-result',
                    id: 'req-1',
                    result: 42
                });
            });

            test('handles async method returning promise', async () => {
                const webview = createMockWebview();
                const impl = {
                    asyncAdd: async (a: number, b: number) => {
                        await new Promise(resolve => setTimeout(resolve, 5));
                        return a + b;
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'asyncAdd',
                    args: [10, 20]
                });
                
                await new Promise(resolve => setTimeout(resolve, 50));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-result',
                    id: 'req-1',
                    result: 30
                });
            });

            test('handles method returning object', async () => {
                const webview = createMockWebview();
                const impl = {
                    getData: () => ({ name: 'test', value: 123 })
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'getData',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-result',
                    id: 'req-1',
                    result: { name: 'test', value: 123 }
                });
            });

            test('handles method returning null', async () => {
                const webview = createMockWebview();
                const impl = {
                    getNullable: () => null
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'getNullable',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-result',
                    id: 'req-1',
                    result: null
                });
            });

            test('handles method returning undefined', async () => {
                const webview = createMockWebview();
                const impl = {
                    doSomething: () => undefined
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'doSomething',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-result',
                    id: 'req-1',
                    result: undefined
                });
            });

            test('does not send result for fire-and-forget calls (null id)', async () => {
                const webview = createMockWebview();
                let called = false;
                const impl = {
                    fireAndForget: () => {
                        called = true;
                        return 'result';
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: null,
                    method: 'fireAndForget',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(called, true);
                assert.strictEqual(webview.messages.length, 0);
            });
        });

        suite('error handling', () => {
            test('sends error when method throws Error', async () => {
                const webview = createMockWebview();
                const impl = {
                    throwError: () => {
                        throw new Error('Test error message');
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'throwError',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-error',
                    id: 'req-1',
                    error: 'Test error message'
                });
            });

            test('sends error when method throws string', async () => {
                const webview = createMockWebview();
                const impl = {
                    throwString: () => {
                        throw 'String error';
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'throwString',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-error',
                    id: 'req-1',
                    error: 'String error'
                });
            });

            test('sends error when method throws number', async () => {
                const webview = createMockWebview();
                const impl = {
                    throwNumber: () => {
                        throw 404;
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'throwNumber',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-error',
                    id: 'req-1',
                    error: '404'
                });
            });

            test('sends error when async method rejects with Error', async () => {
                const webview = createMockWebview();
                const impl = {
                    asyncReject: async () => {
                        throw new Error('Async error');
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'asyncReject',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-error',
                    id: 'req-1',
                    error: 'Async error'
                });
            });

            test('sends error when async method rejects with string', async () => {
                const webview = createMockWebview();
                const impl = {
                    asyncRejectString: async () => {
                        throw 'Rejected with string';
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'asyncRejectString',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-error',
                    id: 'req-1',
                    error: 'Rejected with string'
                });
            });

            test('does not send error for fire-and-forget calls when method throws', async () => {
                const webview = createMockWebview();
                const impl = {
                    throwError: () => {
                        throw new Error('Error in fire-and-forget');
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: null,
                    method: 'throwError',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 0);
            });
        });

        suite('non-function properties', () => {
            test('sends error when property exists but is not a function', async () => {
                const webview = createMockWebview();
                const impl = {
                    notAFunction: 'just a string',
                    alsoNotAFunction: 42
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'notAFunction',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 1);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-error',
                    id: 'req-1',
                    error: '"notAFunction" is not a function'
                });
            });

            test('does not send error for non-function when id is null', async () => {
                const webview = createMockWebview();
                const impl = {
                    notAFunction: 'just a string'
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: null,
                    method: 'notAFunction',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 0);
            });
        });

        suite('this context', () => {
            test('preserves this context when calling methods', async () => {
                const webview = createMockWebview();
                const impl = {
                    value: 100,
                    getValue() {
                        return this.value;
                    },
                    addToValue(n: number) {
                        return this.value + n;
                    }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'getValue',
                    args: []
                });
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-2',
                    method: 'addToValue',
                    args: [50]
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 2);
                assert.deepStrictEqual(webview.messages[0], {
                    type: 'rpc-result',
                    id: 'req-1',
                    result: 100
                });
                assert.deepStrictEqual(webview.messages[1], {
                    type: 'rpc-result',
                    id: 'req-2',
                    result: 150
                });
            });
        });

        suite('multiple concurrent calls', () => {
            test('handles multiple calls correctly', async () => {
                const webview = createMockWebview();
                const impl = {
                    multiply: (a: number, b: number) => a * b,
                    divide: (a: number, b: number) => a / b
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'multiply',
                    args: [6, 7]
                });
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-2',
                    method: 'divide',
                    args: [100, 4]
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 2);
                
                const results = webview.messages as Array<{ id: string; result: number }>;
                const req1Result = results.find(m => m.id === 'req-1');
                const req2Result = results.find(m => m.id === 'req-2');
                
                assert.strictEqual(req1Result?.result, 42);
                assert.strictEqual(req2Result?.result, 25);
            });

            test('handles mix of success and error calls', async () => {
                const webview = createMockWebview();
                const impl = {
                    succeed: () => 'ok',
                    fail: () => { throw new Error('failed'); }
                };
                
                exposeApi(webview, impl);
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-1',
                    method: 'succeed',
                    args: []
                });
                
                webview.listener?.({
                    type: 'rpc-call',
                    id: 'req-2',
                    method: 'fail',
                    args: []
                });
                
                await new Promise(resolve => setTimeout(resolve, 10));
                
                assert.strictEqual(webview.messages.length, 2);
                
                const messages = webview.messages as Array<{ type: string; id: string }>;
                const successMsg = messages.find(m => m.id === 'req-1');
                const errorMsg = messages.find(m => m.id === 'req-2');
                
                assert.strictEqual(successMsg?.type, 'rpc-result');
                assert.strictEqual(errorMsg?.type, 'rpc-error');
            });
        });
    });
});
