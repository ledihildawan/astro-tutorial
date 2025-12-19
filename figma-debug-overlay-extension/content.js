(function () {
  const HOST_ID = 'figma-overlay-host-v2';
  const SESSION_KEY = 'FIGMA_OVERLAY_ENABLED'; // Key untuk sessionStorage

  class Overlay {
    constructor() {
      // 1. Cek sessionStorage saat inisialisasi (agar persist saat refresh)
      const isEnabled = sessionStorage.getItem(SESSION_KEY) === 'true';

      this.state = { enabled: isEnabled, items: [] };

      // 2. Listener Pesan
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'TOGGLE') {
          // Toggle state lokal
          this.state.enabled = !this.state.enabled;
          // Simpan ke session agar persist saat refresh
          sessionStorage.setItem(SESSION_KEY, this.state.enabled);
          this.render();
          // Kirim respons balik jika perlu (misal ke popup)
          sendResponse({ enabled: this.state.enabled });
        } else if (msg.action === 'UPDATE_PROFILE') {
          // Update data layout tanpa mengubah status enabled
          this.state.items = msg.items;
          this.render();
        } else if (msg.action === 'GET_STATUS') {
          // Popup meminta status saat dibuka
          sendResponse({ enabled: this.state.enabled });
        }
      });

      // 3. Load Profil Global (Layout tetap global, Status enabled lokal)
      chrome.storage.sync.get(['store'], (data) => {
        if (data.store) {
          const profile = data.store.profiles[data.store.activeProfileId];
          this.state.items = profile ? profile.items : [];
          this.render(); // Render ulang berdasarkan status session awal
        }
      });

      // 4. Shortcut Manual (Ctrl + ')
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "'") {
          e.preventDefault();
          // Langsung toggle internal tanpa perlu ke background
          this.toggleLocal();
        }
      });
    }

    // Helper untuk toggle internal
    toggleLocal() {
      this.state.enabled = !this.state.enabled;
      sessionStorage.setItem(SESSION_KEY, this.state.enabled);
      this.render();
      // Opsional: Beritahu popup jika sedang terbuka (biasanya tidak perlu)
    }

    createHost() {
      let host = document.getElementById(HOST_ID);
      if (host) return host;

      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;';

      const shadow = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.id = 'root';
      container.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column;';

      shadow.appendChild(container);
      document.documentElement.appendChild(host);
      return host;
    }

    removeHost() {
      const host = document.getElementById(HOST_ID);
      if (host) host.remove();
    }

    hexToRgba(hex, alpha) {
      if (!hex) return `rgba(255,0,0,${alpha})`;
      let c = hex.substring(1).split('');
      if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
      c = '0x' + c.join('');
      return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }

    renderPixelGrid(item) {
      const el = document.createElement('div');
      const size = item.size || 8;
      const color = this.hexToRgba(item.color, item.opacity);

      el.style.cssText = `
        position: absolute; inset: 0;
        background-image: 
          linear-gradient(to right, ${color} 1px, transparent 1px),
          linear-gradient(to bottom, ${color} 1px, transparent 1px);
        background-size: ${size}px ${size}px;
        background-position: top center;
      `;

      if (item.maxWidth) {
        el.style.maxWidth = item.maxWidth + 'px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.borderLeft = `1px solid ${color}`;
        el.style.borderRight = `1px solid ${color}`;
      }
      return el;
    }

    renderFlexGrid(item) {
      const isRow = item.type === 'rows';
      const wrapper = document.createElement('div');
      const mode = item.typeMode || 'stretch';

      wrapper.style.cssText = 'position: absolute; inset: 0; display: flex; pointer-events: none;';
      if (item.maxWidth) {
        wrapper.style.maxWidth = item.maxWidth + 'px';
        wrapper.style.margin = '0 auto';
        wrapper.style.left = 0;
        wrapper.style.right = 0;
      }

      let justifyContent = 'center';
      if (mode === 'stretch') justifyContent = 'stretch';
      else if (mode === 'left') justifyContent = 'flex-start';

      wrapper.style.justifyContent = justifyContent;

      const grid = document.createElement('div');
      grid.style.display = 'flex';
      grid.style.flexDirection = isRow ? 'column' : 'row';
      grid.style.gap = (item.gutter || 0) + 'px';

      if (mode === 'stretch') {
        grid.style.width = '100%';
        grid.style.height = '100%';
        grid.style[isRow ? 'paddingTop' : 'paddingLeft'] = (item.margin || 0) + 'px';
        grid.style[isRow ? 'paddingBottom' : 'paddingRight'] = (item.margin || 0) + 'px';
      } else {
        if (isRow) {
          grid.style.width = '100%';
          grid.style.marginTop = (item.offset || 0) + 'px';
        } else {
          grid.style.height = '100%';
          grid.style.marginLeft = (item.offset || 0) + 'px';
        }
      }

      const color = this.hexToRgba(item.color, item.opacity);
      const count = item.count || 12;

      for (let i = 0; i < count; i++) {
        const cell = document.createElement('div');
        cell.style.backgroundColor = color;
        if (mode === 'stretch') {
          cell.style.flex = '1';
        } else {
          const size = (item.width || 80) + 'px';
          cell.style.flex = '0 0 auto';
          if (isRow) cell.style.height = size;
          else cell.style.width = size;
        }
        grid.appendChild(cell);
      }
      wrapper.appendChild(grid);
      return wrapper;
    }

    render() {
      if (!this.state.enabled) {
        this.removeHost();
        return;
      }
      const host = this.createHost();
      const root = host.shadowRoot.getElementById('root');
      root.innerHTML = '';

      this.state.items.forEach((item) => {
        if (!item.visible) return;
        const node = item.type === 'grid' ? this.renderPixelGrid(item) : this.renderFlexGrid(item);
        if (node) root.appendChild(node);
      });
    }
  }
  new Overlay();
})();
