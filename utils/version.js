window.CardManager = window.CardManager || {};

window.CardManager.Version = (function () {
  function createSnapshot(record) {
    const clone = JSON.parse(JSON.stringify(record));
    clone.version = clone.version || {};
    clone.version.previous = JSON.parse(JSON.stringify(record));
    return clone;
  }

  function restore(record) {
    if (!record.version || !record.version.previous) return null;
    const previous = JSON.parse(JSON.stringify(record.version.previous));
    previous.version = previous.version || {};
    previous.version.previous = JSON.parse(JSON.stringify(record));
    return previous;
  }

  return { createSnapshot, restore };
})();
