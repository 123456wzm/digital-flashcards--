window.CardManager = window.CardManager || {};

window.CardManager.Settings = (function () {
  let refreshCallback = null;

  function open(onRefresh) {
    refreshCallback = onRefresh;
    document.getElementById('toolbar').style.display = 'none';
    document.getElementById('cardList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    const editorView = document.getElementById('editorView');
    editorView.style.display = 'block';
    renderSettings(editorView);
  }

  function close() {
    const editorView = document.getElementById('editorView');
    editorView.style.display = 'none';
    editorView.innerHTML = '';
    document.getElementById('toolbar').style.display = '';
    document.getElementById('cardList').style.display = '';
    if (refreshCallback) refreshCallback();
  }

  function renderSettings(container) {
    container.innerHTML = `
      <div class="editor-header">
        <button id="settingsBackBtn" class="toolbar-btn">← 返回</button>
        <h2>WebDAV 同步设置</h2>
      </div>
      <div class="editor-content">
        <label>服务器地址</label>
        <input type="url" id="webdavServer" placeholder="https://dav.example.com/dav/" />

        <label>用户名</label>
        <input type="text" id="webdavUsername" placeholder="用户名" />

        <label>密码</label>
        <div class="password-row">
          <input type="password" id="webdavPassword" placeholder="密码" />
          <button id="togglePasswordBtn" class="toolbar-btn btn-small">显示</button>
        </div>

        <label>远程文件路径</label>
        <input type="text" id="webdavPath" placeholder="/knowledge-cards-backup.json" />

        <div class="setting-toggle-row">
          <span>自动同步</span>
          <label class="toggle-switch">
            <input type="checkbox" id="webdavAutoSync" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div id="webdavSyncInfo" class="sync-info"></div>

        <hr class="editor-divider" />

        <div class="webdav-actions">
          <button id="webdavTestBtn" class="toolbar-btn">测试连接</button>
          <button id="webdavUpBtn" class="toolbar-btn btn-primary">上传到服务器</button>
          <button id="webdavDownBtn" class="toolbar-btn btn-warning">从服务器下载</button>
        </div>

        <div id="webdavStatus" class="webdav-status"></div>
      </div>

      <div class="editor-actions">
        <button id="settingsCancelBtn" class="toolbar-btn">取消</button>
        <button id="settingsSaveBtn" class="toolbar-btn btn-primary">保存设置</button>
      </div>
    `;

    bindEvents();
    loadSettings();
    loadSyncTime();
  }

  function bindEvents() {
    document.getElementById('settingsBackBtn').addEventListener('click', close);
    document.getElementById('settingsCancelBtn').addEventListener('click', close);
    document.getElementById('settingsSaveBtn').addEventListener('click', saveSettings);

    document.getElementById('togglePasswordBtn').addEventListener('click', () => {
      const input = document.getElementById('webdavPassword');
      const btn = document.getElementById('togglePasswordBtn');
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '隐藏';
      } else {
        input.type = 'password';
        btn.textContent = '显示';
      }
    });

    document.getElementById('webdavTestBtn').addEventListener('click', testConnection);
    document.getElementById('webdavUpBtn').addEventListener('click', uploadData);
    document.getElementById('webdavDownBtn').addEventListener('click', downloadData);
  }

  function getFormData() {
    return {
      server: document.getElementById('webdavServer').value.trim(),
      username: document.getElementById('webdavUsername').value.trim(),
      password: document.getElementById('webdavPassword').value,
      path: document.getElementById('webdavPath').value.trim() || '/knowledge-cards-backup.json',
      autoSync: document.getElementById('webdavAutoSync').checked
    };
  }

  function loadSettings() {
    chrome.runtime.sendMessage({ type: 'WEBDAV_GET_SETTINGS' }, (response) => {
      if (response && response.success && response.settings) {
        const s = response.settings;
        if (s.server) document.getElementById('webdavServer').value = s.server;
        if (s.username) document.getElementById('webdavUsername').value = s.username;
        if (s.password) document.getElementById('webdavPassword').value = s.password;
        if (s.path) document.getElementById('webdavPath').value = s.path;
        if (s.autoSync) document.getElementById('webdavAutoSync').checked = true;
      }
    });
  }

  function loadSyncTime() {
    chrome.runtime.sendMessage({ type: 'WEBDAV_GET_SYNC_TIME' }, (response) => {
      if (response && response.success && response.lastSync) {
        const time = new Date(response.lastSync);
        const timeStr = time.toLocaleString('zh-CN');
        document.getElementById('webdavSyncInfo').textContent = '上次同步: ' + timeStr;
      } else {
        document.getElementById('webdavSyncInfo').textContent = '尚未同步过';
      }
    });
  }

  function setStatus(text, type) {
    const el = document.getElementById('webdavStatus');
    el.textContent = text;
    el.className = 'webdav-status ' + (type || '');
  }

  function setButtonsDisabled(disabled) {
    document.getElementById('webdavTestBtn').disabled = disabled;
    document.getElementById('webdavUpBtn').disabled = disabled;
    document.getElementById('webdavDownBtn').disabled = disabled;
  }

  async function testConnection() {
    const data = getFormData();
    if (!data.server) {
      setStatus('请填写服务器地址', 'error');
      return;
    }
    setStatus('正在测试连接...', 'loading');
    setButtonsDisabled(true);
    chrome.runtime.sendMessage({
      type: 'WEBDAV_TEST',
      server: data.server,
      username: data.username,
      password: data.password
    }, (response) => {
      setButtonsDisabled(false);
      if (response && response.success) {
        setStatus('连接成功', 'success');
      } else {
        setStatus('连接失败: ' + (response?.error || '未知错误'), 'error');
      }
    });
  }

  async function uploadData() {
    const data = getFormData();
    if (!data.server) {
      setStatus('请填写服务器地址', 'error');
      return;
    }
    setStatus('正在上传...', 'loading');
    setButtonsDisabled(true);
    chrome.runtime.sendMessage({
      type: 'WEBDAV_UPLOAD',
      server: data.server,
      username: data.username,
      password: data.password,
      path: data.path
    }, (response) => {
      setButtonsDisabled(false);
      if (response && response.success) {
        setStatus('上传成功', 'success');
        loadSyncTime();
      } else {
        setStatus('上传失败: ' + (response?.error || '未知错误'), 'error');
      }
    });
  }

  async function downloadData() {
    if (!confirm('从服务器下载将覆盖本地所有数据，是否继续？')) return;
    const data = getFormData();
    if (!data.server) {
      setStatus('请填写服务器地址', 'error');
      return;
    }
    setStatus('正在下载...', 'loading');
    setButtonsDisabled(true);
    chrome.runtime.sendMessage({
      type: 'WEBDAV_DOWNLOAD',
      server: data.server,
      username: data.username,
      password: data.password,
      path: data.path
    }, (response) => {
      setButtonsDisabled(false);
      if (response && response.success) {
        setStatus('下载成功，已恢复 ' + response.records + ' 张卡片和 ' + response.images + ' 张图片', 'success');
        loadSyncTime();
      } else {
        setStatus('下载失败: ' + (response?.error || '未知错误'), 'error');
      }
    });
  }

  async function saveSettings() {
    const data = getFormData();
    if (!data.server) {
      setStatus('请填写服务器地址', 'error');
      return;
    }
    chrome.runtime.sendMessage({
      type: 'WEBDAV_SAVE_SETTINGS',
      settings: data
    }, (response) => {
      if (response && response.success) {
        setStatus('设置已保存', 'success');
        setTimeout(() => close(), 800);
      } else {
        setStatus('保存失败: ' + (response?.error || '未知错误'), 'error');
      }
    });
  }

  return { open, close };
})();
