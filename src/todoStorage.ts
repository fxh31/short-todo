import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { FilterMode, SortMode, TodoGroup, TodoItem, TodoStore } from './todoTypes';
import { parseTodoText, UNCATEGORIZED_LABEL } from './todoParser';

const STORE_KEY = 'todolist.store';
const BACKUP_FILE = 'todos.json';

export class TodoStorage {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(private readonly context: vscode.ExtensionContext) {}

  private get backupPath(): string {
    return path.join(this.context.globalStorageUri.fsPath, BACKUP_FILE);
  }

  async load(): Promise<TodoStore> {
    const cached = this.context.globalState.get<TodoStore>(STORE_KEY);
    if (cached?.version === 1) {
      return cached;
    }

    try {
      const raw = await fs.promises.readFile(this.backupPath, 'utf-8');
      const parsed = JSON.parse(raw) as TodoStore;
      if (parsed?.version === 1 && Array.isArray(parsed.items)) {
        await this.save(parsed);
        return parsed;
      }
    } catch {
      // no backup yet
    }

    return { version: 1, items: [] };
  }

  async save(store: TodoStore): Promise<void> {
    await this.context.globalState.update(STORE_KEY, store);
    await fs.promises.mkdir(this.context.globalStorageUri.fsPath, { recursive: true });
    await fs.promises.writeFile(this.backupPath, JSON.stringify(store, null, 2), 'utf-8');
    this._onDidChange.fire();
  }

  async add(text: string, date?: string, workspaceFolder?: string): Promise<TodoItem> {
    const store = await this.load();
    const item: TodoItem = {
      id: crypto.randomUUID(),
      text: text.trim(),
      date: date ?? todayString(),
      completed: false,
      createdAt: Date.now(),
      workspaceFolder,
    };
    store.items.push(item);
    await this.save(store);
    return item;
  }

  async toggle(id: string): Promise<void> {
    const store = await this.load();
    const item = store.items.find((i) => i.id === id);
    if (item) {
      item.completed = !item.completed;
      await this.save(store);
    }
  }

  async updateContent(id: string, content: string): Promise<void> {
    const store = await this.load();
    const item = store.items.find((i) => i.id === id);
    if (item) {
      item.content = content;
      await this.save(store);
    }
  }

  async updateText(id: string, text: string): Promise<void> {
    const store = await this.load();
    const item = store.items.find((i) => i.id === id);
    const nextText = text.trim();
    if (item && nextText) {
      item.text = nextText;
      await this.save(store);
    }
  }

  async complete(id: string): Promise<void> {
    const store = await this.load();
    const item = store.items.find((i) => i.id === id);
    if (item && !item.completed) {
      item.completed = true;
      await this.save(store);
    }
  }

  async remove(id: string): Promise<void> {
    const store = await this.load();
    store.items = store.items.filter((i) => i.id !== id);
    await this.save(store);
  }

  async removeMany(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const store = await this.load();
    const idSet = new Set(ids);
    store.items = store.items.filter((i) => !idSet.has(i.id));
    await this.save(store);
  }

  async removeCompleted(filter: FilterMode): Promise<void> {
    const store = await this.load();
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    const nextItems = store.items.filter((item) => {
      if (!item.completed) {
        return true;
      }
      if (filter === 'workspace' && workspacePath) {
        return item.workspaceFolder !== workspacePath;
      }
      return false;
    });

    if (nextItems.length === store.items.length) {
      return;
    }

    store.items = nextItems;
    await this.save(store);
  }

  getFilteredGroups(store: TodoStore, filter: FilterMode, sort: SortMode): TodoGroup[] {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    let items = store.items;

    if (filter === 'workspace' && workspacePath) {
      items = items.filter((i) => i.workspaceFolder === workspacePath);
    }

    if (sort === 'category') {
      const byCategory = new Map<string, TodoItem[]>();
      for (const item of items) {
        const { category } = parseTodoText(item.text);
        const key = category ?? '';
        const list = byCategory.get(key) ?? [];
        list.push(item);
        byCategory.set(key, list);
      }

      const keys = [...byCategory.keys()].sort((a, b) => {
        if (a === '') {
          return 1;
        }
        if (b === '') {
          return -1;
        }
        return a.localeCompare(b, 'zh-CN');
      });

      return keys.map((key) => ({
        key,
        label: key || UNCATEGORIZED_LABEL,
        items: (byCategory.get(key) ?? []).sort((a, b) => {
          if (a.date !== b.date) {
            return b.date.localeCompare(a.date);
          }
          return a.createdAt - b.createdAt;
        }),
      }));
    }

    const byDate = new Map<string, TodoItem[]>();
    for (const item of items) {
      const list = byDate.get(item.date) ?? [];
      list.push(item);
      byDate.set(item.date, list);
    }

    const dates = [...byDate.keys()].sort((a, b) => b.localeCompare(a));

    return dates.map((date) => ({
      key: date,
      label: formatDateLabel(date),
      items: (byDate.get(date) ?? []).sort((a, b) => a.createdAt - b.createdAt),
    }));
  }
}

export function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
  return `${y}年${m}月${d}日 ${weekday}`;
}
