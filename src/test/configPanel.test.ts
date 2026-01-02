import * as assert from 'assert';
import { ConfigPanel } from '../ui/configPanel';

suite('ConfigPanel Test Suite', () => {
    suite('Static Properties', () => {
        test('currentPanel is initially undefined', () => {
            assert.strictEqual(ConfigPanel.currentPanel, undefined);
        });
    });

    suite('Module Loading', () => {
        test('ConfigPanel class is exported', () => {
            assert.ok(ConfigPanel);
        });

        test('ConfigPanel has show static method', () => {
            assert.strictEqual(typeof ConfigPanel.show, 'function');
        });
    });
});

