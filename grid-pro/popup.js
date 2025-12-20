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
      main: document.getElementById('main-content')
    };
    await this.load();
    this.listen();
    this.sync();
    this.render();
  }

  async load() {
    const d = await chrome.storage.local.get(['store']);
    if (d.store) {
      if (d.store.profiles) {
        // Migrasi & Sanitasi Data Lama
        const migrated = {};
        Object.entries(d.store.profiles).forEach(([id, p]) => {
          migrated[id] = {
            ...p,
            items: (p.items || []).map(item => ({
              typeMode: 'stretch', // Default jika properti baru tidak ada
              maxWidth: 0,
              offset: 0,
              ...item
            }))
          };
        });
        this.state.profiles = { ...SYSTEM_PROFILES, ...migrated };
      }
      this.state.activeProfileId = d.store.activeProfileId || 'bootstrap_xxl';
    }
  }

  sync() {
    chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
      if (t[0]?.id) {
        chrome.tabs.sendMessage(t[0].id, { action: 'GET_STATUS' }, (r) => {
          if (!chrome.runtime.lastError && r) this.dom.toggle.checked = r.enabled;
        });
        this.push();
      }
    });
  }

  persist() {
    const customs = {};
    Object.entries(this.state.profiles).forEach(([id, p]) => { if(!p.locked) customs[id] = p; });
    chrome.storage.local.set({ store: { profiles: customs, activeProfileId: this.state.activeProfileId } });
  }

  push() {
    chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
      if (t[0]?.id) chrome.tabs.sendMessage(t[0].id, { action: 'UPDATE', items: this.getCurrent().items }).catch(()=>{});
    });
  }

  getCurrent() { return this.state.profiles[this.state.activeProfileId] || this.state.profiles['bootstrap_xxl']; }

  feedback(el) {
    el.style.transform = 'scale(0.92)';
    setTimeout(() => el.style.transform = '', 100);
  }

  sanitize(str) {
    return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").substring(0, 30);
  }

  listen() {
    this.dom.toggle.addEventListener('change', (e) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
        if (t[0]?.id) {
          chrome.tabs.sendMessage(t[0].id, { action: 'TOGGLE_LOCAL' });
          chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: e.target.checked, tabId: t[0].id });
        }
      });
    });

    this.dom.btnDuplicateProfile.addEventListener('click', () => {
      this.feedback(this.dom.btnDuplicateProfile);
      const cur = this.getCurrent();
      const rawName = prompt("Duplicate preset as:", `${cur.name} (Copy)`);
      if (!rawName) return;
      const name = this.sanitize(rawName);
      const id = 'c_' + Date.now();
      this.state.profiles[id] = { name, items: JSON.parse(JSON.stringify(cur.items)), locked: false };
      this.state.activeProfileId = id;
      this.persist(); this.render(); this.push();
    });

    this.dom.btnAddProfile.addEventListener('click', () => {
      this.feedback(this.dom.btnAddProfile);
      const rawName = prompt("New Preset Name:"); if (!rawName) return;
      const name = this.sanitize(rawName);
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
      const card = e.target.closest('.layer-card');
      if (!card) return;
      const idx = card.dataset.idx;

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
      this.getCurrent().items.push({ type: 'columns', count: 12, gutter: 24, margin: 24, color: '#3b82f6', opacity: 0.15, visible: true, maxWidth: 0, offset: 0 });
      this.persist(); this.push(); this.renderLayers();
      const lastIdx = this.getCurrent().items.length - 1;
      this.openEditor(lastIdx);
      setTimeout(() => this.dom.layersList.lastElementChild?.scrollIntoView({behavior: 'smooth'}), 100);
    });

    this.dom.btnCloseEditor.addEventListener('click', () => this.closeEditor());
    this.dom.segments.forEach(s => s.addEventListener('click', (e) => this.switchType(e.target.dataset.type)));
    this.dom.editorFields.addEventListener('input', (e) => this.handleInput(e));
  }

  openEditor(idx) {
    this.state.editingIndex = idx;
    this.dom.editorPanel.classList.add('open');
    this.dom.main.classList.add('dimmed');
    const item = this.getCurrent().items[idx];
    const isLocked = this.getCurrent().locked;
    
    this.dom.segments.forEach(s => s.classList.toggle('active', s.dataset.type === item.type));
    
    let h = isLocked ? `<div class="locked-banner">VIEW MODE — SYSTEM PRESET</div>` : '';
    const f = (l, k, t='number', s=1) => `<div class="field"><label>${l}</label><input type="${t}" data-key="${k}" value="${item[k] ?? ''}" step="${s}" ${isLocked ? 'disabled' : ''}></div>`;
    
    if (item.type === 'grid') {
      h += f('Pixel Size', 'size') + f('Offset', 'offset') + f('Color', 'color', 'color') + f('Opacity', 'opacity', 'number', 0.01);
    } else {
      const isR = item.type === 'rows';
      h += f(isR ? 'Rows Count' : 'Columns Count', 'count') + f('Gutter', 'gutter');
      h += `<div class="field"><label>Alignment</label><select data-key="typeMode" ${isLocked ? 'disabled' : ''}>
        <option value="stretch" ${item.typeMode==='stretch'?'selected':''}>Stretch</option>
        <option value="center" ${item.typeMode==='center'?'selected':''}>Center</option>
        <option value="${isR?'top':'left'}" ${item.typeMode===(isR?'top':'left')?'selected':''}>${isR?'Top':'Left'}</option>
        <option value="${isR?'bottom':'right'}" ${item.typeMode===(isR?'bottom':'right')?'selected':''}>${isR?'Bottom':'Right'}</option>
      </select></div>`;
      
      if (item.typeMode === 'stretch') h += f('Margin', 'margin'); 
      else h += f(isR ? 'Height' : 'Width', isR ? 'height' : 'width') + f('Offset', 'offset');
      h += f('Max Container', 'maxWidth') + f('Color', 'color', 'color') + f('Opacity', 'opacity', 'number', 0.01);
    }
    this.dom.editorFields.innerHTML = h;
  }

  closeEditor() { 
    this.state.editingIndex = null; 
    this.dom.editorPanel.classList.remove('open'); 
    this.dom.main.classList.remove('dimmed'); 
    this.renderLayers(); 
  }
  
  switchType(t) { 
    if(this.getCurrent().locked) return;
    this.getCurrent().items[this.state.editingIndex].type = t; 
    this.push(); this.persist(); this.openEditor(this.state.editingIndex); 
  }

  handleInput(e) { 
    if(this.getCurrent().locked) return; 
    const i = this.getCurrent().items[this.state.editingIndex];
    let val = e.target.value;
    if (e.target.type === 'number') val = parseFloat(val) || 0;
    i[e.target.dataset.key] = val;
    this.push(); 
    this.saveDebounced();
    if(e.target.dataset.key ==='typeMode') this.openEditor(this.state.editingIndex);
  }

  render() {
    this.dom.profileSelect.innerHTML = Object.entries(this.state.profiles).map(([id, p]) => {
      return `<option value="${id}" ${id===this.state.activeProfileId?'selected':''}>${p.name} ${p.locked?'🔒':''}</option>`;
    }).join('');
    this.renderLayers();
  }

  renderLayers() {
    const p = this.getCurrent();
    if (p.items.length === 0) {
      this.dom.layersList.innerHTML = `<div style="text-align:center; padding:40px 20px; color:var(--text-muted); font-size:11px;">No layers in this preset.</div>`;
      return;
    }
    this.dom.layersList.innerHTML = p.items.map((item, i) => `
      <div class="layer-card ${this.state.editingIndex===i?'active':''}" data-idx="${i}">
        <div class="color-indicator" style="background:${item.color}"></div>
        <div class="layer-info">
          <div class="layer-title">Layer ${i+1} (${item.type}) <span class="op-val">${Math.round(item.opacity*100)}%</span></div>
          <input type="range" class="quick-opacity" data-idx="${i}" min="0" max="1" step="0.01" value="${item.opacity}" ${p.locked?'disabled':''}>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn-vis btn-icon">
            ${item.visible ? 
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' : 
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
            }
          </button>
          <button class="btn-del btn-icon" ${p.locked?'style="opacity:0.2; pointer-events:none;"':''}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>`).join('');
  }

  debounce(f, w) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), w); }; }
}
document.addEventListener('DOMContentLoaded', () => new App());