// popup.js - Ultra Fast Interaction Logic
const SYSTEM_PROFILES = {
  bootstrap_xxl: {
    name: 'Bootstrap 5 (XXL)',
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
        opacity: 0.15,
        visible: true,
        maxWidth: 1320,
      },
    ],
  },
  tailwind_container: {
    name: 'Tailwind Container',
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
        opacity: 0.15,
        visible: true,
      },
    ],
  },
  baseline_8: {
    name: '8pt Grid',
    locked: true,
    items: [{ type: 'grid', size: 8, color: '#e83e8c', opacity: 0.1, visible: true }],
  },
};

class App {
  constructor() {
    this.state = {
      profiles: JSON.parse(JSON.stringify(SYSTEM_PROFILES)),
      activeProfileId: 'bootstrap_xxl',
      editingIndex: null,
    };
    this.dom = {
      toggle: document.getElementById('global-toggle'),
      profileSelect: document.getElementById('profile-select'),
      layersList: document.getElementById('layers-list'),
      btnAddProfile: document.getElementById('btn-add-profile'),
      btnDuplicateProfile: document.getElementById('btn-duplicate-profile'),
      btnRenameProfile: document.getElementById('btn-rename-profile'),
      btnDeleteProfile: document.getElementById('btn-delete-profile'),
      btnAddLayer: document.getElementById('btn-add-layer'),
      editorPanel: document.getElementById('editor-panel'),
      editorFields: document.getElementById('editor-fields'),
      btnCloseEditor: document.getElementById('btn-close-editor'),
      segments: document.querySelectorAll('.segment'),
    };
    this.saveDebounced = this.debounce(() => this.persistData(), 300);
    this.init();
  }

  async init() {
    await this.loadStorage();
    this.setupListeners();
    this.syncWithTab();
    this.render();
  }

  syncWithTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_STATUS' }, (res) => {
          if (!chrome.runtime.lastError && res) this.dom.toggle.checked = res.enabled;
        });
      }
    });
  }

  async loadStorage() {
    const data = await chrome.storage.sync.get(['store']);
    if (data.store) {
      this.state.profiles = { ...SYSTEM_PROFILES, ...data.store.profiles };
      this.state.activeProfileId = data.store.activeProfileId || 'bootstrap_xxl';
    }
  }

  pushUpdate() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'UPDATE', items: this.getCurrentProfile().items });
    });
  }

  persistData() {
    const customs = {};
    Object.entries(this.state.profiles).forEach(([id, p]) => {
      if (!p.locked) customs[id] = p;
    });
    chrome.storage.sync.set({ store: { profiles: customs, activeProfileId: this.state.activeProfileId } });
  }

  getCurrentProfile() {
    return this.state.profiles[this.state.activeProfileId];
  }

  setupListeners() {
    this.dom.toggle.addEventListener('change', (e) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_LOCAL' });
          chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: e.target.checked, tabId: tabs[0].id });
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.editingIndex !== null) this.closeEditor();
    });

    this.dom.btnDuplicateProfile.addEventListener('click', () => {
      const cur = this.getCurrentProfile();
      const name = prompt('Duplicate Name:', `${cur.name} (Copy)`);
      if (!name) return;
      const id = 'c_' + Date.now();
      this.state.profiles[id] = { name, items: JSON.parse(JSON.stringify(cur.items)), locked: false };
      this.state.activeProfileId = id;
      this.pushUpdate();
      this.persistData();
      this.render();
    });

    this.dom.profileSelect.addEventListener('change', (e) => {
      this.state.activeProfileId = e.target.value;
      this.closeEditor();
      this.render();
      this.pushUpdate();
      this.persistData();
    });

    this.dom.layersList.addEventListener('input', (e) => {
      if (e.target.classList.contains('quick-opacity')) {
        if (this.getCurrentProfile().locked) {
          this.renderLayers();
          return;
        }
        const val = parseFloat(e.target.value);
        this.getCurrentProfile().items[e.target.dataset.idx].opacity = val;
        this.pushUpdate();
        this.saveDebounced();
        e.target.previousElementSibling.querySelector('.op-val').textContent = `${Math.round(val * 100)}%`;
      }
    });

    this.dom.btnAddLayer.addEventListener('click', () => {
      if (this.getCurrentProfile().locked) return alert('System preset is locked. Duplicate it first.');
      this.getCurrentProfile().items.push({
        type: 'columns',
        count: 12,
        gutter: 24,
        margin: 24,
        color: '#3b82f6',
        opacity: 0.15,
        visible: true,
      });
      this.pushUpdate();
      this.persistData();
      this.renderLayers();
      this.openEditor(this.getCurrentProfile().items.length - 1);
    });

    this.dom.layersList.addEventListener('click', (e) => {
      const idx = e.target.closest('.layer-card')?.dataset.idx;
      if (idx === undefined) return;
      if (e.target.closest('.btn-vis')) {
        this.getCurrentProfile().items[idx].visible = !this.getCurrentProfile().items[idx].visible;
        this.pushUpdate();
        this.persistData();
        this.renderLayers();
      } else if (e.target.closest('.btn-del')) {
        if (this.getCurrentProfile().locked) return;
        this.getCurrentProfile().items.splice(idx, 1);
        this.closeEditor();
        this.pushUpdate();
        this.persistData();
        this.renderLayers();
      } else if (!e.target.classList.contains('quick-opacity')) {
        this.openEditor(parseInt(idx));
      }
    });

    this.dom.btnAddProfile.addEventListener('click', () => {
      const name = prompt('Profile Name:');
      if (!name) return;
      const id = 'c_' + Date.now();
      this.state.profiles[id] = { name, items: [], locked: false };
      this.state.activeProfileId = id;
      this.persistData();
      this.render();
    });

    this.dom.btnRenameProfile.addEventListener('click', () => {
      if (this.getCurrentProfile().locked) return;
      const name = prompt('Rename to:', this.getCurrentProfile().name);
      if (name) {
        this.getCurrentProfile().name = name;
        this.persistData();
        this.render();
      }
    });

    this.dom.btnDeleteProfile.addEventListener('click', () => {
      if (this.getCurrentProfile().locked) return;
      if (confirm('Delete profile?')) {
        delete this.state.profiles[this.state.activeProfileId];
        this.state.activeProfileId = Object.keys(this.state.profiles)[0];
        this.persistData();
        this.render();
      }
    });

    this.dom.btnCloseEditor.addEventListener('click', () => this.closeEditor());
    this.dom.segments.forEach((s) => s.addEventListener('click', (e) => this.switchType(e.target.dataset.type)));
    this.dom.editorFields.addEventListener('input', (e) => this.handleInput(e));
  }

  openEditor(idx) {
    this.state.editingIndex = idx;
    this.dom.editorPanel.classList.add('open');
    const item = this.getCurrentProfile().items[idx];
    const isLocked = this.getCurrentProfile().locked;
    this.dom.segments.forEach((s) => {
      s.classList.toggle('active', s.dataset.type === item.type);
      s.style.opacity = isLocked ? '0.5' : '1';
    });
    let h = isLocked ? `<div class="locked-banner">🔒 READ-ONLY PRESET</div>` : '';
    const f = (l, k, t = 'number', s = 1) =>
      `<div class="field"><label>${l}</label><input type="${t}" data-key="${k}" value="${item[k] ?? ''}" step="${s}" ${isLocked ? 'disabled' : ''}></div>`;
    if (item.type === 'grid')
      h += f('Size', 'size') + f('Color', 'color', 'color') + f('Opacity', 'opacity', 'number', 0.01);
    else {
      const isRow = item.type === 'rows';
      h +=
        f('Count', 'count') +
        f('Gutter', 'gutter') +
        `<div class="field"><label>Mode</label><select data-key="typeMode" ${isLocked ? 'disabled' : ''}><option value="stretch" ${item.typeMode === 'stretch' ? 'selected' : ''}>Stretch</option><option value="center" ${item.typeMode === 'center' ? 'selected' : ''}>Center</option><option value="left" ${item.typeMode === 'left' ? 'selected' : ''}>L/T</option><option value="right" ${item.typeMode === 'right' ? 'selected' : ''}>R/B</option></select></div>`;
      if (item.typeMode === 'stretch') h += f('Margin', 'margin');
      else {
        h += f('Offset', 'offset') + f(isRow ? 'Height' : 'Width', 'width');
      }
      h += f('Max Width', 'maxWidth') + f('Color', 'color', 'color') + f('Opacity', 'opacity', 'number', 0.01);
    }
    this.dom.editorFields.innerHTML = h;
    this.renderLayers();
  }

  closeEditor() {
    this.state.editingIndex = null;
    this.dom.editorPanel.classList.remove('open');
    this.renderLayers();
  }
  switchType(t) {
    if (this.getCurrentProfile().locked) return;
    const i = this.getCurrentProfile().items[this.state.editingIndex];
    i.type = t;
    i.typeMode = 'stretch';
    this.pushUpdate();
    this.persistData();
    this.openEditor(this.state.editingIndex);
  }
  handleInput(e) {
    if (this.getCurrentProfile().locked) return;
    const i = this.getCurrentProfile().items[this.state.editingIndex];
    const k = e.target.dataset.key;
    i[k] = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    this.pushUpdate();
    this.saveDebounced();
    if (k === 'typeMode') this.openEditor(this.state.editingIndex);
    else this.renderLayers();
  }
  render() {
    this.dom.profileSelect.innerHTML = Object.entries(this.state.profiles)
      .map(
        ([id, p]) =>
          `<option value="${id}" ${id === this.state.activeProfileId ? 'selected' : ''}>${p.name} ${p.locked ? '🔒' : ''}</option>`
      )
      .join('');
    this.dom.btnDeleteProfile.disabled = this.getCurrentProfile().locked;
    this.dom.btnRenameProfile.disabled = this.getCurrentProfile().locked;
    this.renderLayers();
  }

  renderLayers() {
    const p = this.getCurrentProfile();
    const list = p.items
      .map(
        (item, i) => `
      <div class="layer-card ${this.state.editingIndex === i ? 'active' : ''}" data-idx="${i}">
        <div class="color-indicator" style="background:${item.color}"></div>
        <div class="layer-info">
          <div class="layer-title">Layer ${i + 1} <span class="op-val">${Math.round(item.opacity * 100)}%</span></div>
          <input type="range" class="quick-opacity" data-idx="${i}" min="0" max="1" step="0.01" value="${item.opacity}">
        </div>
        <div class="layer-controls">
          <button class="btn-vis">${item.visible ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z"/><circle cx="12" cy="12" r="3"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2L22 22M6.71277 6.7226C3.66403 8.79582 2 12 2 12C2 12 5.63636 20 12 20C14.0603 20 15.8988 19.1303 17.4104 17.885M10.7312 4.13563C11.148 4.04744 11.5714 4 12 4C18.3636 4 22 12 22 12C22 12 21.3082 13.5025 20.2351 15.0014M14.1213 9.87868C14.685 10.4424 15 11.2076 15 12C15 13.6569 13.6569 15 12 15C11.2076 15 10.4424 14.685 9.87868 14.1213"/></svg>'}</button>
          <button class="btn-del"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 10V17M10 10V17M6 6V17.8C6 18.9201 6 19.4802 6.21799 19.908C6.40973 20.2843 6.71569 20.5903 7.09202 20.782C7.51984 21 8.07989 21 9.2 21H14.8C15.9201 21 16.4802 21 16.908 20.782C17.2843 20.5903 17.5903 20.2843 17.782 19.908C18 19.4802 18 18.9201 18 17.8V6M6 6H8M6 6H4M8 6V4.2C8 3.07989 8 2.51984 8.21799 2.09202C8.40973 1.71569 8.71569 1.40973 9.09202 1.21799C9.51984 1 10.0799 1 11.2 1H12.8C13.9201 1 14.4802 1 14.908 1.21799C15.2843 1.40973 15.5903 1.71569 15.782 2.09202C16 2.51984 16 3.07989 16 4.2V6M8 6H16M16 6H18M18 6H20"/></svg></button>
        </div>
      </div>`
      )
      .join('');
    this.dom.layersList.innerHTML =
      list ||
      `<div class="empty-state"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.2"><path d="M12 5V19M5 12H19"/></svg><p>No layers yet.<br>Click "+ Add Layer" to start.</p></div>`;
  }
  debounce(f, w) {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => f(...a), w);
    };
  }
}
document.addEventListener('DOMContentLoaded', () => new App());
