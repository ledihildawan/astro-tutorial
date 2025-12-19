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
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
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
    // Membuat pola grid kotak-kotak menggunakan gradient
    div.style.background = `linear-gradient(to right, ${col} 1px, transparent 1px), linear-gradient(to bottom, ${col} 1px, transparent 1px)`;
    div.style.backgroundSize = `${item.size || 8}px ${item.size || 8}px`;
    return div;
  }

  function renderLayout(item, isColumns = true) {
    const bg = parseColor(item.color || (isColumns ? '#ff0000' : '#0000ff'), item.opacity || 0.1);
    const isStretch = item.typeMode === 'stretch' || !item.typeMode;
    const count = item.count || 12;
    const gutter = item.gutter ?? 20;
    const margin = item.margin ?? 40;
    const fixedSize = item.width ?? (isColumns ? 80 : 60);
    const typeMode = item.typeMode || 'stretch';

    let align = 'center';
    let marginStart = margin;
    let marginEnd = margin;
    
    // Logic alignment untuk non-stretch
    if (!isStretch) {
      if (typeMode === 'center') align = 'center';
      else if (typeMode === 'left' || (!isColumns && typeMode === 'top')) { align = 'start'; marginEnd = 0; }
      else if (typeMode === 'right' || (!isColumns && typeMode === 'bottom')) { align = 'end'; marginStart = 0; }
    }

    const contentSize = count * fixedSize + (count > 1 ? (count - 1) * gutter : 0);
    const totalSize = isStretch ? '100%' : `${contentSize + marginStart + marginEnd}px`;

    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:flex;';
    container.style.justifyContent = isColumns ? (align === 'center' ? 'center' : align === 'start' ? 'flex-start' : 'flex-end') : 'stretch';
    container.style.alignItems = isColumns ? 'stretch' : (align === 'center' ? 'center' : align === 'start' ? 'flex-start' : 'flex-end');

    const gridDiv = document.createElement('div');
    gridDiv.style.display = 'grid';
    gridDiv.style[isColumns ? 'gridTemplateColumns' : 'gridTemplateRows'] = isStretch ? `repeat(${count}, 1fr)` : `repeat(${count}, ${fixedSize}px)`;
    gridDiv.style[isColumns ? 'columnGap' : 'rowGap'] = `${gutter}px`;
    gridDiv.style[isColumns ? 'width' : 'height'] = totalSize;
    gridDiv.style[isColumns ? 'maxWidth' : 'maxHeight'] = '100%';
    gridDiv.style[isColumns ? 'height' : 'width'] = '100%';
    
    // Padding handled as margin simulation
    gridDiv.style[isColumns ? 'paddingInline' : 'paddingBlock'] = `${marginStart}px ${marginEnd}px`;
    
    if (!isStretch && align === 'center') {
      gridDiv.style[isColumns ? 'marginInline' : 'marginBlock'] = 'auto';
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
    
    currentItems.forEach(item => {
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

  // 1. Load data saat halaman di-refresh
  chrome.storage.sync.get('figmaOverlayData', data => {
    const store = data.figmaOverlayData;
    if (store && store.activeId && store.profiles[store.activeId]) {
      currentItems = store.profiles[store.activeId].items;
    } else {
      currentItems = [];
    }
    // Default tetap OFF saat reload, menunggu user menekan tombol/shortcut
  });

  // 2. Keyboard Shortcut Listener (G)
  document.addEventListener('keydown', e => {
    // Jangan trigger jika user sedang mengetik di input field
    const tag = e.target.tagName.toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;

    if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggleOverlay();
    }
  });

  // 3. Message Listener (Komunikasi dengan Popup)
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
