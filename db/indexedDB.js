window.CardManager = window.CardManager || {};

window.CardManager.IDB = (function () {
  const DB_NAME = 'CardManagerDB';
  const DB_VERSION = 1;
  const STORE_NAME = 'images';

  function open() {
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

  async function saveImage(recordId, blob, filename) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const id = 'img_' + crypto.randomUUID();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = { id, recordId, blob, filename, createdAt: Date.now() };
      const req = store.put(record);
      req.onsuccess = () => resolve({ id, blobUrl: URL.createObjectURL(blob) });
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getImages(recordId) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('recordId');
      const req = index.getAll(recordId);
      req.onsuccess = (e) => {
        const images = e.target.result.map(img => ({
          id: img.id,
          blobUrl: URL.createObjectURL(img.blob),
          filename: img.filename
        }));
        resolve(images);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteImages(recordId) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('recordId');
      const req = index.openCursor(recordId);
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteImage(imageId) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(imageId);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function deleteAllImages() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getAllBlobs() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = (e) => {
        const images = e.target.result.map(img => ({
          recordId: img.recordId,
          id: img.id,
          blob: img.blob,
          filename: img.filename
        }));
        resolve(images);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function restoreImages(images) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      images.forEach(img => {
        store.put({
          id: img.id,
          recordId: img.recordId,
          blob: img.blob,
          filename: img.filename,
          createdAt: img.createdAt || Date.now()
        });
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  return {
    open,
    saveImage,
    getImages,
    deleteImages,
    deleteImage,
    deleteAllImages,
    getAllBlobs,
    restoreImages
  };
})();
