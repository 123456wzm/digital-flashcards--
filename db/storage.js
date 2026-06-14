window.CardManager = window.CardManager || {};

window.CardManager.Storage = (function () {
  const RECORDS_KEY = 'knowledge_records';
  const COLOR_KEY = 'color_config';
  const DEFAULT_COLORS = { text: '#4CAF50', image: '#2196F3', link: '#FF9800' };

  function getStorage(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function setStorage(data) {
    return new Promise((resolve) => chrome.storage.local.set(data, resolve));
  }

  async function getAll() {
    const result = await getStorage([RECORDS_KEY]);
    const records = result[RECORDS_KEY] || [];
    return records.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }

  async function get(id) {
    const records = await getAll();
    return records.find(r => r.id === id) || null;
  }

  async function save(record) {
    const records = await getAll();
    if (record.id) {
      const idx = records.findIndex(r => r.id === record.id);
      if (idx !== -1) {
        records[idx] = { ...records[idx], ...record, updatedAt: Date.now() };
      } else {
        records.push({ ...record, updatedAt: Date.now() });
      }
    } else {
      record.id = crypto.randomUUID();
      record.createdAt = Date.now();
      record.updatedAt = Date.now();
      records.push(record);
    }
    await setStorage({ [RECORDS_KEY]: records });
    return record;
  }

  async function deleteRecord(id) {
    const records = await getAll();
    const filtered = records.filter(r => r.id !== id);
    await setStorage({ [RECORDS_KEY]: filtered });
  }

  async function deleteBatch(ids) {
    const records = await getAll();
    const filtered = records.filter(r => !ids.includes(r.id));
    await setStorage({ [RECORDS_KEY]: filtered });
  }

  async function update(id, changes) {
    const records = await getAll();
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return null;
    records[idx] = { ...records[idx], ...changes, updatedAt: Date.now() };
    await setStorage({ [RECORDS_KEY]: records });
    return records[idx];
  }

  async function setFavorite(id, value) {
    return update(id, { favorite: value });
  }

  async function setPinned(id, value) {
    return update(id, { pinned: value });
  }

  async function addCustomTag(id, tag) {
    const record = await get(id);
    if (!record) return null;
    if (!record.customTags.includes(tag)) {
      record.customTags.push(tag);
    }
    return update(id, { customTags: record.customTags });
  }

  async function removeCustomTag(id, tag) {
    const record = await get(id);
    if (!record) return null;
    record.customTags = record.customTags.filter(t => t !== tag);
    return update(id, { customTags: record.customTags });
  }

  async function batchAddTag(ids, tag) {
    const records = await getAll();
    records.forEach(r => {
      if (ids.includes(r.id) && !r.customTags.includes(tag)) {
        r.customTags.push(tag);
        r.updatedAt = Date.now();
      }
    });
    await setStorage({ [RECORDS_KEY]: records });
  }

  async function batchRemoveTag(ids, tag) {
    const records = await getAll();
    records.forEach(r => {
      if (ids.includes(r.id)) {
        r.customTags = r.customTags.filter(t => t !== tag);
        r.updatedAt = Date.now();
      }
    });
    await setStorage({ [RECORDS_KEY]: records });
  }

  async function importAll(records) {
    await setStorage({ [RECORDS_KEY]: records });
  }

  async function getColorConfig() {
    const result = await getStorage([COLOR_KEY]);
    return { ...DEFAULT_COLORS, ...(result[COLOR_KEY] || {}) };
  }

  async function setColorConfig(config) {
    await setStorage({ [COLOR_KEY]: config });
  }

  return {
    getAll,
    get,
    save,
    delete: deleteRecord,
    deleteBatch,
    update,
    setFavorite,
    setPinned,
    addCustomTag,
    removeCustomTag,
    batchAddTag,
    batchRemoveTag,
    importAll,
    getColorConfig,
    setColorConfig
  };
})();
