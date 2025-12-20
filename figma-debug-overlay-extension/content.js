(function () {
  const HOST_ID = 'figma-overlay-host-ultimate';

  class Overlay {
    constructor() {
      this.state = { enabled: false, items: [] };
      this.bindEvents();
      this.loadConfig();
    }

    bindEvents() {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'UPDATE') {
          this.state.items = msg.items;
          this.render();
        } else if (msg.action === 'TOGGLE_LOCAL') {
          this.state.enabled = !this.state.enabled;
          this.render();
        }
      });

      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "'") {
          e.preventDefault();
          chrome.runtime.sendMessage({ action: 'TOGGLE_REQUEST' });
        }
      });
    }

    loadConfig() {
      chrome.storage.sync.get(['store'], (data) => {
        if (data.store && data.store.profiles) {
          const profile = data.store.profiles[data.store.activeProfileId];
          this.state.items = profile ? profile.items : [];
          this.render();
        }
      });
    }

    createHost() {
      let host = document.getElementById(HOST_ID);
      if (host) return host;
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 2147483647;';
      const shadow = host.attachShadow({ mode: 'open' });
      const root = document.createElement('div');
      root.id = 'root';
      root.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column;';
      shadow.appendChild(root);
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

    // --- REBUILT LOGIC: STRICT ADHERENCE TO ORIGINAL SPECS ---
    renderFlexGrid(item) {
      const isRow = item.type === 'rows';
      const mode = item.typeMode || 'stretch';
      const color = this.hexToRgba(item.color, item.opacity);

      // 1. Outer Wrapper (Positioning)
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position: absolute; inset: 0; display: flex; pointer-events: none;';

      if (item.maxWidth > 0) {
        wrapper.style.maxWidth = item.maxWidth + 'px';
        wrapper.style.margin = '0 auto';
        wrapper.style.left = 0;
        wrapper.style.right = 0;
      }

      // 2. Alignment Logic (The "Matrix")
      // COLUMNS: Justify = X axis (Left/Center/Right), Align = Y axis (Stretch)
      // ROWS:    Align = Y axis (Top/Center/Bot), Justify = X axis (Stretch)

      let justify = 'center'; // Default center

      // Map Modes to Flex Properties
      if (mode === 'stretch') {
        justify = 'stretch';
      } else if (mode === 'left' || mode === 'top') {
        // Start
        justify = 'flex-start';
      } else if (mode === 'right' || mode === 'bottom') {
        // End
        justify = 'flex-end';
      }

      // Apply Flex Direction & Alignment
      if (isRow) {
        wrapper.style.flexDirection = 'row'; // Wrapper flows Horizontally, children (Rows) stack Vertically inside grid
        wrapper.style.justifyContent = 'stretch'; // Fill Width
        wrapper.style.alignItems = justify; // Position Top/Bot/Center
      } else {
        wrapper.style.flexDirection = 'row';
        wrapper.style.alignItems = 'stretch'; // Fill Height
        wrapper.style.justifyContent = justify; // Position Left/Right/Center
      }

      // 3. The Grid Container
      const grid = document.createElement('div');
      grid.style.display = 'flex';
      grid.style.flexDirection = isRow ? 'column' : 'row'; // Rows stack V, Cols stack H
      grid.style.gap = (item.gutter || 0) + 'px';

      // 4. Sizing & Offsets (Recreating original logic)
      if (mode === 'stretch') {
        grid.style.width = '100%';
        grid.style.height = '100%';
        const m = (item.margin || 0) + 'px';
        if (isRow) {
          grid.style.paddingTop = m;
          grid.style.paddingBottom = m;
        } else {
          grid.style.paddingLeft = m;
          grid.style.paddingRight = m;
        }
      } else {
        // FIXED MODE: Handle explicit sizes + Offsets
        const offset = (item.offset || 0) + 'px';

        if (isRow) {
          grid.style.width = '100%'; // Rows span full width
          if (mode === 'top') grid.style.marginTop = offset;
          if (mode === 'bottom') grid.style.marginBottom = offset;
        } else {
          grid.style.height = '100%'; // Cols span full height
          if (mode === 'left') grid.style.marginLeft = offset;
          if (mode === 'right') grid.style.marginRight = offset;
        }
      }

      // 5. Generate Cells
      const count = item.count || 12;
      for (let i = 0; i < count; i++) {
        const cell = document.createElement('div');
        cell.style.backgroundColor = color;

        if (mode === 'stretch') {
          cell.style.flex = '1';
        } else {
          // Fixed size cells
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
