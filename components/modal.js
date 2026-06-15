window.CardManager = window.CardManager || {};

window.CardManager.Modal = (function () {
  let currentRecord = null;
  let isEditing = false;
  let imageFiles = [];
  let linkEntries = [];
  let customTags = [];
  let refreshCallback = null;

  function open(record, onRefresh) {
    refreshCallback = onRefresh;
    currentRecord = record;
    isEditing = !!record;
    imageFiles = [];
    linkEntries = record ? (record.content.links || []).map(l => ({ ...l })) : [];
    customTags = record ? [...(record.customTags || [])] : [];

    document.getElementById('toolbar').style.display = 'none';
    document.getElementById('tagFilter').style.display = 'none';
    document.getElementById('filterBar').style.display = 'none';
    document.getElementById('cardList').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    const editorView = document.getElementById('editorView');
    editorView.style.display = 'block';
    renderEditor(editorView);
  }

  function close() {
    const editorView = document.getElementById('editorView');
    editorView.style.display = 'none';
    editorView.innerHTML = '';
    document.getElementById('toolbar').style.display = '';
    document.getElementById('tagFilter').style.display = '';
    document.getElementById('filterBar').style.display = '';
    document.getElementById('cardList').style.display = '';
    currentRecord = null;
    imageFiles = [];
    linkEntries = [];
    customTags = [];
    if (refreshCallback) refreshCallback();
  }

  function renderEditor(container) {
    const title = isEditing ? '编辑卡片' : '新建卡片';
    container.innerHTML = `
      <div class="editor-header">
        <div class="editor-header-top">
          <button id="editorBackBtn" class="toolbar-btn">← 返回</button>
          <h2>${title}</h2>
        </div>
        ${isEditing && currentRecord ? '<span class="card-times">创建: ' + new Date(currentRecord.createdAt).toLocaleString('zh-CN') + ' | 更新: ' + new Date(currentRecord.updatedAt).toLocaleString('zh-CN') + '</span>' : ''}
      </div>
      <div class="editor-content">
        <label>标题</label>
        <input type="text" id="editorTitle" placeholder="请输入标题..." value="${escapeHtml(currentRecord?.title || '')}" />

        <label>内容</label>
        <textarea id="editorText" rows="6" placeholder="请输入文本内容...">${escapeHtml(currentRecord?.content?.text || '')}</textarea>

        <hr class="editor-divider" />

        <label>链接</label>
        <div id="linksContainer" class="editor-section"></div>
        <button id="addLinkBtn" class="toolbar-btn btn-small">+ 添加链接</button>

        <label>图片</label>
        <div id="imagesPreview" class="editor-section images-preview"></div>
        <div id="dropZone" class="drop-zone">
          拖拽图片到此处或点击上传
          <input type="file" id="imageInput" multiple accept="image/*" style="display:none" />
        </div>

        <hr class="editor-divider" />

        <label>自定义标签</label>
        <div id="tagsContainer" class="editor-section tags-container"></div>
        <div class="tag-input-row">
          <input type="text" id="newTagInput" placeholder="新标签..." />
          <button id="addTagBtn" class="toolbar-btn btn-small">添加</button>
        </div>

        <div class="editor-footer">
          <div id="systemTagsPreview" class="system-tags-preview"></div>
          ${isEditing && currentRecord?.version?.previous ? '<button id="restoreBtn" class="toolbar-btn btn-warning">恢复上一版本</button>' : ''}
        </div>
      </div>

      <div class="editor-actions">
        <button id="editorCancelBtn" class="toolbar-btn">取消</button>
        <button id="editorSaveBtn" class="toolbar-btn btn-primary">保存</button>
      </div>
    `;

    bindEditorEvents();
    renderLinks();
    renderImagesPreview();
    renderTags();
    updateSystemTagsPreview();
  }

  function bindEditorEvents() {
    document.getElementById('editorBackBtn').addEventListener('click', close);
    document.getElementById('editorCancelBtn').addEventListener('click', close);
    document.getElementById('editorSaveBtn').addEventListener('click', save);

    document.getElementById('addLinkBtn').addEventListener('click', () => {
      linkEntries.push({ title: '', url: '' });
      renderLinks();
    });

    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');

    dropZone.addEventListener('click', () => imageInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      handleImageFiles(e.dataTransfer.files);
    });
    imageInput.addEventListener('change', (e) => handleImageFiles(e.target.files));

    document.getElementById('addTagBtn').addEventListener('click', addTag);
    document.getElementById('newTagInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addTag();
    });

    const restoreBtn = document.getElementById('restoreBtn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', restoreVersion);
    }

    document.getElementById('editorText').addEventListener('input', updateSystemTagsPreview);
  }

  function addTag() {
    const input = document.getElementById('newTagInput');
    const tag = input.value.trim();
    if (tag && !customTags.includes(tag)) {
      customTags.push(tag);
      renderTags();
    }
    input.value = '';
  }

  function renderLinks() {
    const container = document.getElementById('linksContainer');
    container.innerHTML = '';
    linkEntries.forEach((link, idx) => {
      const row = document.createElement('div');
      row.className = 'link-row';
      row.innerHTML = `
        <input type="text" placeholder="标题" class="link-title" value="${escapeHtml(link.title)}" />
        <input type="url" placeholder="网址" class="link-url" value="${escapeHtml(link.url)}" />
        <button class="link-remove btn-danger btn-small" title="删除">×</button>
      `;
      row.querySelector('.link-title').addEventListener('input', (e) => { linkEntries[idx].title = e.target.value; });
      row.querySelector('.link-url').addEventListener('input', (e) => { linkEntries[idx].url = e.target.value; });
      row.querySelector('.link-remove').addEventListener('click', () => {
        linkEntries.splice(idx, 1);
        renderLinks();
      });
      container.appendChild(row);
    });
  }

  function handleImageFiles(files) {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          imageFiles.push({ file, preview: e.target.result });
          renderImagesPreview();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  function renderImagesPreview() {
    const container = document.getElementById('imagesPreview');
    container.innerHTML = '';
    imageFiles.forEach((img, idx) => {
      const thumb = document.createElement('div');
      thumb.className = 'image-thumb';
      thumb.innerHTML = `
        <img src="${img.preview}" alt="${escapeHtml(img.file.name)}" />
        <button class="image-remove">×</button>
      `;
      thumb.querySelector('.image-remove').addEventListener('click', () => {
        imageFiles.splice(idx, 1);
        renderImagesPreview();
      });
      container.appendChild(thumb);
    });
  }

  function renderTags() {
    const container = document.getElementById('tagsContainer');
    container.innerHTML = '';
    customTags.forEach((tag, idx) => {
      const span = document.createElement('span');
      span.className = 'tag custom-tag';
      span.textContent = tag;
      const btn = document.createElement('button');
      btn.className = 'tag-remove';
      btn.textContent = '×';
      btn.addEventListener('click', () => {
        customTags.splice(idx, 1);
        renderTags();
      });
      span.appendChild(btn);
      container.appendChild(span);
    });
  }

  function updateSystemTagsPreview() {
    const text = document.getElementById('editorText').value;
    const tags = [];
    if (text.trim()) tags.push('text');
    if (imageFiles.length > 0) tags.push('image');
    if (linkEntries.some(l => l.url.trim())) tags.push('link');

    const container = document.getElementById('systemTagsPreview');
    container.innerHTML = '系统标签：';
    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag system-tag';
      span.textContent = tag;
      container.appendChild(span);
    });
  }

  async function save() {
    const title = document.getElementById('editorTitle').value.trim();
    const text = document.getElementById('editorText').value;

    const validLinks = linkEntries.filter(l => l.url.trim());

    const tempRecord = {
      title,
      content: { text, images: [], links: validLinks },
      customTags: [...customTags]
    };
    tempRecord.systemTags = CardManager.Classify.classify(tempRecord);

    if (isEditing && currentRecord) {
      const snapshot = CardManager.Version.createSnapshot(currentRecord);
      tempRecord.id = currentRecord.id;
      tempRecord.createdAt = currentRecord.createdAt;
      tempRecord.favorite = currentRecord.favorite;
      tempRecord.pinned = currentRecord.pinned;
      tempRecord.version = { previous: snapshot.version.previous };

      await CardManager.Storage.update(currentRecord.id, tempRecord);
      await saveImages(currentRecord.id);
      await CardManager.IDB.deleteImages(currentRecord.id);
    } else {
      const saved = await CardManager.Storage.save(tempRecord);
      await saveImages(saved.id);
    }

    close();
  }

  async function saveImages(recordId) {
    for (const img of imageFiles) {
      await CardManager.IDB.saveImage(recordId, img.file, img.file.name);
    }
  }

  async function restoreVersion() {
    if (!currentRecord || !currentRecord.version || !currentRecord.version.previous) return;
    const restored = CardManager.Version.restore(currentRecord);
    if (!restored) return;

    await CardManager.Storage.update(currentRecord.id, restored);
    close();
  }

  function isOpen() {
    return document.getElementById('editorView').style.display !== 'none';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { open, close, isOpen };
})();
