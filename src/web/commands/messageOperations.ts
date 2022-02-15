import { MailFolder, Message } from '@microsoft/microsoft-graph-types';
import * as vscode from 'vscode';
import { MicrosoftGraphClientFactory } from '../clientFactories/microsoftGraphClientFactory';

export class MailMessageOperations extends vscode.Disposable {
	private readonly disposables: vscode.Disposable[] = [];
	constructor(private readonly clientProvider: MicrosoftGraphClientFactory) {
		super(() => {
			this.disposables.forEach(d => d.dispose());
		});
	}

	async deleteMessage(messageId: string): Promise<void> {
		const client = await this.clientProvider.getClient();
		if (!client) {
			throw new Error('Not logged in');
		}

		await client.api(`/me/messages/${messageId}`).delete();
	}
}
