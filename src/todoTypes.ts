export interface TodoItem {
  id: string;
  text: string;
  content?: string;
  date: string;
  completed: boolean;
  createdAt: number;
  workspaceFolder?: string;
}

export interface TodoStore {
  version: 1;
  items: TodoItem[];
}

export type FilterMode = 'all' | 'workspace';

export interface DateGroup {
  date: string;
  label: string;
  items: TodoItem[];
}

export interface WebviewUpdatePayload {
  groups: DateGroup[];
  filter: FilterMode;
  hasWorkspace: boolean;
  workspaceName?: string;
}
