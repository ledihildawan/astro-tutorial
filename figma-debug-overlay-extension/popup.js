const SYSTEM_PROFILES = {
  'bootstrap_xxl': {
    name: 'Bootstrap 5 (XXL)', locked: true,
    items: [{ type: 'columns', count: 12, typeMode: 'center', width: 80, gutter: 24, offset: 0, color: '#dc3545', opacity: 0.15, visible: true, maxWidth: 1320 }]
  },
  'tailwind_container': {
    name: 'Tailwind Container', locked: true,
    items: [{ type: 'columns', count: 12, typeMode: 'stretch', maxWidth: 1280, gutter: 32, margin: 32, color: '#38bdf8', opacity: 0.15, visible: true }]
  },
  'baseline_8': {
    name: '8pt Pixel Grid', locked: true,
    items: [{ type: 'grid', size: 8, color: '#e83e8c', opacity: 0.1, visible: true }]
  }
};

class App {
  constructor() {
    this.state = { profiles: JSON.parse(JSON.stringify(SYSTEM_PROFILES)), activeProfileId: 'bootstrap_xxl', editingIndex: null };
    this.saveDebounced = this.debounce(() => this.persist(), 300);
    this.init();
  }

  async init() {
    this.dom = {
      toggle: document.getElementById('global-toggle'),
      profileSelect: document.getElementById('profile-select'),
      layersList: document.getElementById('layers-list'),
      btnAddProfile: document.getElementById('btn-add-profile'),
      btnDuplicateProfile: document.getElementById('btn-duplicate-profile'),
      btnDeleteProfile: document.getElementById('btn-delete-profile'),
      btnAddLayer: document.getElementById('btn-add-layer'),
      editorPanel: document.getElementById('editor-panel'),
      editorFields: document.getElementById('editor-fields'),
      btnCloseEditor: document.getElementById('btn-close-editor'),
      segments: document.querySelectorAll('.segment'),
      main: document.querySelector('main')
    };
    await this.load();
    this.listen();
    this.sync();
    this.render();
  }

  async load() {
    const d = await chrome.storage.local.get(['store']);
    if (d.store) {
      this.state.profiles = { ...this.state.profiles, ...d.store.profiles };
      this.state.activeProfileId = d.store.activeProfileId || 'bootstrap_xxl';
    }
  }

  sync() {
    chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
      if (t[0]?.id) chrome.tabs.sendMessage(t[0].id, { action: 'GET_STATUS' }, (r) => {
        if (!chrome.runtime.lastError && r) this.dom.toggle.checked = r.enabled;
      });
    });
  }

  persist() {
    const customs = {};
    Object.entries(this.state.profiles).forEach(([id, p]) => { if(!p.locked) customs[id] = p; });
    chrome.storage.local.set({ store: { profiles: customs, activeProfileId: this.state.activeProfileId } });
  }

  push() {
    chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
      if (t[0]?.id) chrome.tabs.sendMessage(t[0].id, { action: 'UPDATE', items: this.getCurrent().items });
    });
  }

  getCurrent() { return this.state.profiles[this.state.activeProfileId]; }

  listen() {
    this.dom.toggle.addEventListener('change', (e) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
        if (t[0]?.id) {
          chrome.tabs.sendMessage(t[0].id, { action: 'TOGGLE_LOCAL' });
          chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: e.target.checked, tabId: t[0].id });
        }
      });
    });

    chrome.runtime.onMessage.addListener((m) => {
      if (m.action === 'SYNC_UI') this.dom.toggle.checked = m.enabled;
    });

    this.dom.btnDuplicateProfile.addEventListener('click', () => {
      const cur = this.getCurrent();
      const name = prompt("Duplicate preset as:", `${cur.name} (Copy)`);
      if (!name) return;
      const id = 'c_' + Date.now();
      this.state.profiles[id] = { name, items: JSON.parse(JSON.stringify(cur.items)), locked: false };
      this.state.activeProfileId = id;
      this.persist(); this.render(); this.push();
    });

    this.dom.btnAddProfile.addEventListener('click', () => {
      const name = prompt("New Preset Name:"); if (!name) return;
      const id = 'c_' + Date.now();
      this.state.profiles[id] = { name, items: [], locked: false };
      this.state.activeProfileId = id;
      this.persist(); this.render();
    });

    this.dom.btnDeleteProfile.addEventListener('click', () => {
      if (this.getCurrent().locked) return;
      if (confirm(`Delete preset "${this.getCurrent().name}"?`)) {
        delete this.state.profiles[this.state.activeProfileId];
        this.state.activeProfileId = Object.keys(this.state.profiles)[0];
        this.persist(); this.render(); this.push();
      }
    });

    this.dom.profileSelect.addEventListener('change', (e) => {
      this.state.activeProfileId = e.target.value;
      this.closeEditor(); this.render(); this.persist(); this.push();
    });

    this.dom.layersList.addEventListener('input', (e) => {
      if (e.target.classList.contains('quick-opacity')) {
        const idx = e.target.dataset.idx;
        const val = parseFloat(e.target.value);
        this.getCurrent().items[idx].opacity = val;
        this.push(); this.saveDebounced();
        e.target.closest('.layer-card').querySelector('.op-val').textContent = `${Math.round(val*100)}%`;
      }
    });

    this.dom.layersList.addEventListener('click', (e) => {
      const idx = e.target.closest('.layer-card')?.dataset.idx;
      if (idx === undefined) return;
      if (e.target.closest('.btn-vis')) {
        this.getCurrent().items[idx].visible = !this.getCurrent().items[idx].visible;
        this.push(); this.persist(); this.renderLayers();
      } else if (e.target.closest('.btn-del')) {
        if (this.getCurrent().locked) return;
        this.getCurrent().items.splice(idx, 1);
        this.closeEditor(); this.push(); this.persist(); this.renderLayers();
      } else if (!e.target.classList.contains('quick-opacity')) {
        this.openEditor(parseInt(idx));
      }
    });

    this.dom.btnAddLayer.addEventListener('click', () => {
      if (this.getCurrent().locked) return alert("System preset is locked. Duplicate it first.");
      this.getCurrent().items.push({ type: 'columns', count: 12, gutter: 24, margin: 24, color: '#3b82f6', opacity: 0.15, visible: true });
      this.persist(); this.push(); this.renderLayers(); this.openEditor(this.getCurrent().items.length - 1);
    });

    this.dom.btnCloseEditor.addEventListener('click', () => this.closeEditor());
    this.dom.segments.forEach(s => s.addEventListener('click', (e) => this.switchType(e.target.dataset.type)));
    this.dom.editorFields.addEventListener('input', (e) => this.handleInput(e));
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.editingIndex !== null) this.closeEditor();
    });
  }

  openEditor(idx) {
    this.state.editingIndex = idx;
    this.dom.editorPanel.classList.add('open');
    this.dom.main.classList.add('dimmed');
    const item = this.getCurrent().items[idx];
    const isLocked = this.getCurrent().locked;
    const isRow = item.type === 'rows';
    const isCol = item.type === 'columns';
    this.dom.segments.forEach(s => s.classList.toggle('active', s.dataset.type === item.type));
    
    let h = isLocked ? `
      <div class="locked-banner">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="margin-right:6px;"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        VIEW MODE — SYSTEM PRESET
      </div>` : '';
      
    const f = (l, k, t='number', s=1) => `<div class="field"><label>${l}</label><input type="${t}" data-key="${k}" value="${item[k] ?? ''}" step="${s}" ${isLocked ? 'disabled' : ''}></div>`;
    
    if (item.type === 'grid') h += f('Pixel Size', 'size') + f('Color', 'color', 'color') + f('Opacity', 'opacity', 'number', 0.01);
    else {
      h += f(item.type==='columns'?'Columns':'Rows', 'count') + f('Gutter', 'gutter');
      h += `<div class="field"><label>Alignment</label><select data-key="typeMode" ${isLocked ? 'disabled' : ''}><option value="stretch" ${item.typeMode==='stretch'?'selected':''}>Stretch</option><option value="center" ${item.typeMode==='center'?'selected':''}>Center</option><option value="left" ${item.typeMode==='left'?'selected':''}>Left/Top</option><option value="right" ${item.typeMode==='right'?'selected':''}>Right/Bottom</option></select></div>`;
      if (item.typeMode === 'stretch') h += f('Margin', 'margin'); else h += f('Size', 'width') + f('Offset', 'offset');
      h += f('Max Container', 'maxWidth') + f('Color', 'color', 'color') + f('Opacity', 'opacity', 'number', 0.01);
    }
    this.dom.editorFields.innerHTML = h;
    this.renderLayers();
  }

  closeEditor() { this.state.editingIndex = null; this.dom.editorPanel.classList.remove('open'); this.dom.main.classList.remove('dimmed'); this.renderLayers(); }
  
  switchType(t) { 
    const i = this.getCurrent().items[this.state.editingIndex];
    if(this.getCurrent().locked) { i.type = t; this.openEditor(this.state.editingIndex); return; }
    i.type = t; i.typeMode = 'stretch'; this.push(); this.persist(); this.openEditor(this.state.editingIndex); 
  }

  handleInput(e) { 
    if(this.getCurrent().locked) return; 
    const i = this.getCurrent().items[this.state.editingIndex];
    const k = e.target.dataset.key;
    i[k] = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    this.push(); this.saveDebounced();
    if(k==='typeMode') this.openEditor(this.state.editingIndex); else this.renderLayers();
  }

  render() {
    this.dom.profileSelect.innerHTML = Object.entries(this.state.profiles).map(([id, p]) => `<option value="${id}" ${id===this.state.activeProfileId?'selected':''}>${p.name} ${p.locked?'🔒':''}</option>`).join('');
    this.renderLayers();
  }

  renderLayers() {
    const p = this.getCurrent();
    const isLocked = p.locked;
    this.dom.layersList.innerHTML = p.items.length ? p.items.map((item, i) => `
      <div class="layer-card ${this.state.editingIndex===i?'active':''}" data-idx="${i}">
        <div class="color-indicator" style="background:${item.color}"></div>
        <div class="layer-info">
          <div class="layer-title">Layer ${i+1} <span class="op-val">${Math.round(item.opacity*100)}%</span></div>
          <input type="range" class="quick-opacity" data-idx="${i}" min="0" max="1" step="0.01" value="${item.opacity}" ${isLocked ? 'disabled' : ''}>
        </div>
        <div class="layer-controls" style="display:flex; gap:6px;">
          <button class="btn-vis btn-icon">
            ${item.visible ? 
              `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>` : 
              `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`
            }
          </button>
          <button class="btn-del btn-icon" ${isLocked ? 'style="opacity:0.1; cursor:not-allowed;"' : ''}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`).join('') : `
        <div class="empty-state">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:10px; opacity:0.1;"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          <p>Preset is empty.<br><span style="font-size:10px; opacity:0.5;">Add a layer to start.</span></p>
        </div>`;
  }
  debounce(f, w) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), w); }; }
}
document.addEventListener('DOMContentLoaded', () => new App());