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
export type SortMode = 'date' | 'category';

export interface TodoGroup {
  key: string;
  label: string;
  items: TodoItem[];
}

export interface WebviewUpdatePayload {
  groups: TodoGroup[];
  filter: FilterMode;
  sort: SortMode;
  hasWorkspace: boolean;
  workspaceName?: string;
}
