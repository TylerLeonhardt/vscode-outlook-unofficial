import { commands, Disposable, Event, EventEmitter, ProviderResult, ThemeIcon, TreeDataProvider, TreeItem, TreeItemCollapsibleState, TreeView, ViewColumn, WebviewPanel, window, workspace } from "vscode";
import { MailFolder, Message } from '@microsoft/microsoft-graph-types';
import { MailFolderOperations } from "../commands/folderOperations";
import { MailMessageOperations } from "../commands/messageOperations";

export class OutlookMessageTreeDataProvider extends Disposable implements TreeDataProvider<Message> {
	private didChangeTreeData = new EventEmitter<void | Message | undefined>();
	onDidChangeTreeData?: Event<void | Message | undefined> = this.didChangeTreeData.event;
	
	private readonly disposables: Disposable[] = [];
	private currentFolder: MailFolder | undefined;
	private panels: WebviewPanel[] = [];

	constructor(
		private readonly mailFolderOperations: MailFolderOperations,
		private readonly mailMessageOperations: MailMessageOperations,
		folderTreeView: TreeView<MailFolder>) {
		super(() => this.dispose());

		folderTreeView.onDidChangeSelection(e => {
			this.currentFolder = e.selection[0];
			this.didChangeTreeData.fire();
		});

		this.disposables.push(commands.registerCommand(
			'outlook-unofficial.refreshMessages',
			() => {
				commands.executeCommand('outlook-unofficial.refreshFolder', this.currentFolder);
				this.didChangeTreeData.fire();
			}));

		this.disposables.push(commands.registerCommand(
			'outlook-unofficial.deleteMessage',
			(node: Message, nodes: Message[] | undefined) => {
				if (nodes && nodes.length > 0) {
					return this.deleteEmails(nodes);
				}
				if (node) {
					return this.deleteEmails([node]);
				}
			}));

		this.disposables.push(commands.registerCommand(
			'outlook-official.openMessage',
			(node: Message, nodes: Message[] | undefined) => {
				if (nodes && nodes.length > 0) {
					return this.openEmails(nodes);
				}
				if (node) {
					return this.openEmails([node]);
				}
			}));
	}

	getTreeItem(element: Message): TreeItem | Thenable<TreeItem> {
		const icon = element.isRead ? new ThemeIcon('mail-read') : new ThemeIcon('mail');
		const treeItem = new TreeItem({
			label: element.subject ?? '<No Subject>'
		}, TreeItemCollapsibleState.None);
		treeItem.contextValue = 'mailMessage';
		treeItem.iconPath = icon;
		return treeItem;
	}
	async getChildren(): Promise<Message[] | undefined> {
		if (!this.currentFolder || !this.currentFolder.id) {
			return;
		}
		const messages = await this.mailFolderOperations.getMessages(this.currentFolder.id);
		return messages;
	}

	async deleteEmails(nodes: Message[]): Promise<void> {
		for (const n of nodes) {
			await this.mailMessageOperations.deleteMessage(n.id!);
			const panel = this.panels.find(e => e.title === n.subject);
			if (!panel) {
				continue;
			}
			panel.title = '[deleted] ' + panel.title;
		}

		this.didChangeTreeData.fire();
	}

	async openEmails(messages: Message[]): Promise<void> {
		for (const message of messages) {
			const subject = message.subject ?? '<No Subject>';
			const panel = window.createWebviewPanel('outlook-official.mailMessageWebview', subject, ViewColumn.Active, {
				enableFindWidget: true,
				retainContextWhenHidden: true,
			});
			panel.webview.html = message.body?.content ?? 'The body of the message was empty.';
			const disposable = panel.onDidDispose(() => {
				const index = this.panels.findIndex(p => p === panel);
				this.panels.splice(index, 1);
				disposable.dispose();
			});
			this.panels.push(panel);
		}
	}
}
