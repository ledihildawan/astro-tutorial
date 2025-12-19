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
  chrome.storage.sync.get('figmaOverlayData', (data) => {
    if (data.figmaOverlayData && data.figmaOverlayData.profiles) {
      storageData = data.figmaOverlayData;
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

    renderMainView();
    checkOverlayStatus();
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

// --- Editor Logic (MODERNIZED) ---

function openEditor(items) {
  currentItems = JSON.parse(JSON.stringify(items));
  els.editingName.textContent = storageData.profiles[storageData.activeId].name;
  renderEditorItems();
  switchView('editor');
}

function getSmartLayerName(item) {
  if (item.type === 'grid') {
    // Tampilkan ukuran kotak grid
    return `Grid • ${item.size || 8}px`;
  }

  if (item.type === 'rows') {
    // Tampilkan jumlah baris + Gutter
    return `Row ${item.count || 12} • ${item.gutter || 0}px Gut`;
  }

  // Logic untuk Columns (paling sering dipakai)
  const count = item.count || 12;
  const mode = item.typeMode || 'stretch';
  const modeCap = mode.charAt(0).toUpperCase() + mode.slice(1);
  const gutter = item.gutter || 0;

  // Jika mode Stretch, Margin itu penting. Jika Center, Width itu penting.
  let extraInfo = '';
  if (mode === 'stretch') {
    extraInfo = ` • ${item.margin || 0}px Mar`;
  } else {
    // Untuk Center/Left/Right, lebar kolom (Width) itu pembeda utama
    extraInfo = ` • ${item.width || 'Auto'}px`;
  }

  // Format Akhir: "8 Cols • Stretch • 20px Mar"
  return `${count} Cols • ${modeCap}${extraInfo}`;
}

// 2. Update renderEditorItems dengan logika Header baru
function renderEditorItems() {
  els.itemsList.innerHTML = '';

  if (currentItems.length === 0) {
    els.itemsList.innerHTML =
      '<div style="text-align:center; padding:30px; color:#555; font-size:12px; border: 1px dashed #333; border-radius: 8px;">No grid layers yet.<br>Click "+ Add Grid Layer" below.</div>';
    return;
  }

  currentItems.forEach((item, index) => {
    // ... (kode definisi variabel seperti isGrid, isRow tetap sama) ...
    if (item.visible === undefined) item.visible = true;
    if (item.collapsed === undefined) item.collapsed = false;

    const isGrid = item.type === 'grid';
    const isRow = item.type === 'rows';
    const isStretch = item.typeMode === 'stretch' || !item.typeMode;
    const isCenter = item.typeMode === 'center';
    const sizeLabel = isRow ? 'Height' : 'Width';
    const spacingLabel = isStretch ? 'Margin' : 'Offset';

    // Icons (Tetap sama)
    const eyeIcon = item.visible
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e0e0e0" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M1 1l22 22"></path></svg>`;

    const chevronIcon = item.collapsed
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

    // --- PERUBAHAN UTAMA DI SINI (HEADER UI) ---
    // Kita gunakan Smart Name dan Color Swatch

    const div = document.createElement('div');
    div.className = 'layer-item';

    // Generate Smart Name
    const smartTitle = getSmartLayerName(item);

    // Nomor urut (Layer 1, Layer 2, dst)
    const layerIndex = index + 1;

    let html = `
      <div class="layer-header">
        <div style="display:flex; align-items:center; gap:10px; overflow:hidden;">
          <button class="btn-icon btn-collapse" data-idx="${index}" title="${item.collapsed ? 'Expand' : 'Collapse'}" style="flex-shrink:0;">
            ${chevronIcon}
          </button>
          
          <div style="display:flex; align-items:center; gap:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
             
             <span style="font-size:10px; color:#666; font-family:monospace; background:#252525; padding:2px 5px; border-radius:4px; border:1px solid #333;">
               #${layerIndex}
             </span>

             <div style="width:8px; height:8px; border-radius:50%; background:${item.color || '#ff0000'}; box-shadow:0 0 4px ${item.color}40; flex-shrink:0;"></div>
             
             <span class="layer-title" style="color:#e0e0e0; font-size:12px; font-weight:500;">${smartTitle}</span>
          </div>

        </div>
        
        <div style="display:flex; align-items:center; gap:2px; flex-shrink:0;">
           <button class="btn-icon btn-visible" data-idx="${index}" title="Toggle Visibility" style="${!item.visible ? 'opacity:0.6;' : ''}">${eyeIcon}</button>
           <button class="btn-remove" data-idx="${index}">✕</button>
        </div>
      </div>
      
      <div class="layer-body ${item.collapsed ? 'hidden' : ''}">
    `;

    // ... (SISA KODE INPUT / EDITOR GRID DI BAWAHNYA SAMA PERSIS DENGAN SEBELUMNYA) ...
    // Pastikan Anda menyalin bagian Type Selector dan Grid Inputs dari jawaban sebelumnya
    // ke sini.

    // --- CONTOH LANJUTAN KODE (Supaya tidak error saat copy paste) ---
    html += `
        <div class="type-selector">
          <div class="type-option ${item.type === 'columns' || !item.type ? 'selected' : ''}" data-action="set-type" data-val="columns" data-idx="${index}">Columns</div>
          <div class="type-option ${item.type === 'rows' ? 'selected' : ''}" data-action="set-type" data-val="rows" data-idx="${index}">Rows</div>
          <div class="type-option ${item.type === 'grid' ? 'selected' : ''}" data-action="set-type" data-val="grid" data-idx="${index}">Grid</div>
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

    html += `</div>`; // Close layer-body
    div.innerHTML = html;

    // Set selected value manually
    if (!isGrid) {
      const selectEl = div.querySelector('select[data-field="typeMode"]');
      if (selectEl) selectEl.value = item.typeMode || 'stretch';
    }

    els.itemsList.appendChild(div);
  });

  attachEditorEvents();
}

function attachEditorEvents() {
  // 1. Input Changes
  els.itemsList.querySelectorAll('input, select').forEach((input) => {
    input.addEventListener('change', (e) => handleItemChange(e));
  });

  // 2. Type Selector Click
  els.itemsList.querySelectorAll('.type-option').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.idx);
      const newType = e.target.dataset.val;
      const item = currentItems[idx];

      if (item.type === newType) return;

      item.type = newType;
      if (newType === 'grid') {
        item.size = 8;
        // Clean up column props
        delete item.count;
        delete item.margin;
        delete item.offset;
        delete item.gutter;
        delete item.typeMode;
      } else {
        // Defaults for col/row
        if (!item.count) item.count = 12;
        if (!item.typeMode) item.typeMode = 'stretch';
      }
      renderEditorItems();
    });
  });

  // 3. Remove Button
  els.itemsList.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      currentItems.splice(e.target.dataset.idx, 1);
      renderEditorItems();
    });
  });

  // 4. Collapse Button
  els.itemsList.querySelectorAll('.btn-collapse').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.idx;
      currentItems[idx].collapsed = !currentItems[idx].collapsed;
      renderEditorItems();
    });
  });

  // 5. Visible Button
  els.itemsList.querySelectorAll('.btn-visible').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const idx = e.currentTarget.dataset.idx;
      currentItems[idx].visible = !currentItems[idx].visible;
      renderEditorItems();
    });
  });
}

function handleItemChange(e) {
  const idx = e.target.dataset.idx;
  const field = e.target.dataset.field;
  const val = e.target.value;
  const item = currentItems[idx];

  if (['count', 'width', 'gutter', 'margin', 'offset', 'size', 'opacity', 'maxWidth'].includes(field)) {
    item[field] = val === '' ? null : parseFloat(val);
  } else {
    item[field] = val;
  }

  // If changing mode to stretch/center, we need to re-render to enable/disable fields correctly
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
  updateStatusUI(false);
}

// --- Event Listeners Setup ---

function setupEventListeners() {
  els.profileSelect.addEventListener('change', (e) => {
    storageData.activeId = e.target.value;
    renderMainView();
    saveToStorage(true);
  });

  els.toggleBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }, () => updateStatusUI(!isOverlayActive));
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
