export interface ParsedTodoText {
  title: string;
  category?: string;
}

export function parseTodoText(text: string): ParsedTodoText {
  const trimmed = text.trim();
  const separator = ' - ';
  const index = trimmed.lastIndexOf(separator);

  if (index === -1) {
    return { title: trimmed };
  }

  const title = trimmed.slice(0, index).trim();
  const category = trimmed.slice(index + separator.length).trim();

  if (!title || !category) {
    return { title: trimmed };
  }

  return { title, category };
}

export const UNCATEGORIZED_LABEL = '未分类';
