window.CardManager = window.CardManager || {};

window.CardManager.RecordCard = (function () {
  function getBarColors(systemTags, colorConfig) {
    const defaultColors = { text: '#4CAF50', image: '#2196F3', link: '#FF9800' };
    const colors = { ...defaultColors, ...colorConfig };
    const order = ['text', 'image', 'link'];
    const present = order.filter(t => systemTags.includes(t));

    if (present.length === 0) return ['#E0E0E0', '#E0E0E0', '#E0E0E0'];
    if (present.length === 1) return [colors[present[0]], colors[present[0]], colors[present[0]]];
    if (present.length === 2) return [colors[present[0]], colors[present[0]], colors[present[1]]];
    return [colors[present[0]], colors[present[1]], colors[present[2]]];
  }

  function render(record, options) {
    const card = document.createElement('div');
    card.className = 'card';
    if (record.pinned) card.classList.add('pinned');
    if (record.favorite) card.classList.add('favorite');
    card.dataset.id = record.id;

    const barColors = getBarColors(record.systemTags, options.colorConfig);

    const typeBar = document.createElement('div');
    typeBar.className = 'type-bar';
    barColors.forEach(color => {
      const seg = document.createElement('div');
      seg.className = 'type-segment';
      seg.style.background = color;
      typeBar.appendChild(seg);
    });

    const body = document.createElement('div');
    body.className = 'card-body';

    const header = document.createElement('div');
    header.className = 'card-header';

    const starBtn = document.createElement('button');
    starBtn.className = 'star-btn' + (record.favorite ? ' active' : '');
    starBtn.textContent = '★';
    starBtn.title = 'Favorite';
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onFavorite && options.onFavorite(record.id, !record.favorite);
    });

    const pinBtn = document.createElement('button');
    pinBtn.className = 'pin-btn' + (record.pinned ? ' active' : '');
    pinBtn.textContent = '📌';
    pinBtn.title = 'Pin';
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onPin && options.onPin(record.id, !record.pinned);
    });

    const title = document.createElement('span');
    title.className = 'card-title';
    title.textContent = record.title || '无标题';

    header.appendChild(starBtn);
    header.appendChild(pinBtn);
    header.appendChild(title);

    const preview = document.createElement('div');
    preview.className = 'card-preview';
    const text = (record.content.text || '').substring(0, 80);
    const imgCount = (record.content.images || []).length;
    const linkCount = (record.content.links || []).length;
    let previewText = text;
    if (imgCount > 0) previewText += (previewText ? ' · ' : '') + imgCount + ' 张图片';
    if (linkCount > 0) previewText += (previewText ? ' · ' : '') + linkCount + ' 个链接';
    preview.textContent = previewText || '空白卡片';

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'card-tags';
    CardManager.TagBar.render(tagsContainer, record.systemTags, record.customTags, { colorConfig: options.colorConfig });

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const date = new Date(record.updatedAt);
    meta.textContent = date.toLocaleDateString();

    body.appendChild(header);
    body.appendChild(preview);
    body.appendChild(tagsContainer);
    body.appendChild(meta);

    card.appendChild(typeBar);
    card.appendChild(body);

    if (options.batchMode) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'card-checkbox';
      checkbox.checked = options.isChecked;
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onCheck && options.onCheck(record.id);
      });
      card.appendChild(checkbox);
    }

    card.addEventListener('click', () => {
      if (!options.batchMode) {
        options.onEdit && options.onEdit(record.id);
      }
    });

    return card;
  }

  return { render };
})();
