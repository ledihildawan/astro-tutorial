const SYSTEM_PROFILES = {
  '8px_grid': { name: 'System: 8px Soft Grid', locked: true, items: [{ type: 'grid', size: 8, color: '#10b981', opacity: 0.1, visible: true }] },
  'mobile_fluid': { name: 'Mobile: 4 Col (Fluid)', locked: true, items: [{ type: 'columns', count: 4, typeMode: 'stretch', gutter: 16, margin: 20, color: '#f43f5e', opacity: 0.15, visible: true, maxWidth: 0 }] },
  'tablet_fluid': { name: 'Tablet: 8 Col (Fluid)', locked: true, items: [{ type: 'columns', count: 8, typeMode: 'stretch', gutter: 24, margin: 32, color: '#8b5cf6', opacity: 0.15, visible: true, maxWidth: 0 }] },
  'desktop_fluid': { name: 'Desktop: 12 Col (Fluid)', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'stretch', gutter: 24, margin: 48, color: '#3b82f6', opacity: 0.15, visible: true, maxWidth: 1440 }] },
  'bootstrap_xxl': { name: 'Bootstrap 5 (XXL)', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'stretch', gutter: 24, margin: 0, color: '#6610f2', opacity: 0.15, visible: true, maxWidth: 1320 }] },
  'tailwind_xl': { name: 'Tailwind CSS (XL)', locked: true, items: [{ type: 'columns', count: 12, typeMode: 'stretch', gutter: 32, margin: 0, color: '#06b6d4', opacity: 0.15, visible: true, maxWidth: 1280 }] }
};

const ICONS = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
  lock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
};

const escapeHtml = (unsafe) => typeof unsafe === 'string' ? unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : '';
const isValidHex = (hex) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

class GridApp {
  constructor() {
    this.profiles = { ...SYSTEM_PROFILES };
    this.activeId = 'desktop_fluid';
    this.editingIndex = null;
    this.debounce = (fn, delay) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; };
    this.saveDebounced = this.debounce(() => this.persist(), 150);
    this.init();
  }

  async init() { this.cacheDOM(); await this.load(); this.bindEvents(); this.syncInitialStatus(); this.render(); }

  cacheDOM() {
    this.dom = {
      main: document.getElementById('main-content'), layersList: document.getElementById('layers-list'), editorPanel: document.getElementById('editor-panel'), editorFields: document.getElementById('editor-fields'), toggle: document.getElementById('global-toggle'), profileSelect: document.getElementById('profile-select'), importInput: document.getElementById('import-input'), btnRename: document.getElementById('btn-rename-profile'), btnDelete: document.getElementById('btn-delete-profile'), btnAddLayer: document.getElementById('btn-add-layer'), btnCloseEditor: document.getElementById('btn-close-editor'), segments: document.querySelectorAll('.segment'), lockedBanner: document.getElementById('locked-banner')
    };
  }

  async load() {
    const { store } = await chrome.storage.local.get(['store']);
    if (store?.profiles) {
      const migrated = {};
      for (const [id, p] of Object.entries(store.profiles)) {
        if (!p || typeof p !== 'object') continue;
        migrated[id] = { ...p, name: escapeHtml(p.name || 'Unnamed'), items: (p.items || []).map(item => ({ typeMode: 'stretch', maxWidth: 0, ...item, color: isValidHex(item.color) ? item.color : '#3b82f6' })) };
      }
      this.profiles = { ...SYSTEM_PROFILES, ...migrated };
    }
    const savedId = store?.activeProfileId;
    if (savedId && this.profiles[savedId]) { this.activeId = savedId; } else { this.activeId = 'desktop_fluid'; }
    this.persist();
  }

  persist() {
    const customs = Object.fromEntries(Object.entries(this.profiles).filter(([_, p]) => !p.locked));
    const currentProfile = this.getCurrent();
    const itemsToRender = currentProfile ? currentProfile.items : [];
    chrome.storage.local.set({ store: { profiles: customs, activeProfileId: this.activeId, activeRenderItems: itemsToRender } });
  }

  getCurrent() { return this.profiles[this.activeId] || this.profiles['desktop_fluid'] || Object.values(this.profiles)[0]; }

  syncInitialStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) { chrome.tabs.sendMessage(tab.id, { action: 'GET_STATUS' }, (res) => { if (!chrome.runtime.lastError && res) { this.dom.toggle.checked = res.enabled; } }); }
    });
  }

  bindEvents() {
    this.dom.toggle.addEventListener('change', e => this.handleGlobalToggle(e.target.checked));
    this.dom.profileSelect.addEventListener('change', e => this.switchProfile(e.target.value));
    const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    bind('btn-add-profile', () => this.addProfile()); bind('btn-duplicate-profile', () => this.duplicateProfile());
    bind('btn-export-profile', () => this.exportProfile()); bind('btn-import-profile', () => this.dom.importInput.click());
    this.dom.btnRename.onclick = () => this.renameProfile(); this.dom.btnDelete.onclick = () => this.deleteProfile();
    this.dom.importInput.onchange = e => this.importProfile(e); this.dom.btnAddLayer.onclick = () => this.addLayer();
    this.dom.layersList.oninput = e => this.handleLayerQuickOpacity(e); this.dom.layersList.onclick = e => this.handleLayerClick(e);
    this.dom.btnCloseEditor.onclick = () => this.closeEditor();
    this.dom.segments.forEach(s => s.onclick = e => this.switchType(e.target.dataset.type));
    this.dom.editorFields.oninput = e => this.handleEditorInput(e);
  }

  handleLayerQuickOpacity(e) {
    if (!e.target.matches('.quick-opacity')) return;
    const idx = parseInt(e.target.dataset.idx), val = parseFloat(e.target.value);
    if (isNaN(idx) || isNaN(val)) return;
    const item = this.getCurrent().items[idx]; item.opacity = Math.max(0, Math.min(1, val));
    const card = e.target.closest('.layer-card'); if (card) { const op = card.querySelector('.op-val'); if(op) op.textContent = `${Math.round(item.opacity * 100)}%`; }
    this.saveDebounced();
  }

  handleGlobalToggle(enabled) {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab?.id) { chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_LOCAL' }).catch(() => {}); chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled, tabId: tab.id }); }
    });
  }

  switchProfile(id) { if (!this.profiles[id]) return; this.activeId = id; this.closeEditor(); this.render(); this.persist(); }
  addProfile() { const id = 'custom_' + Date.now(); this.profiles[id] = { name: 'New Preset', items: [], locked: false }; this.switchProfile(id); }
  duplicateProfile() { const current = this.getCurrent(), id = 'custom_' + Date.now(); this.profiles[id] = { name: `${current.name} Copy`, items: JSON.parse(JSON.stringify(current.items)), locked: false }; this.switchProfile(id); }

  renameProfile() {
    if (this.getCurrent().locked) return;
    let newName = prompt('Enter new profile name:', this.getCurrent().name);
    if (newName) { this.getCurrent().name = escapeHtml(newName.trim().substring(0, 30)); this.render(); this.persist(); }
  }

  deleteProfile() { if (this.getCurrent().locked) return; if (confirm('Delete this profile?')) { delete this.profiles[this.activeId]; this.activeId = Object.keys(this.profiles)[0]; this.switchProfile(this.activeId); } }

  exportProfile() {
    const data = JSON.stringify(this.getCurrent(), null, 2), blob = new Blob([data], { type: 'application/json' }), url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = (this.getCurrent().name || 'preset').replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".json";
    document.body.appendChild(anchor); anchor.click(); setTimeout(() => { document.body.removeChild(anchor); URL.revokeObjectURL(url); }, 100);
  }

  importProfile(e) {
    const file = e.target.files[0]; if (!file || file.size > 51200) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const obj = JSON.parse(event.target.result);
        if (obj.items && Array.isArray(obj.items)) {
          const safeItems = obj.items.map(i => ({ type: ['grid','columns','rows'].includes(i.type) ? i.type : 'columns', count: typeof i.count === 'number' ? i.count : 12, typeMode: ['stretch','center','left','right','top','bottom'].includes(i.typeMode) ? i.typeMode : 'stretch', width: typeof i.width === 'number' ? i.width : 80, gutter: typeof i.gutter === 'number' ? i.gutter : 24, color: isValidHex(i.color) ? i.color : '#dc3545', opacity: typeof i.opacity === 'number' ? i.opacity : 0.15, visible: !!i.visible, maxWidth: typeof i.maxWidth === 'number' ? i.maxWidth : 0 }));
          const id = 'custom_' + Date.now(); this.profiles[id] = { name: escapeHtml(obj.name || 'Imported'), items: safeItems, locked: false }; this.switchProfile(id);
        }
      } catch (err) { alert('Invalid file'); }
    }; reader.readAsText(file); e.target.value = '';
  }

  // FIX: Default 'Add Layer' sekarang menggunakan mode stretch & warna biru (Real World Style)
  addLayer() { if (this.getCurrent().locked) return; this.getCurrent().items.push({ type: 'columns', count: 12, typeMode: 'stretch', gutter: 24, margin: 20, maxWidth: 1280, color: '#3b82f6', opacity: 0.15, visible: true }); this.openEditor(this.getCurrent().items.length - 1); this.renderLayers(); this.persist(); }

  handleLayerClick(e) {
    const btnDel = e.target.closest('.btn-del'), btnVis = e.target.closest('.btn-vis'), card = e.target.closest('.layer-card');
    if (!card) return; const index = parseInt(card.dataset.idx); if (isNaN(index)) return;
    if (btnDel) { if (this.getCurrent().locked) return; this.getCurrent().items.splice(index, 1); this.editingIndex = null; this.closeEditor(); this.renderLayers(); this.persist(); return; }
    if (btnVis) { if (this.getCurrent().locked) return; const item = this.getCurrent().items[index]; item.visible = !item.visible; btnVis.innerHTML = item.visible ? ICONS.eye : ICONS.eyeOff; this.persist(); return; }
    if (!e.target.closest('input') && !e.target.closest('button')) this.openEditor(index);
  }

  switchType(newType) {
    if (this.editingIndex === null || this.getCurrent().locked || !['columns', 'rows', 'grid'].includes(newType)) return;
    const item = this.getCurrent().items[this.editingIndex]; item.type = newType;
    if (newType === 'grid') { item.size = item.size ?? 20; } else { item.count = item.count ?? 12; item.typeMode = item.typeMode ?? 'stretch'; item.gutter = item.gutter ?? 20; }
    this.openEditor(this.editingIndex); this.renderLayers(); this.saveDebounced();
  }

  openEditor(index) {
    this.editingIndex = index; const isLocked = this.getCurrent().locked, item = this.getCurrent().items[index];
    this.dom.editorPanel.classList.add('open'); this.dom.main.classList.add('dimmed');
    this.dom.lockedBanner.style.display = isLocked ? 'block' : 'none';
    document.querySelectorAll('.layer-card').forEach((el, i) => el.classList.toggle('active', i === index));
    this.dom.segments.forEach(s => s.classList.toggle('active', s.dataset.type === item.type));
    const createField = (label, key, type = 'number', step = '1') => `<div class="field"><label>${escapeHtml(label)}</label><input type="${type}" data-key="${key}" value="${item[key] ?? ''}" step="${step}" ${isLocked ? 'disabled' : ''}></div>`;
    let html = '';
    if (item.type === 'grid') { html += `<div class="field-group"><label class="group-label">Layout</label>${createField('Cell Size (px)', 'size')}${createField('Max Container Width (px)', 'maxWidth')}</div>`; } 
    else {
      const isRow = item.type === 'rows', mode = item.typeMode;
      html += `<div class="field-group"><label class="group-label">Layout</label>${createField('Count', 'count')}${createField('Gutter (px)', 'gutter')}<div class="field full-width"><label>Alignment Mode</label><select data-key="typeMode" ${isLocked ? 'disabled' : ''}><option value="stretch" ${mode==='stretch'?'selected':''}>Stretch (Fluid)</option><option value="center" ${mode==='center'?'selected':''}>Center (Fixed)</option><option value="${isRow?'top':'left'}" ${mode===(isRow?'top':'left')?'selected':''}>${isRow?'Top':'Left'}</option><option value="${isRow?'bottom':'right'}" ${mode===(isRow?'bottom':'right')?'selected':''}>${isRow?'Bottom':'Right'}</option></select></div>${mode === 'stretch' ? createField('Margin (px)', 'margin') : createField(isRow ? 'Height (px)' : 'Width (px)', isRow ? 'height' : 'width')}${createField('Max Container Width (px)', 'maxWidth')}</div>`;
    }
    html += `<div class="field-group"><label class="group-label">Appearance</label>${createField('Color', 'color', 'color')}${createField('Opacity', 'opacity', 'number', 0.01)}</div>`;
    this.dom.editorFields.innerHTML = html;
  }

  handleEditorInput(e) {
    if (this.getCurrent().locked) return;
    const item = this.getCurrent().items[this.editingIndex], key = e.target.dataset.key; let val = e.target.value;
    if (e.target.type === 'number') { val = parseFloat(val); if (isNaN(val)) val = 0; if (key === 'count') val = Math.max(1, Math.min(64, Math.floor(val))); if (key === 'opacity') val = Math.min(1, Math.max(0, val)); if (['size', 'width', 'height', 'gutter', 'margin', 'maxWidth'].includes(key)) val = Math.floor(Math.abs(val)); } 
    else if (key === 'color') { if (!isValidHex(val)) val = '#3b82f6'; }
    item[key] = val; this.saveDebounced();
    if (key === 'typeMode') this.openEditor(this.editingIndex); if (['count', 'type', 'gutter', 'typeMode', 'size'].includes(key)) this.renderLayers();
    if (key === 'opacity') { const card = this.dom.layersList.querySelector(`.layer-card[data-idx="${this.editingIndex}"]`); if (card) { const s = card.querySelector('.quick-opacity'), t = card.querySelector('.op-val'); if(s) s.value = item.opacity ?? 0.15; if(t) t.textContent = `${Math.round((item.opacity ?? 0.15) * 100)}%`; } }
  }

  closeEditor() { this.editingIndex = null; this.dom.editorPanel.classList.remove('open'); this.dom.main.classList.remove('dimmed'); this.renderLayers(); }

  render() {
    const p = this.getCurrent(), locked = p.locked;
    this.dom.btnDelete.disabled = locked; this.dom.btnRename.disabled = locked;
    this.dom.btnDelete.style.opacity = locked ? '0.2' : '1'; this.dom.btnRename.style.opacity = locked ? '0.2' : '1';
    this.dom.btnAddLayer.style.display = locked ? 'none' : 'flex';
    this.dom.profileSelect.innerHTML = '';
    Object.entries(this.profiles).forEach(([id, prof]) => { const o = document.createElement('option'); o.value = id; o.textContent = `${prof.name} ${prof.locked ? '🔒' : ''}`; if (id === this.activeId) o.selected = true; this.dom.profileSelect.appendChild(o); });
    this.renderLayers();
  }

  renderLayers() {
    const p = this.getCurrent(); this.dom.layersList.innerHTML = '';
    if (p.items.length === 0) { this.dom.layersList.innerHTML = `<div class="empty-state"><p style="margin:0 0 16px;color:var(--text-secondary);font-size:12px;">No layers yet.</p><button class="btn-new-layer" style="width:100%;padding:12px;gap:10px;font-size:11px;" id="quick-add-default">${ICONS.plus}<span>Add Bootstrap 12-column grid</span></button></div>`; document.getElementById('quick-add-default').onclick = () => { if(!p.locked) this.addLayer(); }; return; }
    const frag = document.createDocumentFragment();
    p.items.forEach((item, i) => {
      let name = item.type === 'grid' ? `Grid ${item.size ?? 20}px` : `${item.count ?? 12} ${item.type === 'rows' ? 'Rows' : 'Cols'} (${item.gutter ?? 0}px) ${item.typeMode === 'stretch' ? 'Fluid' : 'Fixed'}`;
      const card = document.createElement('div'); card.className = `layer-card ${this.editingIndex === i ? 'active' : ''} ${p.locked ? 'is-locked' : ''}`; card.dataset.idx = i;
      card.innerHTML = `<div class="color-indicator" style="background:${item.color || '#3b82f6'}"></div><div class="layer-info"><div class="layer-title"><span class="layer-name"></span><span class="op-val">${Math.round((item.opacity ?? 0.15) * 100)}%</span></div><input type="range" class="quick-opacity" data-idx="${i}" min="0" max="1" step="0.01" value="${item.opacity ?? 0.15}" ${p.locked ? 'disabled' : ''}></div><div class="layer-actions"><button class="btn-vis btn-icon" aria-label="Toggle visibility" ${p.locked ? 'disabled style="opacity:0.2"' : ''}>${item.visible ? ICONS.eye : ICONS.eyeOff}</button>${p.locked ? `<div class="lock-indicator" style="opacity:0.3">${ICONS.lock}</div>` : `<button class="btn-del btn-icon danger" aria-label="Delete layer">${ICONS.trash}</button>`}</div>`;
      card.querySelector('.layer-name').textContent = name; card.querySelector('.layer-name').title = name;
      const slider = card.querySelector('.quick-opacity');
      if (slider) { slider.addEventListener('click', e => e.stopPropagation()); slider.addEventListener('mousedown', e => e.stopPropagation()); slider.addEventListener('input', () => { const t = card.querySelector('.op-val'); if(t) t.textContent = `${Math.round(slider.value * 100)}%`; }); }
      if (!p.locked) {
          card.setAttribute('draggable', 'true');
          card.addEventListener('dragstart', (e) => { if (e.target.tagName === 'INPUT' || e.target.closest('button')) { e.preventDefault(); return false; } card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', i); });
          card.addEventListener('dragend', () => card.classList.remove('dragging'));
          if(slider) { slider.addEventListener('mouseenter', () => card.setAttribute('draggable', 'false')); slider.addEventListener('mouseleave', () => card.setAttribute('draggable', 'true')); }
      }
      frag.appendChild(card);
    });
    this.dom.layersList.appendChild(frag); this.initDragAndDrop();
  }

  initDragAndDrop() {
      const container = this.dom.layersList;
      container.ondragover = (e) => { e.preventDefault(); const draggable = container.querySelector('.dragging'); if (!draggable) return; const afterElement = this.getDragAfterElement(container, e.clientY); if (afterElement == null) container.appendChild(draggable); else container.insertBefore(draggable, afterElement); };
      container.ondrop = (e) => { e.preventDefault(); if (this.getCurrent().locked) return; const newItems = []; [...this.dom.layersList.children].forEach(child => { const oldIdx = parseInt(child.dataset.idx); if (!isNaN(oldIdx)) newItems.push(this.getCurrent().items[oldIdx]); }); this.getCurrent().items = newItems; this.closeEditor(); this.renderLayers(); this.persist(); };
  }

  getDragAfterElement(container, y) { return [...container.querySelectorAll('.layer-card:not(.dragging)')].reduce((closest, child) => { const box = child.getBoundingClientRect(), offset = y - box.top - box.height / 2; return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest; }, { offset: Number.NEGATIVE_INFINITY }).element; }
}
document.addEventListener('DOMContentLoaded', () => new GridApp());