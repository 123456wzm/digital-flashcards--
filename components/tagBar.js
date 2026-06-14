window.CardManager = window.CardManager || {};

window.CardManager.TagBar = (function () {
  function render(container, systemTags, customTags, options) {
    container.innerHTML = '';
    const colorConfig = options.colorConfig || { text: '#4CAF50', image: '#2196F3', link: '#FF9800' };

    systemTags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag system-tag';
      span.style.background = colorConfig[tag] || '#999';
      span.textContent = tag;
      container.appendChild(span);
    });

    customTags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tag custom-tag';
      span.textContent = tag;
      if (options.removable) {
        const btn = document.createElement('button');
        btn.className = 'tag-remove';
        btn.textContent = '×';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onRemove && options.onRemove(tag);
        });
        span.appendChild(btn);
      }
      container.appendChild(span);
    });
  }

  return { render };
})();
