const SYSTEM_PROFILES = {
  'bootstrap_xxl': { name: 'Bootstrap 5 (XXL)', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'center', width: 80, gutter: 24, color: '#dc3545', opacity: 0.15, visible: true, maxWidth: 1320 }] },
  'tailwind_container': { name: 'Tailwind Container', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'stretch', maxWidth: 1280, gutter: 32, margin: 32, color: '#38bdf8', opacity: 0.15, visible: true }] },
  '8px_baseline': { name: '8px Baseline Grid', locked: true, items: [{ type: 'grid', size: 8, color: '#10b981', opacity: 0.08, visible: true, maxWidth: 0 }] },
  'material_12': { name: 'Material Design 12-col', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'center', width: 72, gutter: 24, color: '#6200ee', opacity: 0.12, visible: true, maxWidth: 1440 }] }
};

const ICONS = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  drag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
};

class GridApp {
  constructor() {
    this.profiles = { ...SYSTEM_PROFILES };
    this.activeId = 'bootstrap_xxl';
    this.editingIndex = null;
    
    this.debounce = (fn, delay) => {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
    };

    this.saveDebounced = this.debounce(() => this.persist(), 300);
    this.debouncedPush = this.debounce(() => this.pushToContent(), 100);
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
      main: document.getElementById('main-content'),
      layersList: document.getElementById('layers-list'),
      editorPanel: document.getElementById('editor-panel'),
      editorFields: document.getElementById('editor-fields'),
      toggle: document.getElementById('global-toggle'),
      profileSelect: document.getElementById('profile-select'),
      importInput: document.getElementById('import-input'),
      btnRename: document.getElementById('btn-rename-profile'),
      btnDelete: document.getElementById('btn-delete-profile'),
      btnAddLayer: document.getElementById('btn-add-layer'),
      btnCloseEditor: document.getElementById('btn-close-editor'),
      segments: document.querySelectorAll('.segment'),
      lockedBanner: document.getElementById('locked-banner')
    };
  }

  async load() {
    const { store } = await chrome.storage.local.get(['store']);
    if (store?.profiles) {
      const migrated = {};
      for (const [id, p] of Object.entries(store.profiles)) {
        migrated[id] = { ...p, items: (p.items || []).map(item => ({ typeMode: 'stretch', maxWidth: 0, ...item })) };
      }
      this.profiles = { ...SYSTEM_PROFILES, ...migrated };
    }
    this.activeId = store?.activeProfileId || 'bootstrap_xxl';
  }

  persist() {
    const customs = Object.fromEntries(Object.entries(this.profiles).filter(([_, p]) => !p.locked));
    chrome.storage.local.set({ store: { profiles: customs, activeProfileId: this.activeId } });
  }

  pushToContent() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'UPDATE', items: this.getCurrent().items }).catch(() => {});
      }
    });
  }

  syncInitialStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'GET_STATUS' }, (res) => {
          if (!chrome.runtime.lastError && res) this.dom.toggle.checked = res.enabled;
        }).catch(() => {});
        this.pushToContent();
      }
    });
  }

  getCurrent() { return this.profiles[this.activeId] || this.profiles['bootstrap_xxl']; }

  bindEvents() {
    this.dom.toggle.addEventListener('change', e => this.handleGlobalToggle(e.target.checked));
    this.dom.profileSelect.addEventListener('change', e => this.switchProfile(e.target.value));
    
    const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    bind('btn-add-profile', () => this.addProfile());
    bind('btn-duplicate-profile', () => this.duplicateProfile());
    bind('btn-export-profile', () => this.exportProfile());
    bind('btn-import-profile', () => this.dom.importInput.click());
    
    this.dom.btnRename.onclick = () => this.renameProfile();
    this.dom.btnDelete.onclick = () => this.deleteProfile();
    this.dom.importInput.onchange = e => this.importProfile(e);
    this.dom.btnAddLayer.onclick = () => this.addLayer();
    
    this.dom.layersList.oninput = e => this.handleLayerQuickOpacity(e);
    this.dom.layersList.onclick = e => this.handleLayerClick(e);
    this.dom.btnCloseEditor.onclick = () => this.closeEditor();
    
    this.dom.segments.forEach(s => s.onclick = e => this.switchType(e.target.dataset.type));
    this.dom.editorFields.oninput = e => this.handleEditorInput(e);
  }

  handleLayerQuickOpacity(e) {
    if (!e.target.matches('.quick-opacity')) return;
    const idx = parseInt(e.target.dataset.idx);
    const val = parseFloat(e.target.value);
    const item = this.getCurrent().items[idx];
    
    // UPDATE: Gunakan Nullish check jika diperlukan, meski untuk slider value pasti ada
    item.opacity = val;

    const card = e.target.closest('.layer-card');
    if (card) {
      const opValDisplay = card.querySelector('.op-val');
      if (opValDisplay) opValDisplay.textContent = `${Math.round(val * 100)}%`;
    }

    this.debouncedPush();
    this.saveDebounced();
  }

  handleGlobalToggle(enabled) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_LOCAL' }).catch(() => {});
        chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled, tabId: tab.id });
      }
    });
  }

  switchProfile(id) {
    this.activeId = id;
    this.closeEditor();
    this.render();
    this.persist();
    this.debouncedPush();
  }

  addProfile() {
    const id = 'custom_' + Date.now();
    this.profiles[id] = { name: 'New Preset', items: [], locked: false };
    this.switchProfile(id);
  }

  duplicateProfile() {
    const current = this.getCurrent();
    const id = 'custom_' + Date.now();
    this.profiles[id] = { 
        name: `${current.name} Copy`, 
        items: JSON.parse(JSON.stringify(current.items)), 
        locked: false 
    };
    this.switchProfile(id);
  }

  renameProfile() {
    if (this.getCurrent().locked) return;
    const newName = prompt('Enter new profile name:', this.getCurrent().name);
    if (newName) {
      this.getCurrent().name = newName;
      this.render();
      this.persist();
    }
  }

  deleteProfile() {
    if (this.getCurrent().locked) return;
    if (confirm('Delete this profile?')) {
      delete this.profiles[this.activeId];
      this.activeId = Object.keys(this.profiles)[0];
      this.switchProfile(this.activeId);
    }
  }

  exportProfile() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.getCurrent()));
    const anchor = document.createElement('a');
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", this.getCurrent().name.replace(/\s+/g, '_').toLowerCase() + ".json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  importProfile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const obj = JSON.parse(event.target.result);
        if (obj.items && Array.isArray(obj.items)) {
          const id = 'custom_' + Date.now();
          this.profiles[id] = { name: obj.name || 'Imported', items: obj.items, locked: false };
          this.switchProfile(id);
        }
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  addLayer() {
    if (this.getCurrent().locked) return;
    this.getCurrent().items.push({ 
        type: 'columns', count: 12, typeMode: 'center', 
        width: 80, gutter: 24, color: '#dc3545', 
        opacity: 0.15, visible: true, maxWidth: 1320 
    });
    this.openEditor(this.getCurrent().items.length - 1);
    this.renderLayers();
    this.persist();
    this.debouncedPush();
  }

  handleLayerClick(e) {
    const btnDel = e.target.closest('.btn-del');
    const btnVis = e.target.closest('.btn-vis');
    const card = e.target.closest('.layer-card');
    
    if (!card) return;
    const index = parseInt(card.dataset.idx);
    
    if (btnDel) {
      if (this.getCurrent().locked) return;
      this.getCurrent().items.splice(index, 1);
      this.editingIndex = null;
      this.closeEditor();
      this.renderLayers();
      this.persist();
      this.debouncedPush();
      return;
    }
    
    // FIX: Optimized Visibility Toggle (No full re-render)
    if (btnVis) {
      if (this.getCurrent().locked) return;
      const item = this.getCurrent().items[index];
      item.visible = !item.visible;
      btnVis.innerHTML = item.visible ? ICONS.eye : ICONS.eyeOff;
      this.persist();
      this.debouncedPush();
      return;
    }

    if (!e.target.closest('input') && !e.target.closest('button')) {
        this.openEditor(index);
    }
  }

  switchType(newType) {
    if (this.editingIndex === null) return;
    if (this.getCurrent().locked) return;
    
    const item = this.getCurrent().items[this.editingIndex];
    item.type = newType;
    
    // UPDATE: Gunakan Nullish Coalescing (??) untuk default values
    // Jika user sudah pernah set gutter ke 0, jangan diubah jadi 20!
    if (newType === 'grid') {
        item.size = item.size ?? 20;
    } else {
        item.count = item.count ?? 12;
        item.typeMode = item.typeMode ?? 'stretch';
        item.gutter = item.gutter ?? 20;
    }
    
    this.openEditor(this.editingIndex);
    this.renderLayers();
    this.saveDebounced();
    this.debouncedPush();
  }

  openEditor(index) {
    this.editingIndex = index;
    const isLocked = this.getCurrent().locked;
    
    this.dom.editorPanel.classList.add('open');
    this.dom.main.classList.add('dimmed');
    this.dom.lockedBanner.style.display = isLocked ? 'block' : 'none';
    
    document.querySelectorAll('.layer-card').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    const item = this.getCurrent().items[index];
    
    this.dom.segments.forEach(s => {
        s.classList.toggle('active', s.dataset.type === item.type);
    });

    // UPDATE: Gunakan ?? untuk value input
    // Ini PENTING: Jika value adalah 0, '||' akan membuatnya kosong (''). 
    // '??' akan tetap menampilkan '0'.
    const field = (label, key, type = 'number', step) => `
      <div class="field">
        <label>${label}</label>
        <input type="${type}" data-key="${key}" value="${item[key] ?? ''}" step="${step || '1'}" ${isLocked ? 'disabled' : ''}>
      </div>`;

    let html = '';
    
    if (item.type === 'grid') {
      html += `
        <div class="field-group">
          <label class="group-label">Layout</label>
          ${field('Cell Size (px)', 'size')}
          ${field('Max Container Width (px)', 'maxWidth')}
        </div>`;
    } else {
      const isRow = item.type === 'rows';
      html += `
        <div class="field-group">
          <label class="group-label">Layout</label>
          ${field('Count', 'count')}
          ${field('Gutter (px)', 'gutter')}
          <div class="field full-width">
            <label>Alignment Mode</label>
            <select data-key="typeMode" ${isLocked ? 'disabled' : ''}>
              <option value="stretch" ${item.typeMode==='stretch'?'selected':''}>Stretch (Fluid)</option>
              <option value="center" ${item.typeMode==='center'?'selected':''}>Center (Fixed)</option>
              <option value="${isRow?'top':'left'}" ${item.typeMode===(isRow?'top':'left')?'selected':''}>${isRow?'Top':'Left'}</option>
              <option value="${isRow?'bottom':'right'}" ${item.typeMode===(isRow?'bottom':'right')?'selected':''}>${isRow?'Bottom':'Right'}</option>
            </select>
          </div>
          ${item.typeMode === 'stretch' 
            ? field('Margin (px)', 'margin') 
            : field(isRow ? 'Height (px)' : 'Width (px)', isRow ? 'height' : 'width')}
          ${field('Max Container Width (px)', 'maxWidth')}
        </div>`;
    }

    html += `
        <div class="field-group">
          <label class="group-label">Appearance</label>
          ${field('Color', 'color', 'color')}
          ${field('Opacity', 'opacity', 'number', 0.01)}
        </div>`;
        
    this.dom.editorFields.innerHTML = html;
  }

  handleEditorInput(e) {
    if (this.getCurrent().locked) return;
    const item = this.getCurrent().items[this.editingIndex];
    const key = e.target.dataset.key;
    let val = e.target.value;
    
    if (e.target.type === 'number') {
      val = parseFloat(val);
      // Jika input kosong atau invalid (NaN), set ke 0.
      if (isNaN(val)) val = 0; 
      
      // Validasi Limit
      if (key === 'count') val = Math.max(1, Math.min(64, Math.floor(val)));
      if (key === 'opacity') val = Math.min(1, Math.max(0, val));
      if (['size', 'width', 'height', 'gutter', 'margin', 'maxWidth'].includes(key)) {
          val = Math.floor(val);
      }
    }
    
    item[key] = val;
    this.debouncedPush();
    this.saveDebounced();
    
    if (key === 'typeMode') this.openEditor(this.editingIndex);
    
    if (['count', 'type', 'gutter', 'typeMode', 'size'].includes(key)) {
        this.renderLayers();
    }
    if (key === 'opacity') {
        const card = this.dom.layersList.querySelector(`.layer-card[data-idx="${this.editingIndex}"]`);
        if (card) {
            // UPDATE: Pastikan nilai opacity juga aman
            const displayVal = item.opacity ?? 0.15;
            card.querySelector('.quick-opacity').value = displayVal;
            card.querySelector('.op-val').textContent = `${Math.round(displayVal * 100)}%`;
        }
    }
  }

  closeEditor() {
    this.editingIndex = null;
    this.dom.editorPanel.classList.remove('open');
    this.dom.main.classList.remove('dimmed');
    this.renderLayers();
  }

  render() {
    const locked = this.getCurrent().locked;
    const setLock = (el) => {
        el.style.opacity = locked ? '0.2' : '1';
        el.style.pointerEvents = locked ? 'none' : 'auto';
    };
    
    setLock(this.dom.btnDelete);
    setLock(this.dom.btnRename);
    this.dom.btnAddLayer.style.display = locked ? 'none' : 'flex';

    this.dom.profileSelect.innerHTML = Object.entries(this.profiles)
      .map(([id, p]) => `<option value="${id}" ${id === this.activeId ? 'selected' : ''}>${p.name} ${p.locked ? '🔒' : ''}</option>`)
      .join('');

    this.renderLayers();
  }

  renderLayers() {
    const p = this.getCurrent();
    
    if (p.items.length === 0) {
      this.dom.layersList.innerHTML = `
        <div class="empty-state">
          <p style="margin:0 0 16px;color:var(--text-secondary);font-size:12px;">No layers yet.</p>
          <button class="btn-new-layer" style="width:100%;padding:12px;gap:10px;font-size:11px;" id="quick-add-default">
            ${ICONS.plus}
            <span>Add Bootstrap 12-column grid</span>
          </button>
        </div>`;
      const btn = document.getElementById('quick-add-default');
      if (btn) btn.onclick = () => { if(!p.locked) this.addLayer(); };
      return;
    }

    const frag = document.createDocumentFragment();
    
    p.items.forEach((item, i) => {
      let name = '';
      
      // UPDATE: Gunakan ?? untuk display text agar angka 0 tetap muncul
      if (item.type === 'grid') {
        name = `Pixel Grid ${item.size ?? 20}px`;
      } else {
        const typeName = item.type === 'rows' ? 'Rows' : 'Cols';
        name = `${item.count ?? 12} ${typeName} (${item.gutter ?? 0}px)`;
        if (item.typeMode === 'stretch') name += ' Fluid';
        else name += ` Fixed`;
      }

      const card = document.createElement('div');
      card.className = `layer-card ${this.editingIndex === i ? 'active' : ''} ${p.locked ? 'is-locked' : ''}`;
      card.dataset.idx = i;
      card.draggable = !p.locked;

      // UPDATE: Gunakan ?? pada opacity value input
      card.innerHTML = `
        <div class="color-indicator" style="background:${item.color || '#3b82f6'}"></div>
        <div class="layer-info">
          <div class="layer-title">
            <span class="layer-name" title="${name}">${name}</span>
            <span class="op-val">${Math.round((item.opacity ?? 0.15) * 100)}%</span>
          </div>
          <input 
            type="range" 
            class="quick-opacity" 
            data-idx="${i}" 
            min="0" max="1" step="0.01"
            value="${item.opacity ?? 0.15}" 
            ${p.locked ? 'disabled' : ''}
          >
        </div>
        <div class="layer-actions">
          <button class="btn-vis btn-icon" aria-label="Toggle visibility" ${p.locked ? 'disabled style="opacity:0.2"' : ''}>
            ${item.visible ? ICONS.eye : ICONS.eyeOff}
          </button>
          ${p.locked
            ? `<div class="lock-indicator" style="opacity:0.3">${ICONS.lock}</div>`
            : `<button class="btn-del btn-icon danger" aria-label="Delete layer">${ICONS.trash}</button>`
          }
        </div>`;
        
        // --- DRAG CONFLICT FIX ---
        if (!p.locked) {
            card.addEventListener('dragstart', (e) => {
                // PENTING: Jangan mulai drag jika user berinteraksi dengan INPUT (slider) atau BUTTON
                if (e.target.tagName === 'INPUT' || e.target.closest('button')) {
                    e.preventDefault();
                    return;
                }
                
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });
            
            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        }

      frag.appendChild(card);
    });

    this.dom.layersList.innerHTML = '';
    this.dom.layersList.appendChild(frag);
    
    this.initDragAndDrop();
  }

  initDragAndDrop() {
      const container = this.dom.layersList;
      
      container.ondragover = (e) => {
          e.preventDefault();
          const afterElement = this.getDragAfterElement(container, e.clientY);
          const draggable = document.querySelector('.dragging');
          
          if (draggable) {
              if (afterElement == null) {
                  container.appendChild(draggable);
              } else {
                  container.insertBefore(draggable, afterElement);
              }
          }
      };
      
      container.ondrop = (e) => {
          e.preventDefault();
          if (this.getCurrent().locked) return;
          
          const newItems = [];
          [...this.dom.layersList.children].forEach(child => {
             const oldIdx = parseInt(child.dataset.idx);
             if (!isNaN(oldIdx)) newItems.push(this.getCurrent().items[oldIdx]);
          });
          
          this.getCurrent().items = newItems;
          this.closeEditor();
          this.renderLayers();
          this.persist();
          this.debouncedPush();
      };
  }

  getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.layer-card:not(.dragging)')];
      return draggableElements.reduce((closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
              return { offset: offset, element: child };
          } else {
              return closest;
          }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
  }
}

document.addEventListener('DOMContentLoaded', () => new GridApp());