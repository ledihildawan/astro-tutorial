(function () {
  let overlay = null;
  let isEnabled = false;
  let currentItems = [];

  // --- Utility Functions ---

  function parseColor(color = '#000000', alpha = 0.1) {
    if (typeof color === 'string' && color.match(/^rgb|a/)) {
      return color.replace(/[\d.]+(?=\)$)/, alpha);
    }
    let hex = color.replace('#', '');
    if (hex.length === 3)
      hex = hex
        .split('')
        .map((x) => x + x)
        .join('');
    const r = parseInt(hex.substr(0, 2), 16) || 0;
    const g = parseInt(hex.substr(2, 2), 16) || 0;
    const b = parseInt(hex.substr(4, 2), 16) || 0;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'figma-debug-overlay';
    // z-index sangat tinggi agar selalu di atas
    overlay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;';
    document.body.appendChild(overlay);
    return overlay;
  }

  // --- Rendering Logic ---

  function renderGrid(item) {
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    const col = parseColor(item.color || '#00ff00', item.opacity || 0.05);
    div.style.background = `linear-gradient(to right, ${col} 1px, transparent 1px), linear-gradient(to bottom, ${col} 1px, transparent 1px)`;
    div.style.backgroundSize = `${item.size || 8}px ${item.size || 8}px`;
    return div;
  }

  function renderLayout(item, isColumns = true) {
    const bg = parseColor(item.color || (isColumns ? '#ff0000' : '#0000ff'), item.opacity || 0.1);
    const isStretch = item.typeMode === 'stretch' || !item.typeMode;
    const count = item.count || 12;
    const gutter = item.gutter ?? 20;
    const margin = item.margin ?? 0;
    const fixedSize = item.width ?? (isColumns ? 80 : 60);
    const typeMode = item.typeMode || 'stretch';

    // VALIDASI FAIL-SAFE DI RENDERER
    // Pastikan maxWidth valid (angka > 0). Jika corrupt, anggap null (disable max-width)
    let maxWidth = item.maxWidth && !isNaN(item.maxWidth) && item.maxWidth > 0 ? item.maxWidth : null;

    // FAIL-SAFE 2: Jika maxWidth lebih kecil dari total margin, disable maxWidth
    // Ini mencegah grid rendering menjadi aneh/negatif
    if (maxWidth && maxWidth <= margin * 2) {
      console.warn('Figma Overlay: MaxWidth is smaller than total margins. Ignoring MaxWidth to prevent layout break.');
      maxWidth = null;
    }

    let align = 'center';
    let marginStart = margin;
    let marginEnd = margin;

    // Logic alignment
    if (typeMode === 'center') align = 'center';
    else if (typeMode === 'left' || (!isColumns && typeMode === 'top')) {
      align = 'start';
      marginEnd = 0;
    } else if (typeMode === 'right' || (!isColumns && typeMode === 'bottom')) {
      align = 'end';
      marginStart = 0;
    }

    const contentSize = count * fixedSize + (count > 1 ? (count - 1) * gutter : 0);

    let totalSize;
    if (isStretch) {
      totalSize = '100%';
    } else {
      totalSize = `${contentSize + marginStart + marginEnd}px`;
    }

    // Container Utama (Flex)
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:flex;';

    const justifyVal = align === 'center' ? 'center' : align === 'start' ? 'flex-start' : 'flex-end';
    container.style.justifyContent = isColumns ? justifyVal : 'stretch';
    container.style.alignItems = isColumns ? 'stretch' : justifyVal;

    // Grid Wrapper
    const gridDiv = document.createElement('div');
    gridDiv.style.display = 'grid';
    gridDiv.style[isColumns ? 'gridTemplateColumns' : 'gridTemplateRows'] = isStretch
      ? `repeat(${count}, 1fr)`
      : `repeat(${count}, ${fixedSize}px)`;
    gridDiv.style[isColumns ? 'columnGap' : 'rowGap'] = `${gutter}px`;

    gridDiv.style[isColumns ? 'width' : 'height'] = totalSize;
    gridDiv.style[isColumns ? 'height' : 'width'] = '100%';

    // Penerapan Max Width yang sudah divalidasi
    if (maxWidth && isColumns) {
      gridDiv.style.maxWidth = `${maxWidth}px`;
      if (isStretch) gridDiv.style.width = '100%';
    }

    gridDiv.style[isColumns ? 'paddingInline' : 'paddingBlock'] = `${marginStart}px ${marginEnd}px`;

    // Pastikan margin auto aktif jika container (maxWidth) dipakai agar tetap di tengah
    if (maxWidth && align === 'center' && isColumns) {
      gridDiv.style.marginInline = 'auto';
    }

    for (let i = 0; i < count; i++) {
      const cell = document.createElement('div');
      cell.style.background = bg;
      gridDiv.appendChild(cell);
    }

    container.appendChild(gridDiv);
    return container;
  }

  function renderItem(item) {
    if (!item || !item.type) return null;
    if (item.type === 'grid') {
      item.size = item.count || item.size || 8;
      return renderGrid(item);
    }
    if (item.type === 'columns') return renderLayout(item, true);
    if (item.type === 'rows') return renderLayout(item, false);
    return null;
  }

  function renderAll() {
    createOverlay();
    overlay.innerHTML = '';
    if (!currentItems || currentItems.length === 0) return;

    currentItems.forEach((item) => {
      const el = renderItem(item);
      if (el) overlay.appendChild(el);
    });
  }

  function toggleOverlay() {
    isEnabled = !isEnabled;
    if (isEnabled) renderAll();
    else if (overlay) overlay.innerHTML = '';
  }

  // --- Initialization ---

  chrome.storage.sync.get('figmaOverlayData', (data) => {
    const store = data.figmaOverlayData;
    if (store && store.activeId && store.profiles[store.activeId]) {
      currentItems = store.profiles[store.activeId].items;
    } else {
      currentItems = [];
    }
  });

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggleOverlay();
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'apply') {
      currentItems = msg.items || [];
      if (msg.forceActive) isEnabled = true;
      if (isEnabled) renderAll();
      else if (overlay) overlay.innerHTML = '';
    } else if (msg.action === 'toggle') {
      toggleOverlay();
    }
    sendResponse({ status: 'ok' });
    return true;
  });
})();
