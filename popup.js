window.CardManager = window.CardManager || {};

window.CardManager.App = (function () {
  let allRecords = [];
  let colorConfig = { text: '#4CAF50', image: '#2196F3', link: '#FF9800' };
  let searchQuery = '';
  let batchMode = false;
  let activeTagFilter = null;

  async function init() {
    colorConfig = await CardManager.Storage.getColorConfig();
    CardManager.Toolbar.init({
      onSearch: handleSearch,
      onBatchToggle: handleBatchToggle,
      onBatchDelete: handleBatchDelete,
      onBatchTag: handleBatchTag,
      onImport: handleImport,
      onExport: handleExport,
      onAdd: handleAdd,
      onSettings: handleSettings
    });
    await refresh();
  }

  async function refresh() {
    allRecords = await CardManager.Storage.getAll();
    renderTagFilter();
    renderRecords();
  }

  function getAllTags() {
    const tagSet = new Set();
    allRecords.forEach(r => {
      (r.systemTags || []).forEach(t => tagSet.add(t));
      (r.customTags || []).forEach(t => tagSet.add(t));
    });
    return [...tagSet].sort();
  }

  function renderTagFilter() {
    const container = document.getElementById('tagFilter');
    const tags = getAllTags();
    if (tags.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    container.style.display = '';
    container.innerHTML = '';
    tags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-filter-pill' + (activeTagFilter === tag ? ' active' : '');
      pill.textContent = tag;
      pill.addEventListener('click', () => {
        activeTagFilter = activeTagFilter === tag ? null : tag;
        renderTagFilter();
        renderRecords();
      });
      container.appendChild(pill);
    });
    if (activeTagFilter) {
      const clear = document.createElement('span');
      clear.className = 'tag-filter-clear';
      clear.textContent = '清除';
      clear.addEventListener('click', () => {
        activeTagFilter = null;
        renderTagFilter();
        renderRecords();
      });
      container.appendChild(clear);
    }
  }

  function renderRecords() {
    const container = document.getElementById('cardList');
    const emptyState = document.getElementById('emptyState');
    container.innerHTML = '';

    let filtered = allRecords;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => {
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const textMatch = (r.content.text || '').toLowerCase().includes(q);
        const tagMatch = (r.customTags || []).some(t => t.toLowerCase().includes(q));
        const sysMatch = (r.systemTags || []).some(t => t.toLowerCase().includes(q));
        const linkMatch = (r.content.links || []).some(l =>
          (l.title || '').toLowerCase().includes(q) || (l.url || '').toLowerCase().includes(q)
        );
        return titleMatch || textMatch || tagMatch || sysMatch || linkMatch;
      });
    }
    if (activeTagFilter) {
      filtered = filtered.filter(r =>
        (r.systemTags || []).includes(activeTagFilter) ||
        (r.customTags || []).includes(activeTagFilter)
      );
    }

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    filtered.forEach(record => {
      const card = CardManager.RecordCard.render(record, {
        colorConfig,
        batchMode,
        isChecked: CardManager.Toolbar.isSelected(record.id),
        onEdit: handleEdit,
        onDelete: handleDelete,
        onFavorite: handleFavorite,
        onPin: handlePin,
        onCheck: handleCheck
      });
      container.appendChild(card);
    });
  }

  function handleSearch(query) {
    searchQuery = query;
    renderRecords();
  }

  function handleBatchToggle(enabled) {
    batchMode = enabled;
    renderRecords();
  }

  async function handleBatchDelete(ids) {
    if (!confirm('确定删除 ' + ids.length + ' 张卡片？')) return;
    await CardManager.Storage.deleteBatch(ids);
    await refresh();
  }

  async function handleBatchTag(ids, tag) {
    await CardManager.Storage.batchAddTag(ids, tag);
    await refresh();
  }

  async function handleImport(file) {
    try {
      await CardManager.Export.importFromFile(file);
      await refresh();
    } catch (err) {
      alert('导入失败：' + err.message);
    }
  }

  async function handleExport() {
    try {
      await CardManager.Export.exportToFile();
    } catch (err) {
      alert('导出失败：' + err.message);
    }
  }

  function handleAdd() {
    CardManager.Modal.open(null, refresh);
  }

  async function handleEdit(id) {
    const record = await CardManager.Storage.get(id);
    if (record) {
      CardManager.Modal.open(record, refresh);
    }
  }

  async function handleDelete(id) {
    if (!confirm('确定删除这张卡片？')) return;
    await CardManager.Storage.delete(id);
    await CardManager.IDB.deleteImages(id);
    await refresh();
  }

  async function handleFavorite(id, value) {
    await CardManager.Storage.setFavorite(id, value);
    await refresh();
  }

  async function handlePin(id, value) {
    await CardManager.Storage.setPinned(id, value);
    await refresh();
  }

  function handleCheck(id) {
    CardManager.Toolbar.toggleSelect(id);
    renderRecords();
  }

  function handleSettings() {
    CardManager.Settings.open(refresh);
  }

  return { init, refresh };
})();

document.addEventListener('DOMContentLoaded', () => {
  CardManager.App.init();
});
