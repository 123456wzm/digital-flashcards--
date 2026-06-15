const RECORDS_KEY = 'knowledge_records';
const COLOR_KEY = 'color_config';
const WEBDAV_SETTINGS_KEY = 'webdav_settings';
const WEBDAV_SYNC_TIME_KEY = 'webdav_last_sync';
const DB_NAME = 'CardManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

let autoSyncEnabled = false;
let autoSyncTimeout = null;

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

function idbOpen() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('recordId', 'recordId', { unique: false });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function idbGetAll() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbClear() {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).clear();
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

async function idbPut(record) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(record);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function handleExport() {
  const result = await storageGet([RECORDS_KEY]);
  const records = result[RECORDS_KEY] || [];
  const blobs = await idbGetAll();
  const images = [];

  for (const img of blobs) {
    const dataUrl = await blobToDataURL(img.blob);
    images.push({
      recordId: img.recordId,
      id: img.id,
      dataUrl,
      filename: img.filename,
      createdAt: img.createdAt
    });
  }

  return {
    success: true,
    data: { version: 1, exportedAt: Date.now(), records, images }
  };
}

async function handleImport(payload) {
  if (!payload || !payload.records) {
    throw new Error('Invalid import payload');
  }

  await idbClear();
  await storageSet({ [RECORDS_KEY]: payload.records });

  if (payload.images && Array.isArray(payload.images)) {
    for (const img of payload.images) {
      await idbPut({
        id: img.id,
        recordId: img.recordId,
        blob: dataURLtoBlob(img.dataUrl),
        filename: img.filename,
        createdAt: img.createdAt || Date.now()
      });
    }
  }

  return { success: true, records: payload.records.length, images: (payload.images || []).length };
}

function buildWebDAVUrl(server, path) {
  const base = server.replace(/\/+$/, '');
  const filePath = path.startsWith('/') ? path : '/' + path;
  return base + filePath;
}

function getAuthHeader(username, password) {
  if (!username && !password) return {};
  const token = btoa(unescape(encodeURIComponent(username + ':' + password)));
  return { 'Authorization': 'Basic ' + token };
}

async function webdavRequest(method, server, username, password, path, body) {
  const url = buildWebDAVUrl(server, path);
  const headers = {
    ...getAuthHeader(username, password)
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }

  const options = { method, headers };
  if (body !== undefined) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  console.log('[WebDAV] Request:', method, url);
  const response = await fetch(url, options);
  return response;
}

async function webdavTestConnection(server, username, password) {
  try {
    const url = buildWebDAVUrl(server, '/');
    console.log('[WebDAV] Testing connection to:', url);
    const response = await fetch(url, {
      method: 'PROPFIND',
      headers: {
        ...getAuthHeader(username, password),
        'Depth': '0'
      }
    });
    console.log('[WebDAV] Response:', response.status, response.statusText);
    if (response.ok || response.status === 207 || response.status === 404 || response.status === 405) {
      return { success: true };
    }
    if (response.status === 401) {
      return { success: false, error: '认证失败，请检查用户名和密码' };
    }
    return { success: false, error: '连接失败，状态码: ' + response.status + ' ' + response.statusText };
  } catch (e) {
    console.error('[WebDAV] Connection error:', e);
    return { success: false, error: '网络错误: ' + e.message };
  }
}

async function webdavEnsureDirectory(server, username, password, path) {
  const parts = path.split('/').filter(Boolean);
  parts.pop();

  let currentPath = '';
  for (const part of parts) {
    currentPath += '/' + part;
    try {
      await webdavRequest('MKCOL', server, username, password, currentPath);
    } catch (e) {
      // 目录已存在时 MKCOL 会返回 405，忽略
    }
  }
}

async function webdavUpload(server, username, password, path, data) {
  try {
    await webdavEnsureDirectory(server, username, password, path);
    const response = await webdavRequest('PUT', server, username, password, path, data);
    console.log('[WebDAV] Upload response:', response.status, response.statusText);
    if (response.ok || response.status === 201 || response.status === 204) {
      await storageSet({ [WEBDAV_SYNC_TIME_KEY]: Date.now() });
      return { success: true };
    }
    return { success: false, error: '上传失败，状态码: ' + response.status + ' ' + response.statusText };
  } catch (e) {
    console.error('[WebDAV] Upload error:', e);
    return { success: false, error: '上传错误: ' + e.message };
  }
}

async function webdavDownload(server, username, password, path) {
  try {
    const response = await webdavRequest('GET', server, username, password, path);
    console.log('[WebDAV] Download response:', response.status, response.statusText);
    if (response.ok) {
      const text = await response.text();
      const data = JSON.parse(text);
      return { success: true, data };
    }
    if (response.status === 404) {
      return { success: false, error: '远程文件不存在' };
    }
    return { success: false, error: '下载失败，状态码: ' + response.status + ' ' + response.statusText };
  } catch (e) {
    console.error('[WebDAV] Download error:', e);
    return { success: false, error: '下载错误: ' + e.message };
  }
}

async function handleWebdavUpload(message) {
  const result = await handleExport();
  if (!result.success) return result;
  const { server, username, password, path } = message;
  return await webdavUpload(server, username, password, path, result.data);
}

async function handleWebdavDownload(message) {
  const { server, username, password, path } = message;
  const result = await webdavDownload(server, username, password, path);
  if (!result.success) return result;
  return await handleImport(result.data);
}

async function triggerAutoSync() {
  if (!autoSyncEnabled) return;
  const settings = (await storageGet([WEBDAV_SETTINGS_KEY]))[WEBDAV_SETTINGS_KEY];
  if (!settings || !settings.server) return;
  if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
  autoSyncTimeout = setTimeout(async () => {
    const result = await handleWebdavUpload({
      server: settings.server,
      username: settings.username,
      password: settings.password,
      path: settings.path
    });
    if (result.success) {
      console.log('[WebDAV] Auto sync completed');
    } else {
      console.error('[WebDAV] Auto sync failed:', result.error);
    }
  }, 2000);
}

async function loadAutoSyncSetting() {
  const settings = (await storageGet([WEBDAV_SETTINGS_KEY]))[WEBDAV_SETTINGS_KEY];
  autoSyncEnabled = !!(settings && settings.autoSync);
}

chrome.runtime.onInstalled.addListener(() => {
  storageSet({ color_config: { text: '#4CAF50', image: '#2196F3', link: '#FF9800' } });
  loadAutoSyncSetting();
});

loadAutoSyncSetting();

chrome.storage.local.onChanged.addListener((changes) => {
  if (changes[WEBDAV_SETTINGS_KEY]) {
    const newSettings = changes[WEBDAV_SETTINGS_KEY].newValue;
    autoSyncEnabled = !!(newSettings && newSettings.autoSync);
  }
  if (autoSyncEnabled && changes[RECORDS_KEY]) {
    triggerAutoSync();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXPORT_DATA') {
    handleExport().then(r => sendResponse(r)).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.type === 'IMPORT_DATA') {
    handleImport(message.payload).then(r => sendResponse(r)).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.type === 'GET_COLOR_CONFIG') {
    storageGet([COLOR_KEY]).then(r => sendResponse(r[COLOR_KEY] || { text: '#4CAF50', image: '#2196F3', link: '#FF9800' }));
    return true;
  }
  if (message.type === 'SET_COLOR_CONFIG') {
    storageSet({ [COLOR_KEY]: message.config }).then(() => sendResponse({ success: true }));
    return true;
  }
  if (message.type === 'WEBDAV_TEST') {
    webdavTestConnection(message.server, message.username, message.password)
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.type === 'WEBDAV_UPLOAD') {
    handleWebdavUpload(message)
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.type === 'WEBDAV_DOWNLOAD') {
    handleWebdavDownload(message)
      .then(r => sendResponse(r))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.type === 'WEBDAV_SAVE_SETTINGS') {
    storageSet({ [WEBDAV_SETTINGS_KEY]: message.settings })
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.type === 'WEBDAV_GET_SETTINGS') {
    storageGet([WEBDAV_SETTINGS_KEY])
      .then(r => sendResponse({ success: true, settings: r[WEBDAV_SETTINGS_KEY] || {} }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
  if (message.type === 'WEBDAV_GET_SYNC_TIME') {
    storageGet([WEBDAV_SYNC_TIME_KEY])
      .then(r => sendResponse({ success: true, lastSync: r[WEBDAV_SYNC_TIME_KEY] || null }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }
});
