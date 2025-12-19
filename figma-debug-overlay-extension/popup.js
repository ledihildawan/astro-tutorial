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
          margin: 0,
          color: '#dc3545',
          opacity: 0.08,
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
        },
      ],
    },
    mobile_ios: {
      name: 'Mobile (390px)',
      locked: true,
      items: [
        { type: 'columns', count: 4, typeMode: 'stretch', gutter: 16, margin: 20, color: '#ff4500', opacity: 0.1 },
      ],
    },
    baseline_8: {
      name: '8pt Hard Grid',
      locked: true,
      items: [{ type: 'grid', size: 8, color: '#e83e8c', opacity: 0.1 }],
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

// --- Editor Logic ---

function openEditor(items) {
  currentItems = JSON.parse(JSON.stringify(items));
  els.editingName.textContent = storageData.profiles[storageData.activeId].name;
  renderEditorItems();
  switchView('editor');
}

function renderEditorItems() {
  els.itemsList.innerHTML = '';

  if (currentItems.length === 0) {
    els.itemsList.innerHTML =
      '<div style="text-align:center; padding:20px; color:#666; font-size:12px;">No grid layers yet.</div>';
  }

  currentItems.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'layer-item';

    const isGrid = item.type === 'grid';
    const isStretch = item.typeMode === 'stretch' || !item.typeMode;

    let html = `
      <div class="layer-header">
        <select class="input-type" data-idx="${index}" style="width: 120px;">
          <option value="columns">Columns</option>
          <option value="rows">Rows</option>
          <option value="grid">Pixel Grid</option>
        </select>
        <button class="btn-remove" data-idx="${index}" style="width:auto; padding:4px 8px; font-size:11px; background:transparent; color:#CF6679; border:1px solid #CF6679; cursor:pointer;">Remove</button>
      </div>
    `;

    if (isGrid) {
      html += `
        <div class="row">
          <div class="col"><label>Square Size (px)</label><input type="number" data-idx="${index}" data-field="size" value="${item.size || 8}"></div>
          <div class="col"><label>Color</label><input type="color" data-idx="${index}" data-field="color" value="${item.color || '#00ff00'}" style="height:36px; padding:2px;"></div>
          <div class="col"><label>Opacity</label><input type="number" step="0.1" max="1" min="0" data-idx="${index}" data-field="opacity" value="${item.opacity || 0.1}"></div>
        </div>
      `;
    } else {
      html += `
        <div class="row">
          <div class="col"><label>Count</label><input type="number" data-idx="${index}" data-field="count" value="${item.count || 12}"></div>
          <div class="col"><label>Col Width</label><input type="number" data-idx="${index}" data-field="width" value="${item.width || ''}" ${isStretch ? 'disabled placeholder="Auto"' : ''} title="Width of a single column"></div>
          <div class="col"><label>Gutter</label><input type="number" data-idx="${index}" data-field="gutter" value="${item.gutter ?? 20}"></div>
        </div>
        <div class="row">
           <div class="col">
            <label>Max Width (Container)</label>
            <input type="number" data-idx="${index}" data-field="maxWidth" value="${item.maxWidth || ''}" placeholder="None" min="1">
          </div>
           <div class="col"><label>Margin (Side)</label><input type="number" data-idx="${index}" data-field="margin" value="${item.margin ?? 0}" min="0"></div>
        </div>
        <div class="row">
          <div class="col">
            <label>Alignment / Mode</label>
            <select data-idx="${index}" data-field="typeMode">
              <option value="stretch">Stretch (Fluid)</option>
              <option value="center">Center</option>
              <option value="left">Left / Top</option>
              <option value="right">Right / Bottom</option>
            </select>
          </div>
          <div class="col"><label>Color</label><input type="color" data-idx="${index}" data-field="color" value="${item.color || '#ff0000'}" style="height:36px; padding:2px;"></div>
          <div class="col"><label>Opacity</label><input type="number" step="0.05" max="1" min="0" data-idx="${index}" data-field="opacity" value="${item.opacity || 0.1}"></div>
        </div>
      `;
    }

    div.innerHTML = html;
    div.querySelector('.input-type').value = item.type || 'columns';
    if (!isGrid) div.querySelector('[data-field="typeMode"]').value = item.typeMode || 'stretch';

    els.itemsList.appendChild(div);
  });

  els.itemsList.querySelectorAll('input, select').forEach((input) => {
    input.addEventListener('change', (e) => handleItemChange(e));
  });

  els.itemsList.querySelectorAll('.btn-remove').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      currentItems.splice(e.target.dataset.idx, 1);
      renderEditorItems();
    });
  });
}

function handleItemChange(e) {
  const idx = e.target.dataset.idx;
  const field = e.target.dataset.field;
  const val = e.target.value;
  const item = currentItems[idx];

  if (e.target.classList.contains('input-type')) {
    item.type = val;
    if (val === 'grid') {
      item.size = 8;
      delete item.count;
      delete item.margin;
      delete item.gutter;
      delete item.typeMode;
      delete item.maxWidth;
    } else {
      item.count = 12;
      item.typeMode = 'stretch';
    }
    renderEditorItems();
    return;
  }

  if (['count', 'width', 'gutter', 'margin', 'size', 'opacity', 'maxWidth'].includes(field)) {
    // Convert empty strings to null for optional fields like maxWidth
    item[field] = val === '' ? null : parseFloat(val);
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
    });
    renderEditorItems();
  });

  document.getElementById('btn-cancel').addEventListener('click', () => switchView('main'));

  // --- UPDATED SAVE HANDLER WITH VALIDATION ---
  document.getElementById('btn-save').addEventListener('click', () => {
    if (storageData.profiles[storageData.activeId].locked) return;

    // VALIDATION LOOP
    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      if (item.type !== 'grid') {
        // Hanya validasi layout columns/rows
        const mw = item.maxWidth;
        const mg = item.margin || 0;

        // Cek 1: Max width tidak boleh negatif atau 0
        if (mw !== null && mw !== undefined && mw <= 0) {
          alert(`Layer ${i + 1}: Max Width must be greater than 0.`);
          return;
        }

        // Cek 2: Max Width HARUS lebih besar dari total Margin (Kiri + Kanan)
        // Jika tidak, content area menjadi negatif dan grid akan geser/rusak
        if (mw !== null && mw !== undefined && mw <= mg * 2) {
          alert(
            `Layer ${i + 1} Error:\nMax Width (${mw}px) is too small for the set Margins (${mg}px * 2 = ${mg * 2}px).\n\nPlease increase Max Width or decrease Margins.`
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
