const defaultData = {
  activeId: 'bootstrap_xxl',
  profiles: {
    bootstrap_xxl: {
      name: 'Bootstrap 5 (XXL)',
      locked: true,
      items: [
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
      ],
    },
    tailwind_container: {
      name: 'Tailwind Container',
      locked: true,
      items: [
        {
          type: 'columns',
          count: 12,
          typeMode: 'stretch',
          maxWidth: 1280,
          gutter: 32,
          margin: 32,
          color: '#38bdf8',
          opacity: 0.1,
          visible: true,
          collapsed: false,
        },
      ],
    },
    mobile_ios: {
      name: 'Mobile (390px)',
      locked: true,
      items: [
        {
          type: 'columns',
          count: 4,
          typeMode: 'stretch',
          gutter: 16,
          margin: 20,
          color: '#ff4500',
          opacity: 0.1,
          visible: true,
          collapsed: false,
        },
      ],
    },
    baseline_8: {
      name: '8pt Hard Grid',
      locked: true,
      items: [{ type: 'grid', size: 8, color: '#e83e8c', opacity: 0.1, visible: true, collapsed: false }],
    },
  },
};

const icons = {
  eyeOpen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M21.544 11.045C21.848 11.4713 22 11.7345 22 12C22 12.2655 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C7.31078 19 3.8221 14.8706 2.45604 12.955C2.15201 12.5287 2 12.2655 2 12C2 11.7345 2.15201 11.4713 2.45604 11.045C3.8221 9.12944 7.31078 5 12 5C16.6892 5 20.1779 9.12944 21.544 11.045Z"/><path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"/></svg>`,
  eyeClosed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12C22 12.2655 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C9.16035 19 6.74609 17.5028 4.96509 15.5M2.45604 11.045C2.15201 11.4713 2 11.7345 2 12C2 12.0837 2.01509 12.1648 2.04396 12.243M12 5C13.5657 5 14.9912 5.4607 16.2238 6.22559M9.89748 6.30752C7.30925 5.56708 4.67812 6.7562 2.45604 11.045"/><path d="M3 3L21 21"/><path d="M14.1213 14.1213C13.5587 14.6839 12.7929 15 12 15C10.3431 15 9 13.6569 9 12C9 11.2071 9.31607 10.4413 9.87868 9.87868"/></svg>`,
  chevronDown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"/></svg>`,
  chevronRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18C9 18 15 13.5812 15 12C15 10.4188 9 6 9 6"/></svg>`,
  trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 17.788 20.1835C16.9333 21 15.6502 21 13.084 21H10.916C8.3498 21 7.06669 21 6.21195 20.1835C5.3572 19.3671 5.27806 18.0864 5.11971 15.5251L4.5 5.5"/><path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C13.9106 2.1051 13.3915 2.1051 12.3533 2.1051H11.6467C10.6085 2.1051 10.0894 2.1051 9.69833 2.39681C9.30724 2.68852 9.08045 3.15626 8.6269 4.09173L7.94432 5.5"/></svg>`,
  col: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4H9V20Z"/><path d="M15 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4H15V20Z"/><path d="M9 4H15V20H9V4Z"/></svg>`,
  row: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2 18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4H4C2.89543 4 2 4.89543 2 6V18Z"/><path d="M2 10H22"/><path d="M2 15H22"/></svg>`,
  grid: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2 9V6C2 4.89543 2.89543 4 4 4H9V9H2Z"/><path d="M2 15V18C2 19.1046 2.89543 20 4 20H9V15H2Z"/><path d="M15 20H20C21.1046 20 22 19.1046 22 18V15H15V20Z"/><path d="M22 9V6C22 4.89543 21.1046 4 20 4H15V9H22Z"/></svg>`,
};

// --- State Management ---
let storageData = null;
let currentItems = [];
let isOverlayActive = false;
let debounceTimer = null; // FIX: Global debounce variable

// --- DOM Elements ---
const els = {
  mainView: document.getElementById('main-view'),
  editorView: document.getElementById('editor-view'),
  profileSelect: document.getElementById('profile-select'),
  itemsList: document.getElementById('items-list'),
  statusText: document.getElementById('status-text'),
  toggleBtn: document.getElementById('toggle-btn'),
  btnDelete: document.getElementById('btn-delete'),
  btnRename: document.getElementById('btn-rename'),
  btnEdit: document.getElementById('btn-edit'),
  editingName: document.getElementById('editing-profile-name'),
  btnAddLayer: document.getElementById('add-layer-btn'),
  btnSave: document.getElementById('btn-save'),
  btnCancel: document.getElementById('btn-cancel'),
  btnCreate: document.getElementById('btn-create'),
};

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
  setupEditorDelegation();
});

function loadData() {
  chrome.storage.sync.get(['figmaOverlayData', 'isOverlayEnabled'], (data) => {
    if (data.figmaOverlayData && data.figmaOverlayData.profiles) {
      storageData = data.figmaOverlayData;
      // Revert locked profiles
      Object.keys(defaultData.profiles).forEach((key) => {
        if (!storageData.profiles[key] || storageData.profiles[key].locked) {
          storageData.profiles[key] = defaultData.profiles[key];
        }
      });
    } else {
      storageData = JSON.parse(JSON.stringify(defaultData));
    }

    if (!storageData.profiles[storageData.activeId]) {
      storageData.activeId = Object.keys(storageData.profiles)[0];
    }

    if (data.isOverlayEnabled) {
      updateStatusUI(true);
    }

    renderMainView();
  });
}

function switchView(viewName) {
  if (viewName === 'editor') {
    els.mainView.classList.remove('visible');
    els.editorView.classList.add('visible');
  } else {
    els.editorView.classList.remove('visible');
    els.mainView.classList.add('visible');
  }
}

function renderMainView() {
  els.profileSelect.innerHTML = '';
  const keys = Object.keys(storageData.profiles).sort((a, b) => {
    const pA = storageData.profiles[a];
    const pB = storageData.profiles[b];
    if (pA.locked && !pB.locked) return -1;
    if (!pA.locked && pB.locked) return 1;
    return 0;
  });

  keys.forEach((key) => {
    const p = storageData.profiles[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = p.name + (p.locked ? ' (System)' : '');
    if (key === storageData.activeId) option.selected = true;
    els.profileSelect.appendChild(option);
  });

  const activeProfile = storageData.profiles[storageData.activeId];
  const isLocked = activeProfile.locked;

  els.btnDelete.disabled = isLocked;
  els.btnDelete.style.opacity = isLocked ? '0.5' : '1';
  els.btnRename.disabled = isLocked;
  els.btnRename.style.opacity = isLocked ? '0.5' : '1';
  els.btnEdit.textContent = isLocked ? 'Clone & Edit' : 'Edit Layout';
}

function updateStatusUI(active) {
  isOverlayActive = active;
  els.toggleBtn.setAttribute('aria-pressed', active);

  if (active) {
    els.statusText.className = 'status-indicator active';
    els.statusText.innerHTML = '<div class="dot"></div> <span>Overlay Active</span>';
    els.toggleBtn.textContent = 'Hide (Ctrl+Shift+G)';
    els.toggleBtn.classList.replace('btn-primary', 'btn-secondary');
  } else {
    els.statusText.className = 'status-indicator';
    els.statusText.innerHTML = '<div class="dot"></div> <span>Overlay Hidden</span>';
    els.toggleBtn.textContent = 'Show (Ctrl+Shift+G)';
    els.toggleBtn.classList.replace('btn-secondary', 'btn-primary');
  }
}

function openEditor(items) {
  currentItems = JSON.parse(JSON.stringify(items));
  els.editingName.textContent = storageData.profiles[storageData.activeId].name;
  renderEditorItems();
  switchView('editor');
}

function getSmartLayerName(item) {
  if (item.type === 'grid') return `Grid • ${item.size || 8}px`;
  if (item.type === 'rows') return `Row ${item.count || 12} • ${item.gutter || 0}px Gut`;

  const count = item.count || 12;
  const mode = item.typeMode || 'stretch';
  const modeCap = mode.charAt(0).toUpperCase() + mode.slice(1);
  let extraInfo = mode === 'stretch' ? ` • ${item.margin || 0}px Mar` : ` • ${item.width || 'Auto'}px`;
  return `${count} Cols • ${modeCap}${extraInfo}`;
}

function generateLayerHTML(item, index) {
  if (item.visible === undefined) item.visible = true;
  if (item.collapsed === undefined) item.collapsed = false;

  const isGrid = item.type === 'grid';
  const isRow = item.type === 'rows';
  const isStretch = item.typeMode === 'stretch' || !item.typeMode;
  const isCenter = item.typeMode === 'center';
  const sizeLabel = isRow ? 'Height' : 'Width';
  const spacingLabel = isStretch ? 'Margin' : 'Offset';

  const eyeIcon = item.visible ? icons.eyeOpen : icons.eyeClosed;
  const chevronIcon = item.collapsed ? icons.chevronRight : icons.chevronDown;
  const smartTitle = getSmartLayerName(item);
  const layerIndex = index + 1;
  const isExpanded = !item.collapsed;

  let html = `
    <div class="layer-item" data-idx="${index}">
      <div class="layer-header">
        <div class="layer-header-left">
          <button class="btn-icon btn-collapse" data-idx="${index}">${chevronIcon}</button>
          <div class="layer-info-group">
             <span class="layer-index">#${layerIndex}</span>
             <div class="color-swatch" style="background:${item.color || '#ff0000'};"></div>
             <span class="layer-title" title="${smartTitle}">${smartTitle}</span>
          </div>
        </div>
        <div class="layer-header-right">
           <button class="btn-icon btn-visible ${!item.visible ? 'is-hidden' : ''}" data-idx="${index}">${eyeIcon}</button>
           <button class="btn-icon btn-remove" data-idx="${index}">${icons.trash}</button>
        </div>
      </div>
      <div class="layer-body ${!isExpanded ? 'hidden' : ''}">
        <div class="type-selector">
          <div class="type-option ${item.type === 'columns' || !item.type ? 'selected' : ''}" data-action="set-type" data-val="columns" data-idx="${index}">${icons.col} <span>Cols</span></div>
          <div class="type-option ${item.type === 'rows' ? 'selected' : ''}" data-action="set-type" data-val="rows" data-idx="${index}">${icons.row} <span>Rows</span></div>
          <div class="type-option ${item.type === 'grid' ? 'selected' : ''}" data-action="set-type" data-val="grid" data-idx="${index}">${icons.grid} <span>Grid</span></div>
        </div>
  `;

  if (isGrid) {
    html += `
      <div class="section-label">Grid Settings</div>
      <div class="editor-grid two-col">
         <div class="input-wrapper"><label>Square Size</label><div class="input-container"><input type="number" data-idx="${index}" data-field="size" value="${item.size || 8}"><span class="suffix">px</span></div></div>
         <div class="input-wrapper"><label>Max Width</label><div class="input-container"><input type="number" data-idx="${index}" data-field="maxWidth" value="${item.maxWidth || ''}" placeholder="Full"><span class="suffix">px</span></div></div>
      </div>
    `;
  } else {
    html += `
      <div class="section-label">Geometry</div>
      <div class="editor-grid">
          <div class="input-wrapper"><label>Count</label><div class="input-container"><input type="number" min="1" max="100" data-idx="${index}" data-field="count" value="${item.count || 12}"></div></div>
          <div class="input-wrapper"><label>${sizeLabel}</label><div class="input-container"><input type="number" data-idx="${index}" data-field="width" value="${item.width || ''}" ${isStretch ? 'disabled placeholder="Auto"' : ''}>${!isStretch ? '<span class="suffix">px</span>' : ''}</div></div>
          <div class="input-wrapper"><label>Gutter</label><div class="input-container"><input type="number" data-idx="${index}" data-field="gutter" value="${item.gutter ?? 20}"><span class="suffix">px</span></div></div>
      </div>
      <div class="section-label">Position & Mode</div>
      <div class="editor-grid">
          <div class="input-wrapper"><label>Max Width</label><div class="input-container"><input type="number" data-idx="${index}" data-field="maxWidth" value="${item.maxWidth || ''}" placeholder="None"><span class="suffix">px</span></div></div>
          <div class="input-wrapper"><label>${spacingLabel}</label><div class="input-container"><input type="number" step="0.1" data-idx="${index}" data-field="${isStretch ? 'margin' : 'offset'}" value="${isStretch ? (item.margin ?? 0) : (item.offset ?? 0)}" ${!isStretch && isCenter ? 'disabled' : ''}><span class="suffix">px</span></div></div>
          <div class="input-wrapper"><label>Mode</label><div class="input-container"><select data-idx="${index}" data-field="typeMode">
                <option value="stretch" ${item.typeMode === 'stretch' ? 'selected' : ''}>Stretch</option>
                <option value="center" ${item.typeMode === 'center' ? 'selected' : ''}>Center</option>
                <option value="left" ${item.typeMode === 'left' ? 'selected' : ''}>Left / Top</option>
                <option value="right" ${item.typeMode === 'right' ? 'selected' : ''}>Right / Bot</option>
          </select></div></div>
      </div>`;
  }

  html += `
      <div class="section-label">Appearance</div>
      <div class="editor-grid two-col mb-0">
         <div class="input-wrapper"><label>Color</label><div class="input-container"><input type="color" data-idx="${index}" data-field="color" value="${item.color || '#ff0000'}"></div></div>
         <div class="input-wrapper"><label>Opacity</label><div class="input-container"><input type="number" step="0.1" max="1" min="0" data-idx="${index}" data-field="opacity" value="${item.opacity || 0.1}"></div></div>
      </div></div></div>`;
  return html;
}

function renderEditorItems() {
  const scrollTop = els.itemsList.scrollTop;
  if (currentItems.length === 0) {
    els.itemsList.innerHTML = '<div class="empty-state">No grid layers yet.<br>Click "+ Add Grid Layer" below.</div>';
    return;
  }
  els.itemsList.innerHTML = currentItems.map((item, index) => generateLayerHTML(item, index)).join('');
  els.itemsList.scrollTop = scrollTop;
}

function setupEditorDelegation() {
  els.itemsList.addEventListener('click', (e) => {
    // 1. Collapse
    const btnCollapse = e.target.closest('.btn-collapse');
    if (btnCollapse) {
      const idx = parseInt(btnCollapse.dataset.idx);
      const item = currentItems[idx];
      item.collapsed = !item.collapsed;
      const layerItem = btnCollapse.closest('.layer-item');
      layerItem.querySelector('.layer-body').classList.toggle('hidden', item.collapsed);
      btnCollapse.innerHTML = item.collapsed ? icons.chevronRight : icons.chevronDown;
      return;
    }
    // 2. Visibility
    const btnVisible = e.target.closest('.btn-visible');
    if (btnVisible) {
      const idx = parseInt(btnVisible.dataset.idx);
      const item = currentItems[idx];
      item.visible = !item.visible;
      btnVisible.innerHTML = item.visible ? icons.eyeOpen : icons.eyeClosed;
      btnVisible.classList.toggle('is-hidden', !item.visible);
      saveToStorage(true);
      return;
    }
    // 3. Remove
    const btnRemove = e.target.closest('.btn-remove');
    if (btnRemove) {
      const idx = parseInt(btnRemove.dataset.idx);
      currentItems.splice(idx, 1);
      renderEditorItems();
      saveToStorage(true);
      return;
    }
    // 4. Type Selector
    const typeOption = e.target.closest('.type-option');
    if (typeOption) {
      const idx = parseInt(typeOption.dataset.idx);
      const newType = typeOption.dataset.val;
      const item = currentItems[idx];
      if (item.type !== newType) {
        item.type = newType;
        if (newType === 'grid') {
          item.size = 8;
          delete item.count;
          delete item.margin;
          delete item.offset;
          delete item.gutter;
          delete item.typeMode;
        } else {
          if (!item.count) item.count = 12;
          if (!item.typeMode) item.typeMode = 'stretch';
        }
        renderEditorItems();
      }
    }
  });

  els.itemsList.addEventListener('input', (e) => {
    const target = e.target;
    if (!target.dataset.field) return;
    const idx = parseInt(target.dataset.idx);
    const field = target.dataset.field;
    const item = currentItems[idx];

    // FIX: Parse Float dan Handle Empty String
    if (target.type === 'number' || field === 'opacity') {
      const val = parseFloat(target.value);
      item[field] = isNaN(val) ? '' : val;
    } else {
      item[field] = target.value;
    }

    if (field === 'color') {
      const swatch = target.closest('.layer-item').querySelector('.color-swatch');
      if (swatch) swatch.style.background = target.value;
    }
    const titleEl = target.closest('.layer-item').querySelector('.layer-title');
    if (titleEl) titleEl.textContent = getSmartLayerName(item);

    // FIX: Use Global Debounce
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      saveToStorage(true);
    }, 200);
  });

  els.itemsList.addEventListener('change', (e) => {
    const target = e.target;
    if (!target.dataset.field) return;
    if (target.dataset.field === 'typeMode') renderEditorItems();
    saveToStorage(true);
  });
}

function saveToStorage(applyNow = true) {
  if (!storageData || !storageData.profiles[storageData.activeId]) return;
  storageData.profiles[storageData.activeId].items = currentItems;
  chrome.storage.sync.set({ figmaOverlayData: storageData }, () => {
    if (applyNow) applyConfigToTab(true);
  });
}

function applyConfigToTab(forceActive = false) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'apply',
        items: storageData.profiles[storageData.activeId].items,
        forceActive: forceActive,
      });
    }
  });
}

function setupEventListeners() {
  els.profileSelect.addEventListener('change', (e) => {
    storageData.activeId = e.target.value;
    renderMainView();
    saveToStorage(true);
  });
  els.toggleBtn.addEventListener('click', () => {
    const newState = !isOverlayActive;
    chrome.storage.sync.set({ isOverlayEnabled: newState });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0])
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle', forceState: newState }, () => updateStatusUI(newState));
    });
  });
  els.btnEdit.addEventListener('click', () => {
    const current = storageData.profiles[storageData.activeId];
    if (current.locked) {
      if (!confirm(`"${current.name}" is System Locked.\nClone and edit?`)) return;
      const newName = prompt('New layout name:', current.name + ' (Custom)');
      if (!newName) return;
      const newId = 'custom_' + Date.now();
      storageData.profiles[newId] = { name: newName, locked: false, items: JSON.parse(JSON.stringify(current.items)) };
      storageData.activeId = newId;
      saveToStorage(true);
      renderMainView();
      openEditor(storageData.profiles[newId].items);
    } else {
      openEditor(current.items);
    }
  });
  els.btnCreate.addEventListener('click', () => {
    const name = prompt('New Layout Name:');
    if (!name) return;
    const newId = 'custom_' + Date.now();
    storageData.profiles[newId] = {
      name: name,
      locked: false,
      items: [
        {
          type: 'columns',
          count: 12,
          typeMode: 'stretch',
          gutter: 20,
          margin: 20,
          color: '#ff0000',
          opacity: 0.1,
          visible: true,
        },
      ],
    };
    storageData.activeId = newId;
    saveToStorage(true);
    renderMainView();
    openEditor(storageData.profiles[newId].items);
  });
  els.btnDelete.addEventListener('click', () => {
    if (confirm(`Delete layout?`)) {
      delete storageData.profiles[storageData.activeId];
      storageData.activeId = Object.keys(storageData.profiles)[0];
      saveToStorage(true);
      renderMainView();
    }
  });
  els.btnRename.addEventListener('click', () => {
    const name = prompt('Rename layout:', storageData.profiles[storageData.activeId].name);
    if (name) {
      storageData.profiles[storageData.activeId].name = name;
      saveToStorage(false);
      renderMainView();
    }
  });
  els.btnAddLayer.addEventListener('click', () => {
    currentItems.push({
      type: 'columns',
      count: 12,
      typeMode: 'stretch',
      gutter: 20,
      margin: 20,
      color: '#ff0000',
      opacity: 0.1,
      visible: true,
    });
    renderEditorItems();
    setTimeout(() => {
      els.itemsList.scrollTo({ top: els.itemsList.scrollHeight, behavior: 'smooth' });
    }, 50);
  });
  els.btnCancel.addEventListener('click', () => switchView('main'));
  els.btnSave.addEventListener('click', () => {
    saveToStorage(true);
    switchView('main');
  });
}
