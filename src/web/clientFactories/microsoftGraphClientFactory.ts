import { Client } from '@microsoft/microsoft-graph-client';
import * as vscode from 'vscode';

export class MicrosoftGraphClientFactory {
	static scopes: string[] = ['Mail.ReadWrite', 'offline_access'];
	static msaScopes = ['VSCODE_CLIENT_ID:c2152367-0364-400a-aeca-aec63dac3ea2', 'VSCODE_TENANT:consumers', 'Mail.ReadWrite', 'offline_access'];
	private loginType: 'msa' | 'microsoft' | undefined;
	private session: vscode.AuthenticationSession | undefined;

	constructor(private globalState: vscode.Memento) {

	}

	public async getClient(): Promise<Client | undefined> {
		if (!this.loginType) {
			return;
		}

		this.session = await vscode.authentication.getSession('microsoft', this.loginType === 'msa' ? MicrosoftGraphClientFactory.msaScopes : MicrosoftGraphClientFactory.scopes);
		if (!this.session) {
			return;
		}

		return Client.init({
			authProvider: (done) => {
				done(undefined, this.session!.accessToken);
			}
		});
	}

	public async getAll<T>(client: Client, apiPath: string): Promise<T[]> {
		let iterUri: string | null | undefined = apiPath;
		const list = new Array<T>();
		while (iterUri) {
			let res = await client.api(iterUri).get() as { '@odata.nextLink': string | null | undefined; value: T[] };
			res.value.forEach(r => list.push(r));
			iterUri = res['@odata.nextLink'];
		}

		return list;
	}

	public setLoginType(type: 'msa' | 'microsoft' | undefined) {
		this.loginType = type;
	}

	public async clearLoginTypeState(e: vscode.AuthenticationSessionsChangeEvent) {
		if (e.provider.id !== 'msa' && e.provider.id !== 'microsoft') {
			return;
		}
		
		// we already cleared the state
		if (!this.loginType) {
			return;
		}

		await this.globalState.update('outlookUnofficialLoginType', {});
		this.setLoginType(undefined);
		await vscode.commands.executeCommand('outlook-unofficial.refreshFolder');
	}
}
