import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { FilterMode, WebviewUpdatePayload } from './todoTypes';
import { TodoStorage, todayString } from './todoStorage';

export class TodoViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'todolist.todoView';

  private _view?: vscode.WebviewView;
  private _filter: FilterMode = 'all';

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly storage: TodoStorage
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'ready':
        case 'setFilter':
          if (msg.type === 'setFilter') {
            this._filter = msg.mode === 'workspace' ? 'workspace' : 'all';
          }
          await this.postUpdate();
          break;
        case 'toggle':
          await this.storage.toggle(msg.id);
          break;
        case 'updateContent':
          await this.storage.updateContent(msg.id, msg.content);
          break;
        case 'updateText':
          await this.storage.updateText(msg.id, msg.text);
          break;
        case 'complete':
          await this.storage.complete(msg.id);
          break;
        case 'delete':
          await this.storage.remove(msg.id);
          break;
        case 'add': {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          await this.storage.add(msg.text, msg.date ?? todayString(), workspaceFolder);
          break;
        }
      }
    });
  }

  async refresh(): Promise<void> {
    await this.postUpdate();
  }

  private async postUpdate(): Promise<void> {
    if (!this._view) {
      return;
    }

    const store = await this.storage.load();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const payload: WebviewUpdatePayload = {
      groups: this.storage.getFilteredGroups(store, this._filter),
      filter: this._filter,
      hasWorkspace: !!workspaceFolder,
      workspaceName: workspaceFolder?.name,
    };

    this._view.webview.postMessage({ type: 'update', ...payload });
  }

  private getHtml(webview: vscode.Webview): string {
    const webviewDir = vscode.Uri.joinPath(this.extensionUri, 'src', 'webview');
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, 'style.css'));
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewDir, 'main.js'));
    const nonce = getNonce();

    const htmlPath = path.join(this.extensionUri.fsPath, 'src', 'webview', 'index.html');
    let body = fs.readFileSync(htmlPath, 'utf-8');
    body = body
      .replace(/{{styleUri}}/g, styleUri.toString())
      .replace(/{{scriptUri}}/g, scriptUri.toString())
      .replace(/{{nonce}}/g, nonce)
      .replace(/{{cspSource}}/g, webview.cspSource);

    return body;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
