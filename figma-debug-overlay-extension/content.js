(function () {
  let overlay = null;
  let isEnabled = false;
  let currentItems = [];

  // --- Utility Functions ---

  function parseColor(color, alpha = 0.1) {
    if (!color) return `rgba(255, 0, 0, ${alpha})`; // Safety guard

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
    overlay.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:2147483647;display:flex;flex-direction:column;';

    // Append ke documentElement agar aman dari filter CSS di body
    document.documentElement.appendChild(overlay);
    return overlay;
  }

  // --- Render Logic ---
  function renderGrid(item) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:flex;width:100%;height:100%;';

    if (item.maxWidth && item.maxWidth > 0) {
      wrapper.style.maxWidth = `${item.maxWidth}px`;
      wrapper.style.marginInline = 'auto';
      wrapper.style.borderLeft = '1px dashed rgba(0,0,0,0.1)';
      wrapper.style.borderRight = '1px dashed rgba(0,0,0,0.1)';
      wrapper.style.backgroundPosition = 'center top';
    }

    const col = parseColor(item.color || '#00ff00', item.opacity || 0.05);
    wrapper.style.background = `linear-gradient(to right, ${col} 1px, transparent 1px), linear-gradient(to bottom, ${col} 1px, transparent 1px)`;
    wrapper.style.backgroundSize = `${item.size || 8}px ${item.size || 8}px`;

    return wrapper;
  }

  function renderLayout(item, isColumns = true) {
    const bg = parseColor(item.color || (isColumns ? '#ff0000' : '#0000ff'), item.opacity || 0.1);

    const mode = item.typeMode || 'stretch';
    const isStretchMode = mode === 'stretch';

    const count = item.count ?? 12;
    const gutter = item.gutter ?? 20;
    const offset = item.offset ?? 0;
    const margin = item.margin ?? 0;
    const fixedSize = item.width ?? (isColumns ? 80 : 60);

    let maxWidth = item.maxWidth && !isNaN(item.maxWidth) && item.maxWidth > 0 ? item.maxWidth : null;
    if (isStretchMode && maxWidth && maxWidth <= margin * 2) maxWidth = null;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.inset = '0';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.display = 'flex';
    wrapper.style.width = '100%';

    if (maxWidth) {
      wrapper.style.maxWidth = `${maxWidth}px`;
      wrapper.style.marginInline = 'auto';
    }

    let justify = 'center';
    if (isStretchMode) {
      justify = 'stretch';
    } else {
      if (mode === 'left' || (!isColumns && mode === 'top')) {
        justify = 'flex-start';
      } else if (mode === 'right' || (!isColumns && mode === 'bottom')) {
        justify = 'flex-end';
      } else if (mode === 'center') {
        justify = 'center';
      }
    }

    if (isColumns) {
      wrapper.style.justifyContent = justify;
      wrapper.style.alignItems = 'stretch';
    } else {
      wrapper.style.alignItems = justify;
      wrapper.style.justifyContent = 'stretch';
    }

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gap = `${gutter}px`;

    const templateUnit = isStretchMode ? '1fr' : `${fixedSize}px`;

    if (isColumns) {
      grid.style.gridTemplateColumns = `repeat(${count}, ${templateUnit})`;
      grid.style.height = '100%';
      grid.style.width = isStretchMode ? '100%' : 'auto';
    } else {
      grid.style.gridTemplateRows = `repeat(${count}, ${templateUnit})`;
      grid.style.width = '100%';
      grid.style.height = isStretchMode ? '100%' : 'auto';
    }

    if (isStretchMode) {
      const marginStyle = `${margin}px`;
      grid.style[isColumns ? 'paddingInline' : 'paddingBlock'] = marginStyle;
    } else {
      if (mode === 'left' || mode === 'top') {
        grid.style[isColumns ? 'marginLeft' : 'marginTop'] = `${offset}px`;
      } else if (mode === 'right' || mode === 'bottom') {
        grid.style[isColumns ? 'marginRight' : 'marginBottom'] = `${offset}px`;
      } else if (mode === 'center' && offset !== 0) {
        const axis = isColumns ? 'X' : 'Y';
        grid.style.transform = `translate${axis}(${offset}px)`;
      }
    }

    for (let i = 0; i < count; i++) {
      const cell = document.createElement('div');
      cell.style.background = bg;
      grid.appendChild(cell);
    }

    wrapper.appendChild(grid);
    return wrapper;
  }

  function renderItem(item) {
    if (!item || !item.type || item.visible === false) return null;
    if (item.type === 'grid') return renderGrid(item);
    return renderLayout(item, item.type === 'columns');
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

  // --- MAIN FIX IS HERE ---
  function toggleOverlay() {
    isEnabled = !isEnabled;

    // Simpan status terbaru ke Storage agar diingat saat Refresh
    chrome.storage.sync.set({ isOverlayEnabled: isEnabled });

    if (isEnabled) renderAll();
    else if (overlay) overlay.innerHTML = '';
  }

  // --- Initialization ---

  const defaultFallbackItems = [
    {
      type: 'columns',
      count: 12,
      typeMode: 'center',
      width: 80,
      gutter: 24,
      offset: 0,
      color: '#dc3545',
      opacity: 0.08,
      visible: true,
      collapsed: false,
    },
  ];

  chrome.storage.sync.get(['figmaOverlayData', 'isOverlayEnabled'], (data) => {
    const store = data.figmaOverlayData;

    // 1. Load Status Global (On/Off)
    if (data.isOverlayEnabled) {
      isEnabled = true;
    }

    // 2. Load Data Profil
    if (store && store.activeId && store.profiles[store.activeId]) {
      currentItems = store.profiles[store.activeId].items;
    } else {
      // Jika kosong, gunakan default fallback
      currentItems = defaultFallbackItems;
    }

    // 3. Render jika statusnya aktif
    if (isEnabled) renderAll();
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
      if (typeof msg.forceState !== 'undefined') {
        isEnabled = msg.forceState;
      } else {
        isEnabled = !isEnabled;
      }

      if (isEnabled) renderAll();
      else if (overlay) overlay.innerHTML = '';
    }
    sendResponse({ status: 'ok' });
    return true;
  });
})();
