const RECORDS_KEY = 'knowledge_records';
const COLOR_KEY = 'color_config';
const DB_NAME = 'CardManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

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

chrome.runtime.onInstalled.addListener(() => {
  storageSet({ color_config: { text: '#4CAF50', image: '#2196F3', link: '#FF9800' } });
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
});
