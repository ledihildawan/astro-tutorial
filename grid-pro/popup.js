/**
 * GRID PRO - popup.js (Refactored Version)
 * Author: Md Pabel (mdpabel.com)
 */

const SYSTEM_PROFILES = {
  'bootstrap_xxl': {
    name: 'Bootstrap 5 (XXL)', locked: true,
    items: [{ type: 'columns', count: 12, typeMode: 'center', width: 80, gutter: 24, offset: 0, color: '#dc3545', opacity: 0.15, visible: true, maxWidth: 1320 }]
  },
  'tailwind_container': {
    name: 'Tailwind Container', locked: true,
    items: [{ type: 'columns', count: 12, typeMode: 'stretch', maxWidth: 1280, gutter: 32, margin: 32, color: '#38bdf8', opacity: 0.15, visible: true }]
  }
};

class GridApp {
  constructor() {
    this.profiles = { ...SYSTEM_PROFILES };
    this.activeId = 'bootstrap_xxl';
    this.editingIndex = null;
    
    // Utilities
    this.saveDebounced = this.debounce(() => this.persist(), 300);
    
    this.init();
  }

  async init() {
    this.cacheDOM();
    await this.load();
    this.bindEvents();
    this.syncInitialStatus();
    this.render();
  }

  cacheDOM() {
    this.dom = {
      // Containers
      main: document.getElementById('main-content'),
      layersList: document.getElementById('layers-list'),
      editorPanel: document.getElementById('editor-panel'),
      editorFields: document.getElementById('editor-fields'),
      
      // Global Controls
      toggle: document.getElementById('global-toggle'),
      profileSelect: document.getElementById('profile-select'),
      importInput: document.getElementById('import-input'),
      
      // Buttons
      btnRename: document.getElementById('btn-rename-profile'),
      btnDelete: document.getElementById('btn-delete-profile'),
      btnAddLayer: document.getElementById('btn-add-layer'),
      btnCloseEditor: document.getElementById('btn-close-editor'),
      segments: document.querySelectorAll('.segment')
    };
  }

  // --- PERSISTENCE & SYNC ---

  async load() {
    const d = await chrome.storage.local.get(['store']);
    if (d.store) {
      if (d.store.profiles) {
        const migrated = {};
        Object.entries(d.store.profiles).forEach(([id, p]) => {
          migrated[id] = { 
            ...p, 
            items: (p.items || []).map(item => ({ 
              typeMode: 'stretch', maxWidth: 0, offset: 0, ...item 
            })) 
          };
        });
        this.profiles = { ...SYSTEM_PROFILES, ...migrated };
      }
      this.activeId = d.store.activeProfileId || 'bootstrap_xxl';
    }
  }

  persist() {
    const customs = {};
    Object.entries(this.profiles).forEach(([id, p]) => { 
      if (!p.locked) customs[id] = p; 
    });
    chrome.storage.local.set({ 
      store: { profiles: customs, activeProfileId: this.activeId } 
    });
  }

  pushToContent() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'UPDATE', 
          items: this.getCurrent().items 
        }).catch(() => {});
      }
    });
  }

  syncInitialStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_STATUS' }, (res) => {
          if (!chrome.runtime.lastError && res) {
            this.dom.toggle.checked = res.enabled;
          }
        });
        this.pushToContent();
      }
    });
  }

  // --- CORE LOGIC ---

  getCurrent() { 
    return this.profiles[this.activeId] || this.profiles['bootstrap_xxl']; 
  }

  bindEvents() {
    // Global Toggle
    this.dom.toggle.addEventListener('change', (e) => this.handleGlobalToggle(e.target.checked));

    // Profile Management
    this.dom.profileSelect.addEventListener('change', (e) => this.switchProfile(e.target.value));
    document.getElementById('btn-add-profile').onclick = () => this.addProfile();
    document.getElementById('btn-duplicate-profile').onclick = () => this.duplicateProfile();
    this.dom.btnRename.onclick = () => this.renameProfile();
    this.dom.btnDelete.onclick = () => this.deleteProfile();
    
    // Import/Export
    document.getElementById('btn-export-profile').onclick = () => this.exportProfile();
    document.getElementById('btn-import-profile').onclick = () => this.dom.importInput.click();
    this.dom.importInput.onchange = (e) => this.importProfile(e);

    // Layers
    this.dom.btnAddLayer.onclick = () => this.addLayer();
    this.dom.layersList.oninput = (e) => this.handleLayerQuickOpacity(e);
    this.dom.layersList.onclick = (e) => this.handleLayerClick(e);

    // Editor
    this.dom.btnCloseEditor.onclick = () => this.closeEditor();
    this.dom.segments.forEach(s => s.onclick = (e) => this.switchType(e.target.dataset.type));
    this.dom.editorFields.oninput = (e) => this.handleEditorInput(e);
  }

  // --- ACTION HANDLERS ---

  handleGlobalToggle(enabled) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_LOCAL' });
        chrome.runtime.sendMessage({ 
          action: 'SYNC_UI', 
          enabled, 
          tabId: tabs[0].id 
        });
      }
    });
  }

  switchProfile(id) {
    this.activeId = id;
    this.closeEditor();
    this.render();
    this.persist();
    this.pushToContent();
  }

  addProfile() {
    const name = prompt("New Preset Name:");
    if (!name) return;
    const id = 'c_' + Date.now();
    this.profiles[id] = { name: name.substring(0, 30), items: [], locked: false };
    this.switchProfile(id);
  }

  renameProfile() {
    const cur = this.getCurrent();
    if (cur.locked) return;
    const name = prompt("Rename preset to:", cur.name);
    if (name?.trim()) {
      cur.name = name.substring(0, 30);
      this.render();
      this.persist();
    }
  }

  duplicateProfile() {
    const cur = this.getCurrent();
    const name = prompt("Duplicate as:", `${cur.name} (Copy)`);
    if (!name) return;
    const id = 'c_' + Date.now();
    this.profiles[id] = { 
      name: name.substring(0, 30), 
      items: JSON.parse(JSON.stringify(cur.items)), 
      locked: false 
    };
    this.switchProfile(id);
  }

  deleteProfile() {
    const cur = this.getCurrent();
    if (cur.locked) return;
    if (confirm(`Delete preset "${cur.name}"?`)) {
      delete this.profiles[this.activeId];
      this.activeId = Object.keys(this.profiles)[0];
      this.render();
      this.persist();
      this.pushToContent();
    }
  }

  exportProfile() {
    const cur = this.getCurrent();
    const blob = new Blob([JSON.stringify(cur, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grid-pro-${cur.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importProfile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      try {
        const imported = JSON.parse(re.target.result);
        if (!imported.items) throw new Error();
        const id = 'c_' + Date.now();
        this.profiles[id] = { 
          name: (imported.name || 'Imported') + ' (Import)', 
          items: imported.items, 
          locked: false 
        };
        this.switchProfile(id);
      } catch (err) { alert('Invalid JSON Grid Profile'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  // --- LAYER & EDITOR HANDLERS ---

  addLayer() {
    const cur = this.getCurrent();
    if (cur.locked) return;
    cur.items.push({ 
      type: 'columns', count: 12, gutter: 24, margin: 24, color: '#3b82f6', 
      opacity: 0.15, visible: true, maxWidth: 0, offset: 0, size: 20, width: 80, height: 80 
    });
    this.renderLayers();
    this.openEditor(cur.items.length - 1);
    this.persist();
    this.pushToContent();
  }

  handleLayerClick(e) {
    const card = e.target.closest('.layer-card');
    if (!card) return;
    const idx = parseInt(card.dataset.idx);
    const cur = this.getCurrent();

    if (e.target.closest('.btn-vis')) {
      if (cur.locked) return;
      cur.items[idx].visible = !cur.items[idx].visible;
      this.renderLayers();
    } else if (e.target.closest('.btn-del')) {
      if (cur.locked) return;
      cur.items.splice(idx, 1);
      this.closeEditor();
      this.renderLayers();
    } else if (!e.target.classList.contains('quick-opacity')) {
      this.openEditor(idx);
    }
    
    this.persist();
    this.pushToContent();
  }

  handleLayerQuickOpacity(e) {
    if (!e.target.classList.contains('quick-opacity')) return;
    const idx = e.target.dataset.idx;
    const val = parseFloat(e.target.value);
    this.getCurrent().items[idx].opacity = val;
    
    const label = e.target.closest('.layer-card').querySelector('.op-val');
    label.textContent = `${Math.round(val * 100)}%`;
    
    this.pushToContent();
    this.saveDebounced();
  }

  openEditor(idx) {
    this.editingIndex = idx;
    const item = this.getCurrent().items[idx];
    const isLocked = this.getCurrent().locked;

    this.dom.editorPanel.classList.add('open');
    this.dom.main.classList.add('dimmed');
    this.dom.segments.forEach(s => s.classList.toggle('active', s.dataset.type === item.type));

    this.renderEditorFields(item, isLocked);
  }

  renderEditorFields(item, isLocked) {
    let html = isLocked ? `<div class="locked-banner">VIEW MODE — SYSTEM PRESET</div>` : '';
    const field = (label, key, type='number', step=1) => `
      <div class="field">
        <label>${label}</label>
        <input type="${type}" data-key="${key}" value="${item[key] ?? ''}" step="${step}" ${isLocked ? 'disabled' : ''}>
      </div>`;

    if (item.type === 'grid') {
      html += field('Cell Size (px)', 'size') + field('Color', 'color', 'color') + field('Opacity', 'opacity', 'number', 0.01);
    } else {
      const isR = item.type === 'rows';
      html += field('Count', 'count') + field('Gutter (px)', 'gutter');
      html += `
        <div class="field">
          <label>Align</label>
          <select data-key="typeMode" ${isLocked ? 'disabled' : ''}>
            <option value="stretch" ${item.typeMode==='stretch'?'selected':''}>Stretch</option>
            <option value="center" ${item.typeMode==='center'?'selected':''}>Center</option>
            <option value="${isR?'top':'left'}" ${item.typeMode===(isR?'top':'left')?'selected':''}>${isR?'Top':'Left'}</option>
            <option value="${isR?'bottom':'right'}" ${item.typeMode===(isR?'bottom':'right')?'selected':''}>${isR?'Bottom':'Right'}</option>
          </select>
        </div>`;
      html += (item.typeMode === 'stretch') ? field('Margin (px)', 'margin') : field(isR ? 'Height (px)' : 'Width (px)', isR ? 'height' : 'width');
      html += field('Max Container (px)', 'maxWidth') + field('Color', 'color', 'color') + field('Opacity', 'opacity', 'number', 0.01);
    }
    this.dom.editorFields.innerHTML = html;
  }

  handleEditorInput(e) {
    if (this.getCurrent().locked) return;
    const item = this.getCurrent().items[this.editingIndex];
    const key = e.target.dataset.key;
    let val = e.target.value;

    if (e.target.type === 'number') {
      val = parseFloat(val) || 0;
      if (val < 0) val = 0;
      if (key === 'opacity' && val > 1) val = 1;
      if (key === 'count' && val < 1 && item.type !== 'grid') val = 1;
    }

    item[key] = val;
    this.pushToContent();
    this.saveDebounced();
    
    if (key === 'typeMode') this.openEditor(this.editingIndex);
  }

  switchType(type) {
    if (this.getCurrent().locked) return;
    this.getCurrent().items[this.editingIndex].type = type;
    this.openEditor(this.editingIndex);
    this.persist();
    this.pushToContent();
  }

  closeEditor() {
    this.editingIndex = null;
    this.dom.editorPanel.classList.remove('open');
    this.dom.main.classList.remove('dimmed');
    this.renderLayers();
  }

  // --- RENDERING UI ---

  render() {
    const isLocked = this.getCurrent().locked;
    
    // Header & Selection
    this.dom.btnDelete.style.opacity = isLocked ? '0.2' : '1';
    this.dom.btnDelete.style.pointerEvents = isLocked ? 'none' : 'auto';
    this.dom.btnRename.style.opacity = isLocked ? '0.2' : '1';
    this.dom.btnRename.style.pointerEvents = isLocked ? 'none' : 'auto';
    this.dom.btnAddLayer.style.display = isLocked ? 'none' : 'block';
    
    this.dom.profileSelect.innerHTML = Object.entries(this.profiles).map(([id, p]) => 
      `<option value="${id}" ${id === this.activeId ? 'selected' : ''}>${p.name} ${p.locked ? '🔒' : ''}</option>`
    ).join('');
    
    this.renderLayers();
  }

  renderLayers() {
    const p = this.getCurrent();
    if (p.items.length === 0) {
      this.dom.layersList.innerHTML = `<div class="empty-state">No layers.</div>`;
      return;
    }

    this.dom.layersList.innerHTML = p.items.map((item, i) => `
      <div class="layer-card ${this.editingIndex === i ? 'active' : ''} ${p.locked ? 'is-locked' : ''}" data-idx="${i}">
        <div class="color-indicator" style="background:${item.color}"></div>
        <div class="layer-info">
          <div class="layer-title">L${i+1} ${item.type} <span class="op-val">${Math.round((item.opacity || 0) * 100)}%</span></div>
          <input type="range" class="quick-opacity" data-idx="${i}" min="0" max="1" step="0.01" value="${item.opacity || 0}" ${p.locked ? 'disabled' : ''}>
        </div>
        <div class="layer-actions">
          <button class="btn-vis btn-icon" ${p.locked ? 'style="opacity:0.2"' : ''}>
            ${item.visible ? this.getIcon('eye') : this.getIcon('eye-off')}
          </button>
          ${!p.locked ? 
            `<button class="btn-del btn-icon danger">${this.getIcon('trash')}</button>` : 
            `<div class="lock-indicator">${this.getIcon('lock')}</div>`
          }
        </div>
      </div>`).join('');
  }

  getIcon(name) {
    const icons = {
      eye: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M1 12s4-8 11-8 11-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      'eye-off': '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
      trash: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
      lock: '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
    };
    return icons[name] || '';
  }

  debounce(f, w) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), w); };
  }
}

document.addEventListener('DOMContentLoaded', () => new GridApp());