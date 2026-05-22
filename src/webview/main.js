(function () {
  const vscode = acquireVsCodeApi();

  const listEl = document.getElementById('list');
  const emptyEl = document.getElementById('empty');
  const addForm = document.getElementById('add-form');
  const addInput = document.getElementById('add-input');
  const addDate = document.getElementById('add-date');
  const filterWorkspaceBtn = document.getElementById('filter-workspace');
  const detailPanel = document.getElementById('detail-panel');
  const detailClose = document.getElementById('detail-close');
  const detailTitleInput = document.getElementById('detail-title-input');
  const detailContentInput = document.getElementById('detail-content-input');
  const detailDate = document.getElementById('detail-date');
  const detailStatus = document.getElementById('detail-status');
  const detailCreated = document.getElementById('detail-created');
  const detailWorkspace = document.getElementById('detail-workspace');

  let selectedId = null;
  let clickTimer = null;
  let contentSaveTimer = null;
  let titleSaveTimer = null;
  const CLICK_DELAY = 280;

  const CHECKBOX_SVG =
    '<svg class="todo-checkbox-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<circle class="icon-unchecked" cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.2" fill="none"/>' +
    '<g class="icon-checked">' +
    '<path d="M20.5 14.5a9 9 0 1 1-2.1-8.2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
    '<path d="M7.5 12.3l3.2 3.2 6.7-6.7" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</g></svg>';

  function createCheckbox(item) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'todo-checkbox' + (item.completed ? ' checked' : '');
    btn.setAttribute('role', 'checkbox');
    btn.setAttribute('aria-checked', item.completed ? 'true' : 'false');
    btn.title = '切换完成状态';
    btn.innerHTML = CHECKBOX_SVG;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      vscode.postMessage({ type: 'toggle', id: item.id });
    });
    return btn;
  }

  function todayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function formatDateLabel(dateStr) {
    const parts = dateStr.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
    return parts[0] + '年' + parts[1] + '月' + parts[2] + '日 ' + weekday;
  }

  function formatCreatedAt(ts) {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  }

  function workspaceLabel(path) {
    if (!path) return '—';
    const sep = path.includes('\\') ? '\\' : '/';
    const parts = path.split(sep);
    return parts[parts.length - 1] || path;
  }

  addDate.value = todayString();

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      document.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      vscode.postMessage({ type: 'setFilter', mode: btn.dataset.filter });
    });
  });

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const text = addInput.value.trim();
    if (!text) return;
    vscode.postMessage({ type: 'add', text: text, date: addDate.value });
    addInput.value = '';
    addInput.focus();
  });

  detailClose.addEventListener('click', hideDetail);

  function hideDetail() {
    selectedId = null;
    detailPanel.classList.add('hidden');
    document.querySelectorAll('.todo-item.selected').forEach(function (el) {
      el.classList.remove('selected');
    });
  }

  function showDetail(item) {
    selectedId = item.id;
    detailPanel.classList.remove('hidden');
    if (document.activeElement !== detailTitleInput || detailTitleInput.dataset.editingId !== item.id) {
      detailTitleInput.value = item.text;
      detailTitleInput.dataset.editingId = item.id;
    }
    detailTitleInput.classList.toggle('done', item.completed);
    
    // Only update content value if it's not currently focused by the user
    // to prevent cursor jumping during typing
    if (document.activeElement !== detailContentInput || detailContentInput.dataset.editingId !== item.id) {
      detailContentInput.value = item.content || '';
      detailContentInput.dataset.editingId = item.id;
    }

    detailDate.textContent = formatDateLabel(item.date);
    detailStatus.textContent = item.completed ? '已办' : '待办';
    detailCreated.textContent = formatCreatedAt(item.createdAt);
    detailWorkspace.textContent = workspaceLabel(item.workspaceFolder);
    detailWorkspace.title = item.workspaceFolder || '';

    document.querySelectorAll('.todo-item').forEach(function (el) {
      el.classList.toggle('selected', el.dataset.id === item.id);
    });
  }

  detailContentInput.addEventListener('input', function () {
    if (!selectedId) return;
    if (contentSaveTimer) clearTimeout(contentSaveTimer);
    const content = detailContentInput.value;
    const id = selectedId;
    contentSaveTimer = setTimeout(function () {
      vscode.postMessage({ type: 'updateContent', id: id, content: content });
    }, 500);
  });

  detailTitleInput.addEventListener('input', function () {
    if (!selectedId) return;
    if (titleSaveTimer) clearTimeout(titleSaveTimer);
    const text = detailTitleInput.value;
    const id = selectedId;
    titleSaveTimer = setTimeout(function () {
      if (!text.trim()) return;
      vscode.postMessage({ type: 'updateText', id: id, text: text });
    }, 500);
  });

  function bindTodoInteractions(row, item) {
    const textEl = row.querySelector('.todo-text');

    textEl.title = '单击查看详情，双击标记已办';

    textEl.addEventListener('click', function (e) {
      e.stopPropagation();
      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(function () {
        clickTimer = null;
        showDetail(item);
      }, CLICK_DELAY);
    });

    textEl.addEventListener('dblclick', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      if (!item.completed) {
        vscode.postMessage({ type: 'complete', id: item.id });
      }
    });
  }

  function render(data) {
    if (data.hasWorkspace) {
      filterWorkspaceBtn.disabled = false;
      filterWorkspaceBtn.textContent = data.workspaceName
        ? '工作区: ' + data.workspaceName
        : '当前工作区';
    } else {
      filterWorkspaceBtn.disabled = true;
      filterWorkspaceBtn.textContent = '当前工作区';
    }

    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      const mode = btn.dataset.filter;
      btn.classList.toggle('active', mode === data.filter);
    });

    const allItems = [];
    (data.groups || []).forEach(function (g) {
      g.items.forEach(function (item) {
        allItems.push(item);
      });
    });

    if (selectedId) {
      const current = allItems.find(function (i) {
        return i.id === selectedId;
      });
      if (current) {
        showDetail(current);
      } else {
        hideDetail();
      }
    }

    listEl.innerHTML = '';
    const total = allItems.length;

    if (total === 0) {
      emptyEl.classList.remove('hidden');
      if (!selectedId) hideDetail();
      return;
    }
    emptyEl.classList.add('hidden');

    (data.groups || []).forEach(function (group) {
      const section = document.createElement('section');
      section.className = 'date-section';

      const heading = document.createElement('h2');
      heading.className = 'date-heading';
      heading.textContent = group.label;
      section.appendChild(heading);

      group.items.forEach(function (item) {
        const row = document.createElement('div');
        row.className = 'todo-item' + (item.completed ? ' done' : '');
        if (item.id === selectedId) row.classList.add('selected');
        row.dataset.id = item.id;

        const cb = createCheckbox(item);

        const span = document.createElement('span');
        span.className = 'todo-text';
        span.textContent = item.text;

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'delete-btn';
        del.title = '删除';
        del.textContent = '×';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          if (item.id === selectedId) hideDetail();
          vscode.postMessage({ type: 'delete', id: item.id });
        });

        row.appendChild(cb);
        row.appendChild(span);
        row.appendChild(del);
        bindTodoInteractions(row, item);
        section.appendChild(row);
      });

      listEl.appendChild(section);
    });
  }

  window.addEventListener('message', function (event) {
    const msg = event.data;
    if (msg.type === 'update') {
      render(msg);
    }
  });

  vscode.postMessage({ type: 'ready' });
})();
