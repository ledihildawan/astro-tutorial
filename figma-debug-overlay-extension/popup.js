// --- Real World Use Case Presets ---
const defaultData = {
  activeId: 'bootstrap_desk',
  profiles: {
    'bootstrap_desk': {
      name: 'Desktop: Bootstrap (1320px)',
      locked: false, // Sekarang bisa diedit/hapus
      items: [
        { type: 'columns', count: 12, typeMode: 'center', width: 80, gutter: 24, margin: 0, color: '#ff0000', opacity: 0.1 },
      ]
    },
    'tailwind_fixed': {
      name: 'Desktop: Tailwind (Full Width)',
      locked: false, // Sekarang bisa diedit/hapus
      items: [
        { type: 'columns', count: 12, typeMode: 'stretch', gutter: 32, margin: 40, color: '#38bdf8', opacity: 0.15 }
      ]
    },
    'mobile_std': {
      name: 'Mobile: iOS/Android (360-390px)',
      locked: false, // Sekarang bisa diedit/hapus
      items: [
        { type: 'columns', count: 4, typeMode: 'stretch', gutter: 16, margin: 20, color: '#ff0000', opacity: 0.1 },
        { type: 'grid', size: 8, color: '#00ff00', opacity: 0.05 }
      ]
    },
    'pixel_grid': {
      name: 'Utility: 8pt Baseline Grid',
      locked: false, // Sekarang bisa diedit/hapus
      items: [
        { type: 'grid', size: 8, color: '#666666', opacity: 0.15 }
      ]
    }
  }
};

// --- State Management ---
let storageData = null;
let currentItems = []; // Working copy for the editor
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
  editingName: document.getElementById('editing-profile-name')
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
      
      // Migration: Ensure presets exist but unlock them if they were previously locked
      // Ini memaksa unlock jika user sudah pernah menginstall versi sebelumnya
      Object.keys(storageData.profiles).forEach(key => {
        storageData.profiles[key].locked = false;
      });

      // Jika data lama tidak punya bootstrap (baru install), gabungkan dengan default
      if (!storageData.profiles['bootstrap_desk'] && !storageData.profiles[storageData.activeId]) {
         storageData = { ...defaultData, ...storageData };
      }
    } else {
      storageData = JSON.parse(JSON.stringify(defaultData));
    }

    // Safety check
    if (!storageData.profiles[storageData.activeId]) {
      const keys = Object.keys(storageData.profiles);
      if (keys.length > 0) storageData.activeId = keys[0];
      else storageData = JSON.parse(JSON.stringify(defaultData)); // Reset total jika kosong
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
  // 1. Render Select Options
  els.profileSelect.innerHTML = '';
  const profileKeys = Object.keys(storageData.profiles);
  
  profileKeys.forEach(key => {
    const p = storageData.profiles[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = p.name;
    if (key === storageData.activeId) option.selected = true;
    els.profileSelect.appendChild(option);
  });

  // 2. Handle Delete Button State
  // Kita izinkan hapus APA SAJA, asalkan bukan profile terakhir.
  if (profileKeys.length <= 1) {
    els.btnDelete.disabled = true;
    els.btnDelete.title = "Harus menyisakan minimal satu layout.";
  } else {
    els.btnDelete.disabled = false;
    els.btnDelete.title = "Hapus layout ini";
  }
  
  // Rename selalu aktif sekarang
  els.btnRename.disabled = false;
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
  // Deep copy items to avoid mutating directly before save
  currentItems = JSON.parse(JSON.stringify(items));
  els.editingName.textContent = storageData.profiles[storageData.activeId].name;
  renderEditorItems();
  switchView('editor');
}

function renderEditorItems() {
  els.itemsList.innerHTML = '';
  
  if (currentItems.length === 0) {
    els.itemsList.innerHTML = '<div style="text-align:center; padding:20px; color:#666; font-size:12px;">No grid layers yet.</div>';
  }

  currentItems.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'layer-item';

    const isGrid = item.type === 'grid';
    const isStretch = item.typeMode === 'stretch' || !item.typeMode;

    // --- Template String for Layer ---
    let html = `
      <div class="layer-header">
        <select class="input-type" data-idx="${index}" style="width: 120px;">
          <option value="columns">Columns</option>
          <option value="rows">Rows</option>
          <option value="grid">Pixel Grid</option>
        </select>
        <button class="btn-remove" data-idx="${index}" style="width:auto; padding:4px 8px; font-size:11px; background:transparent; color:#CF6679; border:1px solid #CF6679;">Remove</button>
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
          <div class="col"><label>Width (px)</label><input type="number" data-idx="${index}" data-field="width" value="${item.width || ''}" ${isStretch ? 'disabled placeholder="Auto"' : ''}></div>
          <div class="col"><label>Gutter</label><input type="number" data-idx="${index}" data-field="gutter" value="${item.gutter ?? 20}"></div>
        </div>
        <div class="row">
          <div class="col">
            <label>Alignment / Mode</label>
            <select data-idx="${index}" data-field="typeMode">
              <option value="stretch">Stretch (Auto Width)</option>
              <option value="center">Center</option>
              <option value="left">Left / Top</option>
              <option value="right">Right / Bottom</option>
            </select>
          </div>
           <div class="col"><label>Margin</label><input type="number" data-idx="${index}" data-field="margin" value="${item.margin ?? 0}"></div>
        </div>
        <div class="row">
          <div class="col"><label>Color</label><input type="color" data-idx="${index}" data-field="color" value="${item.color || '#ff0000'}" style="height:36px; padding:2px;"></div>
           <div class="col"><label>Opacity</label><input type="number" step="0.05" max="1" min="0" data-idx="${index}" data-field="opacity" value="${item.opacity || 0.1}"></div>
        </div>
      `;
    }

    div.innerHTML = html;
    
    // Set selects values
    div.querySelector('.input-type').value = item.type || 'columns';
    if(!isGrid) div.querySelector('[data-field="typeMode"]').value = item.typeMode || 'stretch';

    els.itemsList.appendChild(div);
  });

  // Attach Listeners for Inputs
  els.itemsList.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('change', (e) => handleItemChange(e));
  });

  els.itemsList.querySelectorAll('.btn-remove').forEach(btn => {
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
    // Changing layer type resets settings
    item.type = val;
    if (val === 'grid') {
      item.size = 8;
      delete item.count; delete item.margin; delete item.gutter; delete item.typeMode;
    } else {
      item.count = 12; item.typeMode = 'stretch';
    }
    renderEditorItems();
    return;
  }

  // Handle numeric fields
  if (['count', 'width', 'gutter', 'margin', 'size', 'opacity'].includes(field)) {
    item[field] = parseFloat(val);
  } else {
    item[field] = val;
  }
  
  if (field === 'typeMode') renderEditorItems(); // Re-render to toggle disable state
}

// --- Communication & Persistence ---

function saveToStorage(applyNow = true) {
  chrome.storage.sync.set({ 'figmaOverlayData': storageData }, () => {
    if (applyNow) {
      applyConfigToTab(true);
    }
  });
}

function applyConfigToTab(forceActive = false) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'apply', 
        items: storageData.profiles[storageData.activeId].items, 
        forceActive: forceActive 
      }, (response) => {
        if (chrome.runtime.lastError) { /* ignore */ }
        else if(forceActive) updateStatusUI(true);
      });
    }
  });
}

function checkOverlayStatus() {
  updateStatusUI(false); 
}

// --- Event Listeners Setup ---

function setupEventListeners() {
  
  // 1. Profile Select Change
  els.profileSelect.addEventListener('change', (e) => {
    storageData.activeId = e.target.value;
    renderMainView(); // Update buttons state
    saveToStorage(true); // Auto apply when switching
  });

  // 2. Toggle Overlay
  els.toggleBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }, () => {
           updateStatusUI(!isOverlayActive);
        });
      }
    });
  });

  // 3. Edit Button
  document.getElementById('btn-edit').addEventListener('click', () => {
    const items = storageData.profiles[storageData.activeId].items;
    openEditor(items);
  });

  // 4. Create New Button
  document.getElementById('btn-create').addEventListener('click', () => {
    const name = prompt("Beri nama layout baru (contoh: Tablet Landscape):");
    if (!name) return;

    const newId = 'custom_' + Date.now();
    storageData.profiles[newId] = {
      name: name,
      locked: false,
      items: [{ type: 'columns', count: 12, typeMode: 'stretch', gutter: 20, margin: 20, color: '#ff0000', opacity: 0.1 }]
    };
    storageData.activeId = newId;
    
    // Auto switch and open editor
    saveToStorage(true);
    renderMainView();
    openEditor(storageData.profiles[newId].items);
  });

  // 5. Delete Button
  els.btnDelete.addEventListener('click', () => {
    // Safety check: Don't delete if it's the last one
    if (Object.keys(storageData.profiles).length <= 1) {
      alert("Anda harus menyisakan setidaknya satu layout.");
      return;
    }
    
    const p = storageData.profiles[storageData.activeId];
    
    if (confirm(`Hapus layout "${p.name}"? Ini tidak bisa dikembalikan.`)) {
      delete storageData.profiles[storageData.activeId];
      // Fallback to first available
      storageData.activeId = Object.keys(storageData.profiles)[0];
      saveToStorage(true);
      renderMainView();
    }
  });

  // 6. Rename Button
  els.btnRename.addEventListener('click', () => {
    const p = storageData.profiles[storageData.activeId];
    
    const newName = prompt("Ganti nama layout:", p.name);
    if (newName && newName.trim() !== "") {
      p.name = newName;
      saveToStorage(false); // Just save name, no need to re-inject grid
      renderMainView();
    }
  });

  // --- Editor Buttons ---

  document.getElementById('add-layer-btn').addEventListener('click', () => {
    currentItems.push({ type: 'columns', count: 12, typeMode: 'stretch', gutter: 20, margin: 20, color: '#ff0000', opacity: 0.1 });
    renderEditorItems();
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    switchView('main');
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    // Commit changes to main storage
    storageData.profiles[storageData.activeId].items = currentItems;
    saveToStorage(true);
    switchView('main');
  });
}
