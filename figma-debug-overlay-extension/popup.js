/**
 * Modern Figma Overlay Controller
 * RESTORED: All original logic (Presets, Locking, Input Constraints)
 */

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
        margin: 0,
        color: '#dc3545',
        opacity: 0.08,
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
        opacity: 0.1,
        visible: true,
      },
    ],
  },
  mobile_ios: {
    name: 'Mobile (390px)',
    locked: true,
    items: [
      {
        type: 'columns',
        count: 4,
        typeMode: 'stretch',
        gutter: 16,
        margin: 20,
        color: '#ff4500',
        opacity: 0.1,
        visible: true,
      },
    ],
  },
  baseline_8: {
    name: '8pt Hard Grid',
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
      btnRenameProfile: document.getElementById('btn-rename-profile'),
      btnDeleteProfile: document.getElementById('btn-delete-profile'),
      btnAddLayer: document.getElementById('btn-add-layer'),
      editorPanel: document.getElementById('editor-panel'),
      editorFields: document.getElementById('editor-fields'),
      btnCloseEditor: document.getElementById('btn-close-editor'),
      segments: document.querySelectorAll('.segment'),
    };

    this.handleInput = this.debounce(this.handleInput.bind(this), 100);
    this.init();
  }

  async init() {
    await this.loadStorage();
    this.setupEvents();
    this.render();
  }

  async loadStorage() {
    const data = await chrome.storage.sync.get(['store']);
    if (data.store && data.store.profiles) {
      // Merge saved profiles, respecting system locks
      this.state.profiles = { ...SYSTEM_PROFILES, ...data.store.profiles };
      Object.keys(SYSTEM_PROFILES).forEach((k) => {
        if (this.state.profiles[k]) this.state.profiles[k].locked = true;
      });
      this.state.activeProfileId = data.store.activeProfileId || 'bootstrap_xxl';
      if (!this.state.profiles[this.state.activeProfileId]) {
        this.state.activeProfileId = Object.keys(this.state.profiles)[0];
      }
    }
  }

  save() {
    chrome.storage.sync.set({
      store: {
        profiles: this.state.profiles,
        activeProfileId: this.state.activeProfileId,
      },
    });
    // Send update to Active Tab only (Per-Tab Isolation)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs
          .sendMessage(tabs[0].id, {
            action: 'UPDATE',
            items: this.getCurrentProfile().items,
          })
          .catch(() => {});
      }
    });
  }

  getCurrentProfile() {
    return this.state.profiles[this.state.activeProfileId];
  }

  setupEvents() {
    this.dom.toggle.addEventListener('change', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE_LOCAL' });
      });
    });

    this.dom.profileSelect.addEventListener('change', (e) => {
      this.state.activeProfileId = e.target.value;
      this.closeEditor();
      this.render();
      this.save();
    });

    this.dom.btnAddProfile.addEventListener('click', () => {
      const name = prompt('New Profile Name:', 'My Layout');
      if (!name) return;
      const id = 'custom_' + Date.now();
      this.state.profiles[id] = {
        name,
        locked: false,
        items: [{ type: 'columns', count: 12, gutter: 20, margin: 20, color: '#10b981', opacity: 0.1, visible: true }],
      };
      this.state.activeProfileId = id;
      this.save();
      this.render();
    });

    this.dom.btnDeleteProfile.addEventListener('click', () => {
      if (this.getCurrentProfile().locked) return alert('System profiles cannot be deleted.');
      if (confirm(`Delete "${this.getCurrentProfile().name}"?`)) {
        delete this.state.profiles[this.state.activeProfileId];
        this.state.activeProfileId = Object.keys(this.state.profiles)[0];
        this.save();
        this.render();
      }
    });

    this.dom.btnRenameProfile.addEventListener('click', () => {
      if (this.getCurrentProfile().locked) return alert('System profiles cannot be renamed.');
      const newName = prompt('Rename to:', this.getCurrentProfile().name);
      if (newName) {
        this.getCurrentProfile().name = newName;
        this.save();
        this.render();
      }
    });

    this.dom.btnAddLayer.addEventListener('click', () => {
      this.getCurrentProfile().items.push({
        type: 'columns',
        count: 12,
        gutter: 20,
        margin: 20,
        color: '#3b82f6',
        opacity: 0.1,
        visible: true,
      });
      this.save();
      this.renderLayers();
      this.openEditor(this.getCurrentProfile().items.length - 1);
    });

    this.dom.layersList.addEventListener('click', (e) => {
      const card = e.target.closest('.layer-card');
      const btnVis = e.target.closest('.btn-vis');
      const btnDel = e.target.closest('.btn-del');
      if (!card) return;

      const idx = parseInt(card.dataset.idx);
      const p = this.getCurrentProfile();

      if (btnDel) {
        e.stopPropagation();
        p.items.splice(idx, 1);
        this.closeEditor();
        this.save();
        this.renderLayers();
      } else if (btnVis) {
        e.stopPropagation();
        p.items[idx].visible = !p.items[idx].visible;
        this.save();
        this.renderLayers();
      } else {
        this.openEditor(idx);
      }
    });

    this.dom.btnCloseEditor.addEventListener('click', () => this.closeEditor());
    this.dom.segments.forEach((s) => s.addEventListener('click', (e) => this.switchType(e.target.dataset.type)));
    this.dom.editorFields.addEventListener('input', this.handleInput);
  }

  render() {
    this.dom.profileSelect.innerHTML = Object.entries(this.state.profiles)
      .map(([id, p]) => {
        return `<option value="${id}" ${id === this.state.activeProfileId ? 'selected' : ''}>${p.name} ${p.locked ? '🔒' : ''}</option>`;
      })
      .join('');

    const isLocked = this.getCurrentProfile().locked;
    this.dom.btnDeleteProfile.disabled = isLocked;
    this.dom.btnRenameProfile.disabled = isLocked;
    this.dom.btnDeleteProfile.style.opacity = isLocked ? '0.3' : '1';
    this.dom.btnRenameProfile.style.opacity = isLocked ? '0.3' : '1';

    this.renderLayers();
  }

  renderLayers() {
    const p = this.getCurrentProfile();
    if (!p.items.length) {
      this.dom.layersList.innerHTML = '<div class="empty-state">No layers yet.</div>';
      return;
    }
    this.dom.layersList.innerHTML = p.items
      .map((item, i) => {
        const isActive = this.state.editingIndex === i ? 'active' : '';
        const opacity = item.visible ? 1 : 0.4;
        const typeLabel = item.type === 'grid' ? `${item.size}px Grid` : `${item.count} ${item.type}`;
        const modeLabel = item.type === 'grid' ? 'Pixel' : item.typeMode || 'stretch';
        return `
        <div class="layer-card ${isActive}" data-idx="${i}" style="opacity:${opacity}">
          <div class="color-indicator" style="background:${item.color}"></div>
          <div class="layer-info">
            <div class="layer-title">Layer ${i + 1}</div>
            <div class="layer-meta">${typeLabel} • ${modeLabel}</div>
          </div>
          <div class="layer-controls">
            <button class="btn-vis">${item.visible ? '👁' : '✕'}</button>
            <button class="btn-del">🗑</button>
          </div>
        </div>
      `;
      })
      .join('');
  }

  // --- LOGIC EDITOR YANG DIKEMBALIKAN SEMPURNA ---
  openEditor(idx) {
    this.state.editingIndex = idx;
    this.dom.editorPanel.classList.add('open');
    this.renderLayers();

    const item = this.getCurrentProfile().items[idx];
    this.dom.segments.forEach((s) => s.classList.toggle('active', s.dataset.type === item.type));

    const field = (label, key, type = 'number', ph = '', step = 1) => `
      <div class="field">
        <label>${label}</label>
        <input type="${type}" data-key="${key}" value="${item[key] ?? ''}" placeholder="${ph}" step="${step}">
      </div>`;

    let html = '';

    if (item.type === 'grid') {
      html += field('Square Size (px)', 'size');
      html += field('Color', 'color', 'color');
      html += field('Opacity (0-1)', 'opacity', 'number', '0.1', 0.1);
      html += field('Max Width (px)', 'maxWidth', 'number', 'None');
    } else {
      // Logic: Columns vs Rows Labeling
      const isRow = item.type === 'rows';
      const isStretch = item.typeMode === 'stretch';

      html += field('Count', 'count');
      html += field('Gutter (px)', 'gutter');

      // Dropdown Options spesifik (Left/Top vs Right/Bottom)
      const optStart = isRow ? 'Top' : 'Left';
      const optEnd = isRow ? 'Bottom' : 'Right';

      html += `
      <div class="field">
        <label>Mode</label>
        <select data-key="typeMode">
          <option value="stretch" ${item.typeMode === 'stretch' ? 'selected' : ''}>Stretch</option>
          <option value="center" ${item.typeMode === 'center' ? 'selected' : ''}>Center</option>
          <option value="left" ${item.typeMode === 'left' ? 'selected' : ''}>${optStart}</option>
          <option value="right" ${item.typeMode === 'right' ? 'selected' : ''}>${optEnd}</option>
        </select>
      </div>`;

      // Dynamic Fields: Show Margin IF Stretch, Show Offset IF Fixed
      if (isStretch) {
        html += field('Margin (px)', 'margin');
      } else {
        html += field('Offset (px)', 'offset');
        // Fixed Mode butuh ukuran per item
        const sizeLabel = isRow ? 'Height (px)' : 'Width (px)';
        html += field(sizeLabel, 'width');
      }

      html += field('Max Width (Container)', 'maxWidth', 'number', 'None');
      html += field('Color', 'color', 'color');
      html += field('Opacity', 'opacity', 'number', '0.1', 0.1);
    }

    this.dom.editorFields.innerHTML = html;
    this.dom.editorFields.querySelectorAll('select').forEach((el) => el.addEventListener('change', this.handleInput));
  }

  closeEditor() {
    this.state.editingIndex = null;
    this.dom.editorPanel.classList.remove('open');
    this.renderLayers();
  }

  switchType(type) {
    const item = this.getCurrentProfile().items[this.state.editingIndex];
    item.type = type;
    if (type === 'grid') {
      item.size = 8;
    } else {
      item.count = 12;
      item.gutter = 20;
      item.typeMode = 'stretch';
    }
    this.save();
    this.openEditor(this.state.editingIndex);
  }

  handleInput(e) {
    if (this.state.editingIndex === null) return;
    const target = e.target;
    const key = target.dataset.key;
    const item = this.getCurrentProfile().items[this.state.editingIndex];

    if (target.type === 'number') {
      const val = parseFloat(target.value);
      item[key] = isNaN(val) ? '' : val;
    } else {
      item[key] = target.value;
      // Re-render form if mode changes (to show/hide fields)
      if (key === 'typeMode') {
        this.save();
        this.openEditor(this.state.editingIndex);
        return;
      }
    }
    this.save();
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
