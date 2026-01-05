import * as assert from 'assert';
import { PreferencesService } from '../core/preferences';
import * as coreExports from '../core/index';

class MockMemento {
    private storage = new Map<string, unknown>();

    get<T>(key: string): T | undefined;
    get<T>(key: string, defaultValue: T): T;
    get<T>(key: string, defaultValue?: T): T | undefined {
        const value = this.storage.get(key);
        return value !== undefined ? (value as T) : defaultValue;
    }

    async update(key: string, value: unknown): Promise<void> {
        if (value === undefined || value === null) {
            this.storage.delete(key);
        } else {
            this.storage.set(key, value);
        }
    }

    keys(): readonly string[] {
        return Array.from(this.storage.keys());
    }

    setKeysForSync(): void {}
}

suite('Core Module Exports', () => {
    test('exports PreferencesService from index', () => {
        assert.strictEqual(coreExports.PreferencesService, PreferencesService);
    });
});

suite('PreferencesService Test Suite', () => {
    let preferencesService: PreferencesService;
    let mockMemento: MockMemento;

    setup(() => {
        mockMemento = new MockMemento();
        preferencesService = new PreferencesService(mockMemento as any);
    });

    suite('getSelectedFilter()', () => {
        test('returns null when no filter selected', () => {
            const result = preferencesService.getSelectedFilter();
            assert.strictEqual(result, null);
        });

        test('returns stored filter ID', async () => {
            await preferencesService.setSelectedFilter('12345');
            const result = preferencesService.getSelectedFilter();
            assert.strictEqual(result, '12345');
        });
    });

    suite('setSelectedFilter()', () => {
        test('stores filter ID', async () => {
            await preferencesService.setSelectedFilter('12345');
            const stored = mockMemento.get<string>('jira-sidekick.selectedFilter');
            assert.strictEqual(stored, '12345');
        });

        test('clears filter when null is passed', async () => {
            await preferencesService.setSelectedFilter('12345');
            await preferencesService.setSelectedFilter(null);
            const result = preferencesService.getSelectedFilter();
            assert.strictEqual(result, null);
        });
    });
});


