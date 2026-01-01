import * as vscode from 'vscode';
import { JiraCredentials } from './types';

const CREDENTIALS_KEY = 'jira-sidekick.credentials';
const SELECTED_FILTER_KEY = 'jira-sidekick.selectedFilter';

export class AuthService {
    constructor(private readonly secretStorage: vscode.SecretStorage) {}

    async setCredentials(credentials: JiraCredentials): Promise<void> {
        await this.secretStorage.store(CREDENTIALS_KEY, JSON.stringify(credentials));
    }

    async getCredentials(): Promise<JiraCredentials | null> {
        const stored = await this.secretStorage.get(CREDENTIALS_KEY);
        if (!stored) {
            return null;
        }
        try {
            return JSON.parse(stored) as JiraCredentials;
        } catch {
            return null;
        }
    }

    async clearCredentials(): Promise<void> {
        await this.secretStorage.delete(CREDENTIALS_KEY);
    }

    async hasCredentials(): Promise<boolean> {
        const credentials = await this.getCredentials();
        return credentials !== null;
    }

    async setSelectedFilter(filterId: string | null): Promise<void> {
        if (filterId === null) {
            await this.secretStorage.delete(SELECTED_FILTER_KEY);
        } else {
            await this.secretStorage.store(SELECTED_FILTER_KEY, filterId);
        }
    }

    async getSelectedFilter(): Promise<string | null> {
        const filterId = await this.secretStorage.get(SELECTED_FILTER_KEY);
        return filterId || null;
    }
}

