// --- MODERN FRAMEWORK DEFAULTS (2025 Standards) ---
const DEFAULT_PROFILES = {
  desktop_xl: {
    id: 'desktop_xl',
    name: '🖥️ Desktop XL (Tailwind)',
    items: [
      {
        type: 'columns',
        count: 12,
        gutter: 24, // gap-6 (Standar Tailwind)
        margin: 0,
        width: 0,
        color: '#06b6d4', // Cyan-500 (Tailwind Brand Identity)
        opacity: 0.1,
        visible: true,
        typeMode: 'center', // Fixed Container
        maxWidth: 1280, // max-w-7xl (Resolusi paling aman untuk Laptop modern)
      },
    ],
  },
  laptop: {
    id: 'laptop',
    name: '💻 Laptop (1440px)',
    items: [
      {
        type: 'columns',
        count: 12,
        gutter: 20, // Sedikit lebih rapat
        margin: 48, // Margin kiri-kanan besar agar nafas
        width: 0,
        color: '#8b5cf6', // Violet-500
        opacity: 0.1,
        visible: true,
        typeMode: 'stretch', // Fluid tapi dengan margin besar
        maxWidth: null,
      },
    ],
  },
  tablet: {
    id: 'tablet',
    name: '📱 Tablet (iPad Mini/Pro)',
    items: [
      {
        type: 'columns',
        count: 8, // Standar Tablet Portrait
        gutter: 24,
        margin: 32, // Safe area untuk jempol
        width: 0,
        color: '#f59e0b', // Amber-500
        opacity: 0.1,
        visible: true,
        typeMode: 'stretch',
        maxWidth: null,
      },
    ],
  },
  mobile: {
    id: 'mobile',
    name: '📱 Mobile (iPhone 15/16)',
    items: [
      {
        type: 'columns',
        count: 4, // Jangan pernah pakai 12 col di mobile, terlalu berisik
        gutter: 16, // gap-4 (4 x 4px)
        margin: 20, // Modern safe area (sedikit lebih lebar dari 16px lama)
        width: 0,
        color: '#ec4899', // Pink-500
        opacity: 0.1,
        visible: true,
        typeMode: 'stretch',
        maxWidth: null,
      },
    ],
  },
  pixel_check: {
    id: 'pixel_check',
    name: '📐 8-Point Grid (Precision)',
    items: [
      {
        type: 'grid', // Mode Kotak-kotak
        size: 8, // Holy Grail of UI Design
        color: '#ef4444', // Merah tajam untuk checking
        opacity: 0.15,
        visible: true,
        maxWidth: null,
      },
    ],
  },
};

class App {
  constructor() {
    this.state = {
      activeProfileId: 'tailwind', // Default ke modern web standard
      profiles: JSON.parse(JSON.stringify(DEFAULT_PROFILES)),
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

    // Debounce saving to storage to prevent API limits
    this.saveToStorage = this.debounce(this._saveToStorage.bind(this), 400);

    this.init();
  }

  async init() {
    await this.loadFromStorage();
    await this.syncToggleWithTab();
    this.setupListeners();
    this.render();
  }

  async loadFromStorage() {
    const data = await chrome.storage.sync.get(['store']);
    if (data.store) {
      const { profiles, activeProfileId } = data.store;

      // Merge saved profiles, but if empty use defaults
      if (profiles && Object.keys(profiles).length > 0) {
        this.state.profiles = profiles;
      }

      if (activeProfileId && this.state.profiles[activeProfileId]) {
        this.state.activeProfileId = activeProfileId;
      }
    }
  }

  syncToggleWithTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab && tab.id && !tab.url.startsWith('chrome://')) {
          chrome.tabs.sendMessage(tab.id, { action: 'GET_STATUS' }, (res) => {
            if (chrome.runtime.lastError) {
              this.els.toggle.checked = false;
            } else if (res) {
              this.els.toggle.checked = !!res.enabled;
            }
            resolve();
          });
        } else {
          this.els.toggle.disabled = true;
          resolve();
        }
      });
    });
  }

  // Called when data changes
  broadcastUpdate() {
    const profile = this.getCurrentProfile();
    const payload = {
      action: 'UPDATE_PROFILE',
      items: profile ? profile.items : [],
    };
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id && !tabs[0].url.startsWith('chrome://')) {
        chrome.tabs.sendMessage(tabs[0].id, payload).catch(() => {});
      }
    });
  }

  // Internal Save logic
  _saveToStorage() {
    chrome.storage.sync.set({
      store: {
        activeProfileId: this.state.activeProfileId,
        profiles: this.state.profiles,
      },
    });
    this.broadcastUpdate();
  }

  setupListeners() {
    // 1. Toggle Switch
    this.els.toggle.addEventListener('change', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE' }).catch(() => {
            alert('Cannot inject overlay on this page. Try refreshing.');
            this.els.toggle.checked = !this.els.toggle.checked;
          });
        }
      });
    });

    // 2. Profile Selection
    this.els.profileSelect.addEventListener('change', (e) => {
      this.state.activeProfileId = e.target.value;
      this.closeEditor();
      this.render();
      this.saveToStorage();
    });

    // 3. Add Profile
    this.els.btnAddProfile.addEventListener('click', () => {
      const name = prompt('New Profile Name:', 'Custom Layout');
      if (!name) return;
      const id = 'p_' + Date.now();
      // Default template for new profile (Generic Desktop)
      this.state.profiles[id] = {
        id,
        name,
        items: [
          {
            type: 'columns',
            count: 12,
            gutter: 20,
            width: 60,
            color: '#94a3b8',
            opacity: 0.1,
            visible: true,
            typeMode: 'center',
            maxWidth: 1140,
          },
        ],
      };
      this.state.activeProfileId = id;
      this.render();
      this.saveToStorage();
    });

    // 4. Delete Profile
    this.els.btnDelProfile.addEventListener('click', () => {
      const ids = Object.keys(this.state.profiles);
      if (ids.length <= 1) return alert('Cannot delete the last profile.');
      if (confirm('Delete current profile?')) {
        delete this.state.profiles[this.state.activeProfileId];
        this.state.activeProfileId = Object.keys(this.state.profiles)[0];
        this.closeEditor();
        this.render();
        this.saveToStorage();
      }
    });

    // 5. Add Layer
    this.els.btnAddLayer.addEventListener('click', () => {
      const profile = this.getCurrentProfile();
      profile.items.push({
        type: 'columns',
        count: 12,
        gutter: 24,
        margin: 0,
        color: '#6366f1',
        opacity: 0.1,
        visible: true,
        typeMode: 'stretch',
      });
      this.renderLayers();
      this.openEditor(profile.items.length - 1);
      this.saveToStorage();
    });

    // 6. Layer Interactions (Click/Delete/Vis)
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
        this.closeEditor();
        this.renderLayers();
        this.saveToStorage();
        return;
      }

      if (btnVis) {
        e.stopPropagation();
        profile.items[index].visible = !profile.items[index].visible;
        this.renderLayers();
        this.saveToStorage();
        return;
      }

      this.openEditor(index);
    });

    // 7. Editor Controls
    this.els.btnCloseEditor.addEventListener('click', () => this.closeEditor());

    this.els.segments.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.state.editingIndex === null) return;
        const type = btn.dataset.type;
        const profile = this.getCurrentProfile();
        const item = profile.items[this.state.editingIndex];

        item.type = type;
        // Smart Defaults
        if (type === 'grid') {
          item.size = 8;
        } else {
          item.count = item.count || 12;
          item.gutter = item.gutter || 24;
        }

        this.openEditor(this.state.editingIndex); // Re-render editor
        this.renderLayers();
        this.saveToStorage();
      });
    });

    // 8. Live Input Handling
    this.els.editorFields.addEventListener('input', (e) => {
      if (this.state.editingIndex === null) return;
      const target = e.target;
      const field = target.dataset.field;
      const profile = this.getCurrentProfile();
      const item = profile.items[this.state.editingIndex];

      if (target.type === 'number' || target.type === 'range') {
        const val = parseFloat(target.value);
        item[field] = isNaN(val) ? 0 : val;
      } else {
        item[field] = target.value;
      }

      this.renderLayers(); // Update list preview
      this.saveToStorage(); // Save and broadcast
    });
  }

  getCurrentProfile() {
    return this.state.profiles[this.state.activeProfileId];
  }

  render() {
    // Render dropdown
    this.els.profileSelect.innerHTML = Object.values(this.state.profiles)
      .map((p) => `<option value="${p.id}" ${p.id === this.state.activeProfileId ? 'selected' : ''}>${p.name}</option>`)
      .join('');
    this.renderLayers();
  }

  renderLayers() {
    const profile = this.getCurrentProfile();
    if (!profile || !profile.items.length) {
      this.els.layersList.innerHTML = '<div class="empty-state">No layers added</div>';
      return;
    }

    this.els.layersList.innerHTML = profile.items
      .map((item, i) => {
        const active = this.state.editingIndex === i ? 'active' : '';
        const opacity = item.visible ? 1 : 0.4;
        let desc =
          item.type === 'grid'
            ? `${item.size}px Pixel Grid`
            : `${item.count} ${item.type} • ${item.typeMode || 'stretch'}`;

        return `
        <div class="layer-card ${active}" data-index="${i}" style="opacity:${opacity}">
          <div class="color-dot" style="background:${item.color}"></div>
          <div class="layer-info">
            <span class="layer-title">Layer ${i + 1}</span>
            <span class="layer-meta">${desc}</span>
          </div>
          <div class="layer-actions">
            <button class="btn-vis" title="Toggle Visibility">${item.visible ? '👁️' : '🚫'}</button>
            <button class="btn-del" title="Delete Layer">🗑️</button>
          </div>
        </div>
      `;
      })
      .join('');
  }

  openEditor(index) {
    this.state.editingIndex = index;
    this.els.editorPanel.classList.add('open');
    this.renderLayers(); // Highlight active card

    const item = this.getCurrentProfile().items[index];
    this.els.segments.forEach((s) => s.classList.toggle('active', s.dataset.type === item.type));

    const input = (label, field, type = 'number', placeholder = '', step = '1') => `
      <div class="field-group">
        <label>${label}</label>
        <input class="input-theme" type="${type}" data-field="${field}" value="${item[field] ?? ''}" placeholder="${placeholder}" step="${step}">
      </div>`;

    let html = '';

    if (item.type === 'grid') {
      html += input('Square Size (px)', 'size');
      html += input('Color', 'color', 'color');
      html += input('Opacity', 'opacity', 'number', '0.1', '0.1');
      html += input('Max Width (px)', 'maxWidth', 'number', 'None');
    } else {
      html += input('Column/Row Count', 'count');
      html += input('Gutter (px)', 'gutter');

      html += `
        <div class="field-group">
          <label>Alignment Mode</label>
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

      if (item.typeMode !== 'stretch') {
        html += input(`${item.type === 'columns' ? 'Col Width' : 'Row Height'} (px)`, 'width');
      }

      html += input('Max Width (Container)', 'maxWidth', 'number', 'None');
      html += input('Color', 'color', 'color');
      html += input('Opacity (0-1)', 'opacity', 'number', '0.1', '0.1');
    }

    this.els.editorFields.innerHTML = html;

    this.els.editorFields.querySelectorAll('select').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        this.els.editorFields.dispatchEvent(new Event('input', { bubbles: true }));
      });
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
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}

document.addEventListener('DOMContentLoaded', () => new App());
