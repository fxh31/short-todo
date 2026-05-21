import * as vscode from 'vscode';
import { TodoStorage, todayString } from './todoStorage';
import { TodoViewProvider } from './todoViewProvider';

let storage: TodoStorage;
let provider: TodoViewProvider;

export function activate(context: vscode.ExtensionContext): void {
  storage = new TodoStorage(context);
  provider = new TodoViewProvider(context.extensionUri, storage);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(TodoViewProvider.viewType, provider),
    storage.onDidChange(() => provider.refresh()),
    vscode.commands.registerCommand('todolist.add', async () => {
      const text = await vscode.window.showInputBox({
        prompt: '输入待办内容',
        placeHolder: '今天要完成的事…',
      });
      if (!text?.trim()) {
        return;
      }
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      await storage.add(text, todayString(), workspaceFolder);
    }),
    vscode.commands.registerCommand('todolist.refresh', () => provider.refresh())
  );
}

export function deactivate(): void {}
