window.CardManager = window.CardManager || {};

window.CardManager.Export = (function () {
  function downloadJSON(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function readJSONFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e.target.error);
      reader.readAsText(file);
    });
  }

  async function exportToFile() {
    const records = await CardManager.Storage.getAll();
    const blobs = await CardManager.IDB.getAllBlobs();

    const images = [];
    for (const img of blobs) {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(img.blob);
      });
      images.push({
        recordId: img.recordId,
        id: img.id,
        dataUrl,
        filename: img.filename,
        createdAt: img.createdAt
      });
    }

    const payload = {
      version: 1,
      exportedAt: Date.now(),
      records,
      images
    };

    downloadJSON(payload, 'knowledge-cards-backup.json');
  }

  async function importFromFile(file) {
    const text = await readJSONFile(file);
    const data = JSON.parse(text);

    if (!data.records || !Array.isArray(data.records)) {
      throw new Error('Invalid import file: missing records array');
    }

    await CardManager.IDB.deleteAllImages();
    await CardManager.Storage.importAll(data.records);

    if (data.images && Array.isArray(data.images)) {
      const blobs = data.images.map(img => ({
        id: img.id,
        recordId: img.recordId,
        blob: dataURLtoBlob(img.dataUrl),
        filename: img.filename,
        createdAt: img.createdAt
      }));
      await CardManager.IDB.restoreImages(blobs);
    }

    return { records: data.records.length, images: (data.images || []).length };
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

  return { exportToFile, importFromFile, downloadJSON, readJSONFile };
})();
