import { MailFolder, Message } from '@microsoft/microsoft-graph-types';
import * as vscode from 'vscode';
import { MicrosoftGraphClientFactory } from '../clientFactories/microsoftGraphClientFactory';

export class MailFolderOperations extends vscode.Disposable {
	private readonly disposables: vscode.Disposable[] = [];
	constructor(private readonly clientProvider: MicrosoftGraphClientFactory) {
		super(() => {
			this.disposables.forEach(d => d.dispose());
		});
	}

	async getMailFolders(mailFolderId?: string): Promise<MailFolder[] | undefined> {
		const client = await this.clientProvider.getClient();
		if (!client) {
			throw new Error('Not logged in');
		}

		// TODO: error handling
		const route = mailFolderId
			? `/me/mailFolders/${mailFolderId}/childFolders`
			: `/me/mailFolders`;
		return await this.clientProvider.getAll<MailFolder>(client, route);
	}

	async getMessages(mailFolderId: string): Promise<Message[] | undefined> {
		const client = await this.clientProvider.getClient();
		if (!client) {
			throw new Error('Not logged in');
		}
		return await this.clientProvider.getAll<MailFolder>(client, `/me/mailFolders/${mailFolderId}/messages`);
	}
}
