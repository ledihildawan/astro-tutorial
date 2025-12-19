const defaultData = {
  activeId: 'bootstrap_xxl',
  profiles: {
    bootstrap_xxl: {
      name: 'Bootstrap 5 (XXL - 1400px)',
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
      name: 'Tailwind (Responsive Container)',
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

// --- State Management ---
let storageData = null;
let currentItems = [];
let isOverlayActive = false;

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
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupEventListeners();
});

function loadData() {
  chrome.storage.sync.get(['figmaOverlayData', 'isOverlayEnabled'], (data) => {
    if (data.figmaOverlayData && data.figmaOverlayData.profiles) {
      storageData = data.figmaOverlayData;
      // Revert locked profiles to default to ensure updates
      Object.keys(defaultData.profiles).forEach((key) => {
        if (!storageData.profiles[key]) {
          storageData.profiles[key] = defaultData.profiles[key];
        } else if (storageData.profiles[key].locked) {
          storageData.profiles[key] = defaultData.profiles[key];
        }
      });
    } else {
      storageData = JSON.parse(JSON.stringify(defaultData));
    }

    if (!storageData.profiles[storageData.activeId]) {
      storageData.activeId = Object.keys(storageData.profiles)[0];
    }

    // Load global toggle state
    if (data.isOverlayEnabled) {
      updateStatusUI(true);
    }

    renderMainView();
    // Don't disable immediately, let content script decide based on storage
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

// --- Main View Logic ---

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
  if (activeProfile.locked) {
    els.btnDelete.disabled = true;
    els.btnDelete.style.opacity = '0.5';
    els.btnRename.disabled = true;
    els.btnRename.style.opacity = '0.5';
    els.btnEdit.textContent = 'Clone & Edit';
  } else {
    els.btnDelete.disabled = false;
    els.btnDelete.style.opacity = '1';
    els.btnRename.disabled = false;
    els.btnRename.style.opacity = '1';
    els.btnEdit.textContent = 'Edit Layout';
  }
}

function updateStatusUI(active) {
  isOverlayActive = active;
  if (active) {
    els.statusText.className = 'status-indicator active';
    els.statusText.innerHTML = '<div class="dot"></div> <span>Overlay Active</span>';
    els.toggleBtn.textContent = 'Hide (G)';
    els.toggleBtn.classList.replace('btn-primary', 'btn-secondary');
  } else {
    els.statusText.className = 'status-indicator';
    els.statusText.innerHTML = '<div class="dot"></div> <span>Overlay Hidden</span>';
    els.toggleBtn.textContent = 'Show (G)';
    els.toggleBtn.classList.replace('btn-secondary', 'btn-primary');
  }
}

// --- Editor Logic ---

function openEditor(items) {
  currentItems = JSON.parse(JSON.stringify(items));
  els.editingName.textContent = storageData.profiles[storageData.activeId].name;
  renderEditorItems();
  switchView('editor');
}

function getSmartLayerName(item) {
  if (item.type === 'grid') {
    return `Grid • ${item.size || 8}px`;
  }
  if (item.type === 'rows') {
    return `Row ${item.count || 12} • ${item.gutter || 0}px Gut`;
  }
  const count = item.count || 12;
  const mode = item.typeMode || 'stretch';
  const modeCap = mode.charAt(0).toUpperCase() + mode.slice(1);
  let extraInfo = '';
  if (mode === 'stretch') {
    extraInfo = ` • ${item.margin || 0}px Mar`;
  } else {
    extraInfo = ` • ${item.width || 'Auto'}px`;
  }
  return `${count} Cols • ${modeCap}${extraInfo}`;
}

function renderEditorItems() {
  els.itemsList.innerHTML = '';

  if (currentItems.length === 0) {
    els.itemsList.innerHTML =
      '<div style="text-align:center; padding:30px; color:#555; font-size:12px; border: 1px dashed #333; border-radius: 8px;">No grid layers yet.<br>Click "+ Add Grid Layer" below.</div>';
    return;
  }

  // --- Hugeicons Collection (Stroke 1.5) ---
  const icons = {
    eyeOpen: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M21.544 11.045C21.848 11.4713 22 11.7345 22 12C22 12.2655 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C7.31078 19 3.8221 14.8706 2.45604 12.955C2.15201 12.5287 2 12.2655 2 12C2 11.7345 2.15201 11.4713 2.45604 11.045C3.8221 9.12944 7.31078 5 12 5C16.6892 5 20.1779 9.12944 21.544 11.045Z"/><path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z"/></svg>`,
    eyeClosed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12C22 12.2655 21.848 12.5287 21.544 12.955C20.1779 14.8706 16.6892 19 12 19C9.16035 19 6.74609 17.5028 4.96509 15.5M2.45604 11.045C2.15201 11.4713 2 11.7345 2 12C2 12.0837 2.01509 12.1648 2.04396 12.243M12 5C13.5657 5 14.9912 5.4607 16.2238 6.22559M9.89748 6.30752C7.30925 5.56708 4.67812 6.7562 2.45604 11.045"/><path d="M3 3L21 21"/><path d="M14.1213 14.1213C13.5587 14.6839 12.7929 15 12 15C10.3431 15 9 13.6569 9 12C9 11.2071 9.31607 10.4413 9.87868 9.87868"/></svg>`,
    chevronDown: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9.00005C18 9.00005 13.5811 15 12 15C10.4188 15 6 9 6 9"/></svg>`,
    chevronRight: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18C9 18 15 13.5812 15 12C15 10.4188 9 6 9 6"/></svg>`,
    trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M19.5 5.5L18.8803 15.5251C18.7219 18.0864 18.6428 19.3671 17.788 20.1835C16.9333 21 15.6502 21 13.084 21H10.916C8.3498 21 7.06669 21 6.21195 20.1835C5.3572 19.3671 5.27806 18.0864 5.11971 15.5251L4.5 5.5"/><path d="M3 5.5H21M16.0557 5.5L15.3731 4.09173C14.9196 3.15626 14.6928 2.68852 14.3017 2.39681C13.9106 2.1051 13.3915 2.1051 12.3533 2.1051H11.6467C10.6085 2.1051 10.0894 2.1051 9.69833 2.39681C9.30724 2.68852 9.08045 3.15626 8.6269 4.09173L7.94432 5.5"/></svg>`,
    col: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M9 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4H9V20Z"/><path d="M15 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4H15V20Z"/><path d="M9 4H15V20H9V4Z"/></svg>`,
    row: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2 18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V6C22 4.89543 21.1046 4 20 4H4C2.89543 4 2 4.89543 2 6V18Z"/><path d="M2 10H22"/><path d="M2 15H22"/></svg>`,
    grid: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M2 9V6C2 4.89543 2.89543 4 4 4H9V9H2Z"/><path d="M2 15V18C2 19.1046 2.89543 20 4 20H9V15H2Z"/><path d="M15 20H20C21.1046 20 22 19.1046 22 18V15H15V20Z"/><path d="M22 9V6C22 4.89543 21.1046 4 20 4H15V9H22Z"/></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4V20M20 12H4"/></svg>`,
  };

  currentItems.forEach((item, index) => {
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

    const div = document.createElement('div');
    div.className = 'layer-item';

    const smartTitle = getSmartLayerName(item);
    const layerIndex = index + 1;

    let html = `
      <div class="layer-header">
        <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
          <button class="btn-icon btn-collapse" data-idx="${index}" title="${item.collapsed ? 'Expand' : 'Collapse'}" style="flex-shrink:0;">
            ${chevronIcon}
          </button>
          
          <div style="display:flex; align-items:center; gap:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
             <span class="layer-index">#${layerIndex}</span>
             
             <div style="width:10px; height:10px; border-radius:3px; background:${item.color || '#ff0000'}; box-shadow:0 0 5px ${item.color}30; flex-shrink:0;"></div>
             <span class="layer-title">${smartTitle}</span>
          </div>
        </div>
        
        <div style="display:flex; align-items:center; gap:2px; flex-shrink:0;">
           <button class="btn-icon btn-visible" data-idx="${index}" title="Toggle Visibility" style="${!item.visible ? 'color:#666;' : 'color:#e0e0e0;'}">${eyeIcon}</button>
           <button class="btn-icon btn-remove" data-idx="${index}" title="Remove Layer">${icons.trash}</button>
        </div>
      </div>
      
      <div class="layer-body ${item.collapsed ? 'hidden' : ''}">
    `;

    html += `
        <div class="type-selector">
          <div class="type-option ${item.type === 'columns' || !item.type ? 'selected' : ''}" 
               data-action="set-type" data-val="columns" data-idx="${index}" title="Columns">
               ${icons.col} <span>Cols</span>
          </div>
          <div class="type-option ${item.type === 'rows' ? 'selected' : ''}" 
               data-action="set-type" data-val="rows" data-idx="${index}" title="Rows">
               ${icons.row} <span>Rows</span>
          </div>
          <div class="type-option ${item.type === 'grid' ? 'selected' : ''}" 
               data-action="set-type" data-val="grid" data-idx="${index}" title="Hard Grid">
               ${icons.grid} <span>Grid</span>
          </div>
        </div>
    `;

    if (isGrid) {
      html += `
        <div class="section-label">Grid Settings</div>
        <div class="editor-grid two-col">
           <div class="input-wrapper">
              <label>Square Size</label>
              <div class="input-container">
                <input type="number" data-idx="${index}" data-field="size" value="${item.size || 8}">
                <span class="suffix">px</span>
              </div>
           </div>
           <div class="input-wrapper">
              <label>Max Width</label>
              <div class="input-container">
                <input type="number" data-idx="${index}" data-field="maxWidth" value="${item.maxWidth || ''}" placeholder="Full">
                <span class="suffix">px</span>
              </div>
           </div>
        </div>
      `;
    } else {
      html += `<div class="section-label">Geometry</div>`;
      html += `<div class="editor-grid">
          <div class="input-wrapper">
            <label>Count</label>
            <div class="input-container">
              <input type="number" data-idx="${index}" data-field="count" value="${item.count || 12}">
            </div>
          </div>
          <div class="input-wrapper">
            <label>${sizeLabel}</label>
            <div class="input-container">
              <input type="number" data-idx="${index}" data-field="width" value="${item.width || ''}" 
                ${isStretch ? 'disabled placeholder="Auto"' : ''}>
              ${!isStretch ? '<span class="suffix">px</span>' : ''}
            </div>
          </div>
          <div class="input-wrapper">
            <label>Gutter</label>
            <div class="input-container">
              <input type="number" data-idx="${index}" data-field="gutter" value="${item.gutter ?? 20}">
              <span class="suffix">px</span>
            </div>
          </div>
      </div>`;

      html += `<div class="section-label">Position & Mode</div>`;
      html += `<div class="editor-grid">
          <div class="input-wrapper">
            <label>Max Width</label>
            <div class="input-container">
              <input type="number" data-idx="${index}" data-field="maxWidth" value="${item.maxWidth || ''}" placeholder="None">
              <span class="suffix">px</span>
            </div>
          </div>
          <div class="input-wrapper">
             <label>${spacingLabel}</label>
             <div class="input-container">
               <input type="number" data-idx="${index}" data-field="${isStretch ? 'margin' : 'offset'}" 
                value="${isStretch ? (item.margin ?? 0) : (item.offset ?? 0)}"
                ${!isStretch && isCenter ? 'disabled' : ''}>
               <span class="suffix">px</span>
             </div>
          </div>
          <div class="input-wrapper">
            <label>Mode</label>
            <div class="input-container">
              <select data-idx="${index}" data-field="typeMode" style="padding-right:4px;">
                <option value="stretch">Stretch</option>
                <option value="center">Center</option>
                <option value="left">Left / Top</option>
                <option value="right">Right / Bot</option>
              </select>
            </div>
          </div>
      </div>`;
    }

    html += `<div class="section-label">Appearance</div>`;
    html += `
      <div class="editor-grid two-col" style="margin-bottom:0;">
         <div class="input-wrapper">
            <label>Color</label>
            <div class="input-container">
              <input type="color" data-idx="${index}" data-field="color" value="${item.color || '#ff0000'}">
            </div>
         </div>
         <div class="input-wrapper">
            <label>Opacity</label>
            <div class="input-container">
              <input type="number" step="0.1" max="1" min="0" data-idx="${index}" data-field="opacity" value="${item.opacity || 0.1}">
            </div>
         </div>
      </div>
    `;

    html += `</div>`;
    div.innerHTML = html;

    if (!isGrid) {
      const selectEl = div.querySelector('select[data-field="typeMode"]');
      if (selectEl) selectEl.value = item.typeMode || 'stretch';
    }

    els.itemsList.appendChild(div);
  });

  attachEditorEvents();
}

function attachEditorEvents() {
  els.itemsList.querySelectorAll('input, select').forEach((input) => {
    // FIX 2: Validasi input & currentTarget
    input.addEventListener('change', (e) => handleItemChange(e));
  });

  els.itemsList.querySelectorAll('.type-option').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      // FIX 1: Gunakan currentTarget agar tidak error saat klik icon/text
      const idx = parseInt(e.currentTarget.dataset.idx);
      const newType = e.currentTarget.dataset.val;
      const item = currentItems[idx];

      if (!item) return; // Safety check

      if (item.type === newType) return;

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
    });
  });

  els.itemsList.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      currentItems.splice(idx, 1);
      renderEditorItems();
    });
  });

  els.itemsList.querySelectorAll('.btn-collapse').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      currentItems[idx].collapsed = !currentItems[idx].collapsed;
      renderEditorItems();
    });
  });

  els.itemsList.querySelectorAll('.btn-visible').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx);
      currentItems[idx].visible = !currentItems[idx].visible;
      renderEditorItems();
    });
  });
}

function handleItemChange(e) {
  // FIX 2: Validasi angka agar tidak NaN
  const idx = e.currentTarget.dataset.idx;
  const field = e.currentTarget.dataset.field;
  const val = e.currentTarget.value;
  const item = currentItems[idx];

  if (['count', 'width', 'gutter', 'margin', 'offset', 'size', 'opacity', 'maxWidth'].includes(field)) {
    if (val === '') {
      item[field] = null;
    } else {
      const parsed = parseFloat(val);
      item[field] = isNaN(parsed) ? 0 : parsed;
    }
  } else {
    item[field] = val;
  }
  if (field === 'typeMode') renderEditorItems();
}

// --- Communication & Persistence ---

function saveToStorage(applyNow = true) {
  chrome.storage.sync.set({ figmaOverlayData: storageData }, () => {
    if (applyNow) applyConfigToTab(true);
  });
}

function applyConfigToTab(forceActive = false) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(
        tabs[0].id,
        {
          action: 'apply',
          items: storageData.profiles[storageData.activeId].items,
          forceActive: forceActive,
        },
        () => {
          if (chrome.runtime.lastError) {
            /* ignore */
          } else if (forceActive) updateStatusUI(true);
        }
      );
    }
  });
}

function checkOverlayStatus() {
  updateStatusUI(isOverlayActive);
}

// --- Event Listeners Setup ---

function setupEventListeners() {
  els.profileSelect.addEventListener('change', (e) => {
    storageData.activeId = e.target.value;
    renderMainView();
    saveToStorage(true);
  });

  els.toggleBtn.addEventListener('click', () => {
    // FIX UX: Simpan state global agar persist saat refresh
    const isCurrentlyActive = els.statusText.classList.contains('active');
    const newState = !isCurrentlyActive;

    chrome.storage.sync.set({ isOverlayEnabled: newState });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle', forceState: newState }, () => updateStatusUI(newState));
      }
    });
  });

  els.btnEdit.addEventListener('click', () => {
    const current = storageData.profiles[storageData.activeId];
    if (current.locked) {
      if (!confirm(`"${current.name}" is a System Preset.\n\nCreate a customizable copy of this layout?`)) return;
      const newId = 'custom_' + Date.now();
      storageData.profiles[newId] = {
        name: current.name + ' (Copy)',
        locked: false,
        items: JSON.parse(JSON.stringify(current.items)),
      };
      storageData.activeId = newId;
      saveToStorage(true);
      renderMainView();
      openEditor(storageData.profiles[newId].items);
    } else {
      openEditor(current.items);
    }
  });

  document.getElementById('btn-create').addEventListener('click', () => {
    const name = prompt('Name your new layout:');
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
          maxWidth: 1200,
          color: '#ff0000',
          opacity: 0.1,
          visible: true,
          collapsed: false,
        },
      ],
    };
    storageData.activeId = newId;
    saveToStorage(true);
    renderMainView();
    openEditor(storageData.profiles[newId].items);
  });

  els.btnDelete.addEventListener('click', () => {
    if (storageData.profiles[storageData.activeId].locked) return;
    if (confirm(`Delete layout?`)) {
      delete storageData.profiles[storageData.activeId];
      storageData.activeId = Object.keys(storageData.profiles)[0];
      saveToStorage(true);
      renderMainView();
    }
  });

  els.btnRename.addEventListener('click', () => {
    const p = storageData.profiles[storageData.activeId];
    if (p.locked) return;
    const newName = prompt('Rename layout:', p.name);
    if (newName && newName.trim() !== '') {
      p.name = newName;
      saveToStorage(false);
      renderMainView();
    }
  });

  document.getElementById('add-layer-btn').addEventListener('click', () => {
    currentItems.push({
      type: 'columns',
      count: 12,
      typeMode: 'stretch',
      gutter: 20,
      margin: 20,
      color: '#ff0000',
      opacity: 0.1,
      visible: true,
      collapsed: false,
    });
    renderEditorItems();
    requestAnimationFrame(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    });
  });

  document.getElementById('btn-cancel').addEventListener('click', () => switchView('main'));

  document.getElementById('btn-save').addEventListener('click', () => {
    if (storageData.profiles[storageData.activeId].locked) return;

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      if (item.type !== 'grid') {
        const mw = item.maxWidth;
        const mg = item.margin || 0;
        const isStretch = item.typeMode === 'stretch' || !item.typeMode;

        if (mw !== null && mw !== undefined && mw <= 0) {
          alert(`Layer ${i + 1}: Max Width must be greater than 0.`);
          return;
        }

        if (isStretch && mw !== null && mw !== undefined && mw <= mg * 2) {
          alert(
            `Layer ${i + 1} Error (Stretch Mode):\nMax Width (${mw}px) is too small for the set Margins (${mg}px * 2 = ${mg * 2}px).\n\nPlease increase Max Width or decrease Margins.`
          );
          return;
        }
      }
    }

    storageData.profiles[storageData.activeId].items = currentItems;
    saveToStorage(true);
    switchView('main');
  });
}
