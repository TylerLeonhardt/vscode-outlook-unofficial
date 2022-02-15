import { commands, Disposable, Event, EventEmitter, TreeDataProvider, TreeItem, TreeItemCollapsibleState, window } from "vscode";
import { MailFolder } from '@microsoft/microsoft-graph-types';
import { MailFolderOperations } from "../commands/folderOperations";

export class OutlookMailFolderTreeDataProvider extends Disposable implements TreeDataProvider<MailFolder> {
	private didChangeTreeData = new EventEmitter<void | MailFolder | undefined>();
	onDidChangeTreeData?: Event<void | MailFolder | undefined> = this.didChangeTreeData.event;
	
	private readonly disposibles: Disposable[] = [];

	constructor(private mailFolderOperations: MailFolderOperations) {
		super(() => this.dispose());

		this.disposibles.push(commands.registerCommand(
			'outlook-unofficial.refreshFolder',
			(element?: MailFolder) => this.didChangeTreeData.fire(element)));
	}

	getTreeItem(element: MailFolder): TreeItem | Thenable<TreeItem> {
		const treeItem = new TreeItem({
			label: element.displayName || '',
		}, TreeItemCollapsibleState.Collapsed);
		treeItem.contextValue = 'mailFolder';
		return treeItem;
	}
	async getChildren(element?: MailFolder): Promise<MailFolder[] | undefined> {
		try {
			const folders = await this.mailFolderOperations.getMailFolders(element?.id);
			return folders;
		} catch (e: any) {
			if (e.message === 'Not logged in') {
				return undefined;
			}
			window.showErrorMessage(e.message);
		}
	}
}
