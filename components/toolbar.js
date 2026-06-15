window.CardManager = window.CardManager || {};

window.CardManager.Toolbar = (function () {
  let batchMode = false;
  let selectedIds = [];
  let callbacks = {};

  function init(cbs) {
    callbacks = cbs;
    render();
    bindEvents();
  }

  function render() {
    const toolbar = document.getElementById('toolbar');
    toolbar.innerHTML = `
      <div class="toolbar-row">
        <input type="text" id="searchInput" placeholder="搜索卡片..." />
        <button id="addBtn" class="toolbar-btn btn-primary" title="新建卡片">+</button>
      </div>
      <div class="toolbar-row toolbar-actions">
        <button id="batchToggleBtn" class="toolbar-btn">选择</button>
        <button id="importBtn" class="toolbar-btn">导入</button>
        <button id="exportBtn" class="toolbar-btn">导出</button>
        <button id="settingsBtn" class="toolbar-btn" title="WebDAV 同步设置">⚙</button>
      </div>
      <div id="batchBar" class="toolbar-row batch-bar" style="display:none">
        <span id="selectedCount">已选 0 项</span>
        <button id="batchDeleteBtn" class="toolbar-btn btn-danger">删除</button>
        <button id="batchTagBtn" class="toolbar-btn">添加标签</button>
        <button id="batchCancelBtn" class="toolbar-btn">取消</button>
      </div>
    `;
  }

  function bindEvents() {
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        callbacks.onSearch && callbacks.onSearch(e.target.value);
      }, 300);
    });

    document.getElementById('addBtn').addEventListener('click', () => {
      callbacks.onAdd && callbacks.onAdd();
    });

    document.getElementById('batchToggleBtn').addEventListener('click', () => {
      batchMode = !batchMode;
      setBatchMode(batchMode);
    });

    document.getElementById('importBtn').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) callbacks.onImport && callbacks.onImport(file);
      };
      input.click();
    });

    document.getElementById('exportBtn').addEventListener('click', () => {
      callbacks.onExport && callbacks.onExport();
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {
      callbacks.onSettings && callbacks.onSettings();
    });

    document.getElementById('batchDeleteBtn').addEventListener('click', () => {
      if (selectedIds.length > 0) {
        callbacks.onBatchDelete && callbacks.onBatchDelete([...selectedIds]);
      }
    });

    document.getElementById('batchTagBtn').addEventListener('click', () => {
      if (selectedIds.length > 0) {
        const tag = prompt('请输入标签名称：');
        if (tag && tag.trim()) {
          callbacks.onBatchTag && callbacks.onBatchTag([...selectedIds], tag.trim());
        }
      }
    });

    document.getElementById('batchCancelBtn').addEventListener('click', () => {
      batchMode = false;
      selectedIds = [];
      setBatchMode(false);
    });
  }

  function setBatchMode(enabled) {
    batchMode = enabled;
    selectedIds = [];
    const batchBar = document.getElementById('batchBar');
    const toggleBtn = document.getElementById('batchToggleBtn');
    if (enabled) {
      batchBar.style.display = 'flex';
      toggleBtn.textContent = '取消选择';
    } else {
      batchBar.style.display = 'none';
      toggleBtn.textContent = '选择';
    }
    updateSelectedCount();
    callbacks.onBatchToggle && callbacks.onBatchToggle(enabled);
  }

  function toggleSelect(id) {
    const idx = selectedIds.indexOf(id);
    if (idx === -1) {
      selectedIds.push(id);
    } else {
      selectedIds.splice(idx, 1);
    }
    updateSelectedCount();
  }

  function updateSelectedCount() {
    const el = document.getElementById('selectedCount');
    if (el) el.textContent = '已选 ' + selectedIds.length + ' 项';
  }

  function isBatchMode() { return batchMode; }
  function isSelected(id) { return selectedIds.includes(id); }
  function getSelectedIds() { return [...selectedIds]; }
  function clearSearch() {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
  }

  return { init, isBatchMode, isSelected, toggleSelect, getSelectedIds, clearSearch };
})();
