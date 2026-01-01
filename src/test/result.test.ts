import * as assert from 'assert';
import { Result, ok, err } from '../core/result';

suite('Result Type Test Suite', () => {
    suite('ok() helper', () => {
        test('creates success result with data', () => {
            const result = ok('test data');
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data, 'test data');
            }
        });

        test('creates success result with object data', () => {
            const data = { id: 1, name: 'test' };
            const result = ok(data);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.deepStrictEqual(result.data, data);
            }
        });

        test('creates success result with array data', () => {
            const data = [1, 2, 3];
            const result = ok(data);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.deepStrictEqual(result.data, data);
            }
        });

        test('creates success result with undefined', () => {
            const result = ok(undefined);
            assert.strictEqual(result.success, true);
            if (result.success) {
                assert.strictEqual(result.data, undefined);
            }
        });
    });

    suite('err() helper', () => {
        test('creates error result with Error object', () => {
            const error = new Error('test error');
            const result = err(error);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error, error);
                assert.strictEqual(result.error.message, 'test error');
            }
        });

        test('creates error result with string', () => {
            const result = err('error message');
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error, 'error message');
            }
        });

        test('creates error result with custom error type', () => {
            class CustomError extends Error {
                constructor(message: string, public code: number) {
                    super(message);
                }
            }
            const error = new CustomError('custom error', 500);
            const result = err(error);
            assert.strictEqual(result.success, false);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'custom error');
                assert.strictEqual(result.error.code, 500);
            }
        });
    });

    suite('Type narrowing', () => {
        test('success check narrows to data access', () => {
            const result: Result<string, Error> = ok('value');
            if (result.success) {
                const value: string = result.data;
                assert.strictEqual(value, 'value');
            } else {
                assert.fail('Should be success');
            }
        });

        test('failure check narrows to error access', () => {
            const result: Result<string, Error> = err(new Error('fail'));
            if (!result.success) {
                const error: Error = result.error;
                assert.strictEqual(error.message, 'fail');
            } else {
                assert.fail('Should be failure');
            }
        });

        test('exhaustive handling with success result', () => {
            const result: Result<number, string> = ok(42);
            let handled = false;
            
            if (result.success) {
                assert.strictEqual(result.data, 42);
                handled = true;
            } else {
                const _exhaustive: string = result.error;
                void _exhaustive;
            }
            
            assert.strictEqual(handled, true);
        });

        test('exhaustive handling with error result', () => {
            const result: Result<number, string> = err('error');
            let handled = false;
            
            if (result.success) {
                const _exhaustive: number = result.data;
                void _exhaustive;
            } else {
                assert.strictEqual(result.error, 'error');
                handled = true;
            }
            
            assert.strictEqual(handled, true);
        });
    });

    suite('Real-world usage patterns', () => {
        function divide(a: number, b: number): Result<number, string> {
            if (b === 0) {
                return err('Division by zero');
            }
            return ok(a / b);
        }

        test('handles success case', () => {
            const result = divide(10, 2);
            if (result.success) {
                assert.strictEqual(result.data, 5);
            } else {
                assert.fail('Expected success');
            }
        });

        test('handles error case', () => {
            const result = divide(10, 0);
            if (!result.success) {
                assert.strictEqual(result.error, 'Division by zero');
            } else {
                assert.fail('Expected error');
            }
        });

        async function asyncOperation(shouldFail: boolean): Promise<Result<{ id: number }, Error>> {
            if (shouldFail) {
                return err(new Error('Async operation failed'));
            }
            return ok({ id: 123 });
        }

        test('handles async success', async () => {
            const result = await asyncOperation(false);
            if (result.success) {
                assert.deepStrictEqual(result.data, { id: 123 });
            } else {
                assert.fail('Expected success');
            }
        });

        test('handles async error', async () => {
            const result = await asyncOperation(true);
            if (!result.success) {
                assert.strictEqual(result.error.message, 'Async operation failed');
            } else {
                assert.fail('Expected error');
            }
        });
    });
});
