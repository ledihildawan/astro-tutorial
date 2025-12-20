const SYSTEM_PROFILES = {
  'bootstrap_xxl': { name: 'Bootstrap 5 (XXL)', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'center', width: 80, gutter: 24, color: '#dc3545', opacity: 0.15, visible: true, maxWidth: 1320 }] },
  'tailwind_container': { name: 'Tailwind Container', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'stretch', maxWidth: 1280, gutter: 32, margin: 32, color: '#38bdf8', opacity: 0.15, visible: true }] },
  '8px_baseline': { name: '8px Baseline Grid', locked: true, items: [{ type: 'grid', size: 8, color: '#10b981', opacity: 0.08, visible: true, maxWidth: 0 }] },
  'material_12': { name: 'Material Design 12-col', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'center', width: 72, gutter: 24, color: '#6200ee', opacity: 0.12, visible: true, maxWidth: 1440 }] }
};

const ICONS = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
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
      segments: document.querySelectorAll('.segment')
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
      if (tab?.id) chrome.tabs.sendMessage(tab.id, { action: 'UPDATE', items: this.getCurrent().items }).catch(() => {});
    });
  }

  syncInitialStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'GET_STATUS' }, (res) => {
          if (!chrome.runtime.lastError && res) this.dom.toggle.checked = res.enabled;
        });
        this.pushToContent();
      }
    });
  }

  getCurrent() { return this.profiles[this.activeId] || this.profiles['bootstrap_xxl']; }

  bindEvents() {
    this.dom.toggle.addEventListener('change', e => this.handleGlobalToggle(e.target.checked));
    this.dom.profileSelect.addEventListener('change', e => this.switchProfile(e.target.value));
    document.getElementById('btn-add-profile').onclick = () => this.addProfile();
    document.getElementById('btn-duplicate-profile').onclick = () => this.duplicateProfile();
    this.dom.btnRename.onclick = () => this.renameProfile();
    this.dom.btnDelete.onclick = () => this.deleteProfile();
    document.getElementById('btn-export-profile').onclick = () => this.exportProfile();
    document.getElementById('btn-import-profile').onclick = () => this.dom.importInput.click();
    this.dom.importInput.onchange = e => this.importProfile(e);
    this.dom.btnAddLayer.onclick = () => this.addLayer();
    this.dom.layersList.oninput = e => this.handleLayerQuickOpacity(e);
    this.dom.layersList.onclick = e => this.handleLayerClick(e);
    this.dom.btnCloseEditor.onclick = () => this.closeEditor();
    this.dom.segments.forEach(s => s.onclick = e => this.switchType(e.target.dataset.type));
    this.dom.editorFields.oninput = e => this.handleEditorInput(e);
    this.dom.layersList.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('quick-opacity')) {
        e.stopPropagation();
      }
    }, { capture: true });
  }

  handleLayerQuickOpacity(e) {
    const idx = parseInt(e.target.dataset.idx);
    const val = parseFloat(e.target.value);
    const item = this.getCurrent().items[idx];

    // 1. Update data internal
    item.opacity = val;

    // 2. Update tampilan teks persentase di UI secara instan
    const card = e.target.closest('.layer-card');
    if (card) {
      const opValDisplay = card.querySelector('.op-val');
      if (opValDisplay) {
        opValDisplay.textContent = `${Math.round(val * 100)}%`;
      }
    }

    // 3. Kirim ke konten (halaman web) secara real-time
    this.pushToContent();

    // 4. Simpan ke storage (di-debounce agar tidak terlalu sering menulis ke disk)
    this.saveDebounced();
  }

  handleGlobalToggle(enabled) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_LOCAL' });
        chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled, tabId: tab.id });
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
    this.profiles[id] = { name: name.slice(0,30), items: [], locked: false };
    this.switchProfile(id);
  }

  renameProfile() {
    const cur = this.getCurrent();
    if (cur.locked) return;
    const name = prompt("Rename preset to:", cur.name);
  }

  duplicateProfile() {
    const cur = this.getCurrent();
    const name = prompt("Duplicate as:", `${cur.name} (Copy)`);
    if (!name) return;
    const id = 'c_' + Date.now();
    this.profiles[id] = { name: name.slice(0,30), items: structuredClone(cur.items), locked: false };
    this.switchProfile(id);
  }

  deleteProfile() {
    const cur = this.getCurrent();
    if (cur.locked || !confirm(`Delete preset "${cur.name}"?`)) return;
    delete this.profiles[this.activeId];
    this.activeId = Object.keys(this.profiles)[0];
    this.render();
    this.persist();
    this.pushToContent();
  }

  exportProfile() {
    const cur = this.getCurrent();
    const url = URL.createObjectURL(new Blob([JSON.stringify(cur, null, 2)], { type: 'application/json' }));
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
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data?.name && Array.isArray(data.items)) {
          const id = 'c_' + Date.now();
          this.profiles[id] = {
            name: data.name.slice(0,30),
            items: data.items.map(i => ({ typeMode: 'stretch', maxWidth: 0, ...i })),
            locked: false
          };
          this.switchProfile(id);
        } else alert('Invalid preset format');
      } catch { alert('Invalid JSON'); }
      this.dom.importInput.value = '';
    };
    reader.readAsText(file);
  }

  addLayer() {
    if (this.getCurrent().locked) return;
    const newLayer = { type: 'columns', count: 12, typeMode: 'center', width: 80, gutter: 20, color: '#3b82f6', opacity: 0.15, visible: true, maxWidth: 1200 };
    this.getCurrent().items.push(newLayer);
    this.openEditor(this.getCurrent().items.length - 1);
    this.persist();
    this.pushToContent();
  }

  handleLayerClick(e) {
    const card = e.target.closest('.layer-card');
    if (!card) return;
    const idx = +card.dataset.idx;
    const cur = this.getCurrent();
    if (e.target.closest('.btn-vis')) {
      if (!cur.locked) {
        cur.items[idx].visible = !cur.items[idx].visible;
        this.renderLayers();
        this.persist();
        this.pushToContent();
      }
    } else if (e.target.closest('.btn-del')) {
      if (!cur.locked) {
        cur.items.splice(idx, 1);
        this.closeEditor();
        this.renderLayers();
        this.persist();
        this.pushToContent();
      }
    } else if (!e.target.classList.contains('quick-opacity') && !e.target.closest('.drag-handle')) {
      this.openEditor(idx);
    }
  }

  handleLayerQuickOpacity(e) {
    if (!e.target.classList.contains('quick-opacity')) return;
    const idx = +e.target.dataset.idx;
    const val = +e.target.value;
    const item = this.getCurrent().items[idx];
    item.opacity = val;
    e.target.closest('.layer-card').querySelector('.op-val').textContent = `${Math.round(val * 100)}%`;
    this.pushToContent();
    this.saveDebounced();
  }

  initDragAndDrop() {
    const list = this.dom.layersList;

    list.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.layer-card');
      if (!card || this.getCurrent().locked) return;
      
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.idx);
      
      // Memberikan sedikit delay agar class 'dragging' terlihat sebelum drag ghost muncul
      setTimeout(() => card.style.opacity = '0.3', 0);
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.getCurrent().locked) return;

      const draggingElement = list.querySelector('.dragging');
      const afterElement = this.getDragAfterElement(list, e.clientY);
      
      if (afterElement == null) {
        list.appendChild(draggingElement);
      } else {
        list.insertBefore(draggingElement, afterElement);
      }
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      if (this.getCurrent().locked) return;

      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const allCards = [...list.querySelectorAll('.layer-card')];
      const toIndex = allCards.findIndex(card => card.classList.contains('dragging'));

      if (fromIndex !== toIndex) {
        const items = this.getCurrent().items;
        const [movedItem] = items.splice(fromIndex, 1);
        items.splice(toIndex, 0, movedItem);
        
        this.persist();
        this.pushToContent();
      }
    });

    list.addEventListener('dragend', (e) => {
      const card = e.target.closest('.layer-card');
      if (card) {
        card.classList.remove('dragging');
        card.style.opacity = '1';
      }
      this.renderLayers(); // Re-render untuk memastikan index dataset kembali urut
    });
  }

  openEditor(idx) {
    this.editingIndex = idx;
    const item = this.getCurrent().items[idx];
    const locked = this.getCurrent().locked;
    this.dom.editorPanel.classList.add('open');
    this.dom.main.classList.add('dimmed');
    this.dom.segments.forEach(s => s.classList.toggle('active', s.dataset.type === item.type));

    const banner = document.getElementById('locked-banner');
    banner.style.display = locked ? 'block' : 'none';

    this.renderEditorFields(item, locked);
  }

  renderEditorFields(item, locked) {
    const field = (label, key, type = 'number', step = 1) => `
      <div class="field">
        <label>${label}</label>
        <input type="${type}" data-key="${key}" value="${item[key] ?? ''}" step="${step}" ${locked ? 'disabled' : ''}>
      </div>`;

    let html = '';
    if (item.type === 'grid') {
      html += `
        <div class="field-group">
          <label class="group-label">Layout</label>
          ${field('Cell Size (px)', 'size')}
          ${field('Max Container Width (px)', 'maxWidth')}
        </div>
        <div class="field-group">
          <label class="group-label">Appearance</label>
          ${field('Color', 'color', 'color')}
          ${field('Opacity', 'opacity', 'number', 0.01)}
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
            <select data-key="typeMode" ${locked ? 'disabled' : ''}>
              <option value="stretch" ${item.typeMode==='stretch'?'selected':''}>Stretch</option>
              <option value="center" ${item.typeMode==='center'?'selected':''}>Center</option>
              <option value="${isRow?'top':'left'}" ${item.typeMode===(isRow?'top':'left')?'selected':''}>${isRow?'Top':'Left'}</option>
              <option value="${isRow?'bottom':'right'}" ${item.typeMode===(isRow?'bottom':'right')?'selected':''}>${isRow?'Bottom':'Right'}</option>
            </select>
          </div>
          ${item.typeMode === 'stretch' ? field('Margin (px)', 'margin') : field(isRow ? 'Height (px)' : 'Width (px)', isRow ? 'height' : 'width')}
          ${field('Max Container Width (px)', 'maxWidth')}
        </div>
        <div class="field-group">
          <label class="group-label">Appearance</label>
          ${field('Color', 'color', 'color')}
          ${field('Opacity', 'opacity', 'number', 0.01)}
        </div>`;
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
      if (key === 'count' && val < 1) val = 1;
    }
    item[key] = val;
    this.pushToContent();
    this.saveDebounced();
    if (key === 'typeMode') this.openEditor(this.editingIndex);
  }

  switchType(type) {
    this.getCurrent().items[this.editingIndex].type = type;
    this.openEditor(this.editingIndex);
    if (!this.getCurrent().locked) {
      this.persist();
      this.pushToContent();
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
    this.dom.btnDelete.style.opacity = locked ? '0.2' : '1';
    this.dom.btnDelete.style.pointerEvents = locked ? 'none' : 'auto';
    this.dom.btnRename.style.opacity = locked ? '0.2' : '1';
    this.dom.btnRename.style.pointerEvents = locked ? 'none' : 'auto';
    this.dom.btnAddLayer.style.display = locked ? 'none' : 'flex';

    this.dom.profileSelect.innerHTML = Object.entries(this.profiles)
      .map(([id, p]) => `<option value="${id}" ${id === this.activeId ? 'selected' : ''}>${p.name} ${p.locked ? '🔒' : ''}</option>`)
      .join('');

    this.renderLayers();
    this.initDragAndDrop();
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
      document.getElementById('quick-add-default')?.addEventListener('click', () => {
        if (p.locked) return;
        p.items.push({ type: 'columns', count: 12, typeMode: 'center', width: 80, gutter: 24, color: '#dc3545', opacity: 0.15, visible: true, maxWidth: 1320 });
        this.openEditor(p.items.length - 1);
        this.renderLayers();
        this.persist();
        this.pushToContent();
      });
      return;
    }

    this.dom.layersList.innerHTML = p.items.map((item, i) => {
      let name = '';
      if (item.type === 'grid') {
        name = `Grid ${item.size || 20}px`;
        if (item.maxWidth > 0) name += `, max ${item.maxWidth}px`;
      } else if (item.type === 'columns') {
        name = `${item.count || 12} columns (${item.gutter || 0}px)`;
        if (item.maxWidth > 0) name += `, max ${item.maxWidth}px`;
      } else if (item.type === 'rows') {
        const heightVal = item.height || (item.typeMode === 'stretch' ? '1fr' : 80);
        name = `${item.count || 12} rows (${heightVal}${typeof heightVal === 'number' ? 'px' : ''})`;
        if (item.maxWidth > 0) name += `, max ${item.maxWidth}px`;
      } else {
        name = item.type.charAt(0).toUpperCase() + item.type.slice(1);
      }

      return `
        <div class="layer-card ${this.editingIndex === i ? 'active' : ''} ${p.locked ? 'is-locked' : ''}" data-idx="${i}" draggable="${!p.locked}">
          <div class="color-indicator" style="background:${item.color}"></div>
          <div class="layer-info">
            <div class="layer-title">
              <span class="layer-name" title="${name}">${name}</span>
              <span class="op-val">${Math.round((item.opacity || 0) * 100)}%</span>
            </div>
            <input 
              type="range" 
              class="quick-opacity" 
              data-idx="${i}" 
              min="0" 
              max="1" 
              step="0.01"
              draggable="false"
              value="${item.opacity || 0}" 
              ${p.locked ? 'disabled' : ''}
            >
          </div>
          <div class="layer-actions">
            <button class="btn-vis btn-icon" aria-label="Toggle visibility" ${p.locked ? 'style="opacity:0.2"' : ''}>
              ${item.visible ? ICONS.eye : ICONS.eyeOff}
            </button>
            <div class="drag-handle" aria-label="Drag to reorder">
              ${ICONS.drag}
            </div>
            ${p.locked
              ? `<div class="lock-indicator">${ICONS.lock}</div>`
              : `<button class="btn-del btn-icon danger" aria-label="Delete layer">${ICONS.trash}</button>`
            }
          </div>
        </div>`;
    }).join('');
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

  debounce(fn, delay) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }
}

document.addEventListener('DOMContentLoaded', () => new GridApp());