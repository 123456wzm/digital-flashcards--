window.CardManager = window.CardManager || {};

window.CardManager.Classify = (function () {
  function classify(record) {
    const tags = [];
    if (record.content && record.content.text && record.content.text.trim().length > 0) {
      tags.push('text');
    }
    if (record.content && record.content.images && record.content.images.length > 0) {
      tags.push('image');
    }
    if (record.content && record.content.links && record.content.links.length > 0) {
      tags.push('link');
    }
    return tags;
  }

  return { classify };
})();
