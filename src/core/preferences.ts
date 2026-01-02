import * as vscode from 'vscode';

const SELECTED_FILTER_KEY = 'jira-sidekick.selectedFilter';

export class PreferencesService {
    constructor(private readonly globalState: vscode.Memento) {}

    getSelectedFilter(): string | null {
        return this.globalState.get<string>(SELECTED_FILTER_KEY) ?? null;
    }

    async setSelectedFilter(filterId: string | null): Promise<void> {
        await this.globalState.update(SELECTED_FILTER_KEY, filterId);
    }
}

