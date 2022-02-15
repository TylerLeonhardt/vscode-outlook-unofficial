// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MicrosoftGraphClientFactory } from './clientFactories/microsoftGraphClientFactory';
import { MailFolderOperations } from './commands/folderOperations';
import { OutlookMailFolderTreeDataProvider } from './trees/mailFolderTree';
import { OutlookMessageTreeDataProvider } from './trees/emailTree';
import { MailMessageOperations } from './commands/messageOperations';
import 'isomorphic-fetch';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const clientProvider = new MicrosoftGraphClientFactory(context.globalState);
	const loginType: { type?: 'msa' | 'microsoft' } | undefined = context.globalState.get('outlookUnofficialLoginType');
	if (loginType) {
		clientProvider.setLoginType(loginType.type);
	}

	context.subscriptions.push(vscode.commands.registerCommand(
		'outlook-unofficial.login',
		async () => {
			const result = await vscode.window.showQuickPick(['Microsoft account', 'Work or School account']);

			if (!result) {
				return;
			}

			const provider = result === 'Microsoft account' ? 'msa' : 'microsoft';
			await vscode.authentication.getSession('microsoft', result === 'Microsoft account' ? MicrosoftGraphClientFactory.msaScopes : MicrosoftGraphClientFactory.scopes, { createIfNone: true });
			await context.globalState.update('outlookUnofficialLoginType', { type: provider });
			clientProvider.setLoginType(provider);
			vscode.commands.executeCommand('outlook-unofficial.refresh');
		}));
	
	context.subscriptions.push(vscode.authentication.onDidChangeSessions((e) => clientProvider.clearLoginTypeState(e)));
	
	const folderOps = new MailFolderOperations(clientProvider);
	context.subscriptions.push(folderOps);
	const mailFolderTreeDataProvider = new OutlookMailFolderTreeDataProvider(folderOps);
	const mailFolderView = vscode.window.createTreeView('outlook-unofficial.mailFolderView', {
		treeDataProvider: mailFolderTreeDataProvider,
		showCollapseAll: true
	});
	context.subscriptions.push(mailFolderView);

	const messageOps = new MailMessageOperations(clientProvider);
	const messageTreeDataProvider = new OutlookMessageTreeDataProvider(folderOps, messageOps, mailFolderView);
	const mailMessageView = vscode.window.createTreeView('outlook-unofficial.mailMessageView', {
		treeDataProvider: messageTreeDataProvider,
		showCollapseAll: true,
		canSelectMany: true
	});
	context.subscriptions.push(mailMessageView);
}

// this method is called when your extension is deactivated
export function deactivate() {}
