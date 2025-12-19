const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Bootstrap XXL',
  items: [
    {
      type: 'columns',
      count: 12,
      gutter: 24,
      margin: 0,
      width: 80,
      color: '#ef4444',
      opacity: 0.1,
      visible: true,
      typeMode: 'center',
      maxWidth: 1320,
    },
  ],
};

class App {
  constructor() {
    this.state = {
      enabled: false,
      activeProfileId: 'default',
      profiles: { default: JSON.parse(JSON.stringify(DEFAULT_PROFILE)) },
      editingIndex: null,
    };

    this.els = {
      toggle: document.getElementById('global-toggle'),
      profileSelect: document.getElementById('profile-select'),
      layersList: document.getElementById('layers-list'),
      editorPanel: document.getElementById('editor-panel'),
      editorFields: document.getElementById('editor-fields'),
      btnAddLayer: document.getElementById('btn-add-layer'),
      btnAddProfile: document.getElementById('btn-add-profile'),
      btnDelProfile: document.getElementById('btn-delete-profile'),
      btnCloseEditor: document.getElementById('btn-close-editor'),
      segments: document.querySelectorAll('.segment'),
    };

    this.handleInput = this.debounce(this.handleInput.bind(this), 200);
    this.init();
  }

  async init() {
    await this.loadFromStorage();
    this.setupListeners();
    this.render();
  }

  async loadFromStorage() {
    const data = await chrome.storage.sync.get(['store']);
    if (data.store) {
      this.state = { ...this.state, ...data.store };
      if (!this.state.profiles[this.state.activeProfileId]) {
        this.state.activeProfileId = Object.keys(this.state.profiles)[0] || 'default';
      }
    }
    this.els.toggle.checked = this.state.enabled;
  }

  save() {
    chrome.storage.sync.set({ store: this.state });
    this.broadcast();
  }

  broadcast() {
    const profile = this.state.profiles[this.state.activeProfileId];
    const payload = {
      action: 'UPDATE',
      enabled: this.state.enabled,
      items: profile ? profile.items : [],
    };
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, payload).catch(() => {});
    });
  }

  setupListeners() {
    this.els.toggle.addEventListener('change', (e) => {
      this.state.enabled = e.target.checked;
      this.save();
    });

    this.els.profileSelect.addEventListener('change', (e) => {
      this.state.activeProfileId = e.target.value;
      this.state.editingIndex = null;
      this.closeEditor();
      this.render();
      this.save();
    });

    this.els.btnAddProfile.addEventListener('click', () => {
      const name = prompt('Profile Name:', 'New Layout');
      if (!name) return;
      const id = 'p_' + Date.now();
      this.state.profiles[id] = { id, name, items: [] };
      this.state.activeProfileId = id;
      this.save();
      this.render();
    });

    this.els.btnDelProfile.addEventListener('click', () => {
      const ids = Object.keys(this.state.profiles);
      if (ids.length <= 1) return alert('Keep at least one profile.');
      if (confirm('Delete this profile?')) {
        delete this.state.profiles[this.state.activeProfileId];
        this.state.activeProfileId = Object.keys(this.state.profiles)[0];
        this.save();
        this.render();
      }
    });

    this.els.btnAddLayer.addEventListener('click', () => {
      const profile = this.getCurrentProfile();
      profile.items.push({
        type: 'columns',
        count: 12,
        gutter: 20,
        margin: 20,
        color: '#3b82f6',
        opacity: 0.1,
        visible: true,
        typeMode: 'stretch',
      });
      this.save();
      this.renderLayers();
      this.openEditor(profile.items.length - 1);
    });

    this.els.layersList.addEventListener('click', (e) => {
      const card = e.target.closest('.layer-card');
      const btnVis = e.target.closest('.btn-vis');
      const btnDel = e.target.closest('.btn-del');

      if (!card) return;
      const index = parseInt(card.dataset.index);
      const profile = this.getCurrentProfile();

      if (btnDel) {
        e.stopPropagation();
        profile.items.splice(index, 1);
        this.state.editingIndex = null;
        this.closeEditor();
        this.save();
        this.renderLayers();
        return;
      }

      if (btnVis) {
        e.stopPropagation();
        profile.items[index].visible = !profile.items[index].visible;
        this.save();
        this.renderLayers();
        return;
      }
      this.openEditor(index);
    });

    this.els.btnCloseEditor.addEventListener('click', () => this.closeEditor());

    this.els.segments.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        const profile = this.getCurrentProfile();
        const item = profile.items[this.state.editingIndex];
        item.type = type;

        if (type === 'grid') {
          item.size = 8;
        } else {
          item.count = 12;
          item.gutter = 20;
        }

        this.save();
        this.openEditor(this.state.editingIndex);
        this.renderLayers();
      });
    });

    this.els.editorFields.addEventListener('input', this.handleInput);
  }

  handleInput(e) {
    if (this.state.editingIndex === null) return;
    const target = e.target;
    const field = target.dataset.field;
    const profile = this.getCurrentProfile();
    const item = profile.items[this.state.editingIndex];

    if (target.type === 'number' || target.type === 'range') {
      const val = parseFloat(target.value);
      item[field] = isNaN(val) ? '' : val;
    } else {
      item[field] = target.value;
    }

    this.save();
    this.renderLayers();
  }

  getCurrentProfile() {
    return this.state.profiles[this.state.activeProfileId];
  }

  render() {
    this.els.profileSelect.innerHTML = Object.values(this.state.profiles)
      .map((p) => `<option value="${p.id}" ${p.id === this.state.activeProfileId ? 'selected' : ''}>${p.name}</option>`)
      .join('');
    this.renderLayers();
  }

  renderLayers() {
    const profile = this.getCurrentProfile();
    if (!profile.items.length) {
      this.els.layersList.innerHTML = '<div class="empty-state">No layers yet</div>';
      return;
    }

    this.els.layersList.innerHTML = profile.items
      .map((item, i) => {
        const active = this.state.editingIndex === i ? 'active' : '';
        const opacity = item.visible ? 1 : 0.4;
        let desc =
          item.type === 'grid' ? `${item.size}px Grid` : `${item.count} ${item.type} • ${item.typeMode || 'stretch'}`;

        return `
        <div class="layer-card ${active}" data-index="${i}" style="opacity:${opacity}">
          <div class="color-dot" style="background:${item.color}"></div>
          <div class="layer-info">
            <span class="layer-title">Layer ${i + 1}</span>
            <span class="layer-meta">${desc}</span>
          </div>
          <div class="layer-actions">
            <button class="btn-vis" title="Toggle">${item.visible ? '👁' : '✕'}</button>
            <button class="btn-del" title="Delete">🗑</button>
          </div>
        </div>
      `;
      })
      .join('');
  }

  openEditor(index) {
    this.state.editingIndex = index;
    this.els.editorPanel.classList.add('open');
    this.renderLayers();

    const item = this.getCurrentProfile().items[index];
    this.els.segments.forEach((s) => s.classList.toggle('active', s.dataset.type === item.type));

    const input = (label, field, type = 'number', placeholder = '', step = '1') => `
      <div class="field-group">
        <label>${label}</label>
        <input type="${type}" data-field="${field}" value="${item[field] ?? ''}" placeholder="${placeholder}" step="${step}">
      </div>`;

    let html = '';

    if (item.type === 'grid') {
      html += input('Square Size (px)', 'size');
      html += input('Color', 'color', 'color');
      html += input('Opacity', 'opacity', 'number', '0.1', '0.1');
      html += input('Max Width (px)', 'maxWidth', 'number', 'None');
    } else {
      html += input('Count', 'count');
      html += input('Gutter (px)', 'gutter');

      html += `
        <div class="field-group">
          <label>Mode</label>
          <select class="input-select" data-field="typeMode">
            <option value="stretch" ${item.typeMode === 'stretch' ? 'selected' : ''}>Stretch (Fluid)</option>
            <option value="center" ${item.typeMode === 'center' ? 'selected' : ''}>Center (Fixed)</option>
            <option value="left" ${item.typeMode === 'left' ? 'selected' : ''}>Left / Top</option>
          </select>
        </div>`;

      html += input(
        item.typeMode === 'stretch' ? 'Margin (px)' : 'Offset (px)',
        item.typeMode === 'stretch' ? 'margin' : 'offset'
      );
      if (item.typeMode !== 'stretch') html += input('Item Width/Height', 'width');
      html += input('Max Width (Container)', 'maxWidth', 'number', 'None');
      html += input('Color', 'color', 'color');
      html += input('Opacity', 'opacity', 'number', '0.1', '0.1');
    }

    this.els.editorFields.innerHTML = html;
    this.els.editorFields.querySelectorAll('select').forEach((sel) => {
      sel.addEventListener('change', (e) => this.handleInput(e));
    });
  }

  closeEditor() {
    this.state.editingIndex = null;
    this.els.editorPanel.classList.remove('open');
    this.renderLayers();
  }

  debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
