(function () {
  // Prevent multiple injections
  if (window.FIGMA_OVERLAY_INJECTED) return;
  window.FIGMA_OVERLAY_INJECTED = true;

  const HOST_ID = 'figma-overlay-host-shadow-dom';
  const SESSION_KEY = 'FIGMA_OVERLAY_ACTIVE_STATE';

  class Overlay {
    constructor() {
      // Initialize state from SessionStorage (persists on reload)
      const isEnabled = sessionStorage.getItem(SESSION_KEY) === 'true';
      this.state = { enabled: isEnabled, items: [] };

      this.initListeners();
      this.loadGlobalProfile();
    }

    initListeners() {
      // 1. Chrome Runtime Messages
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        switch (msg.action) {
          case 'TOGGLE':
            this.toggleState();
            sendResponse({ enabled: this.state.enabled });
            break;
          case 'UPDATE_PROFILE':
            this.state.items = msg.items || [];
            this.render();
            break;
          case 'GET_STATUS':
            sendResponse({ enabled: this.state.enabled });
            break;
        }
      });

      // 2. Local Developer Shortcut (Ctrl + ' or Cmd + ')
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "'") {
          e.preventDefault();
          e.stopPropagation(); // Prevent conflicts
          this.toggleState();
        }
      });
    }

    loadGlobalProfile() {
      chrome.storage.sync.get(['store'], (data) => {
        if (data.store && data.store.profiles) {
          const profile = data.store.profiles[data.store.activeProfileId];
          this.state.items = profile ? profile.items : [];
          // Initial render based on session state
          if (this.state.enabled) this.render();
        }
      });
    }

    toggleState() {
      this.state.enabled = !this.state.enabled;
      sessionStorage.setItem(SESSION_KEY, this.state.enabled);
      this.render();
    }

    // --- DOM Manipulation ---

    createHost() {
      let host = document.getElementById(HOST_ID);
      if (host) return host;

      host = document.createElement('div');
      host.id = HOST_ID;
      // Max z-index, pass-through clicks
      host.style.cssText = 'position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; display: block;';

      const shadow = host.attachShadow({ mode: 'open' });
      const container = document.createElement('div');
      container.id = 'root';
      container.style.cssText = 'width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden;';

      shadow.appendChild(container);
      document.documentElement.appendChild(host);
      return host;
    }

    removeHost() {
      const host = document.getElementById(HOST_ID);
      if (host) host.remove();
    }

    // --- Helpers ---

    hexToRgba(hex, alpha) {
      if (!hex) return `rgba(0,0,0,${alpha})`;
      let c = hex.replace('#', '');
      if (c.length === 3)
        c = c
          .split('')
          .map((char) => char + char)
          .join('');
      const num = parseInt(c, 16);
      return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    // --- Renderers ---

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
        pointer-events: none;
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

      // Container constraints
      if (item.maxWidth && !isRow) {
        wrapper.style.maxWidth = item.maxWidth + 'px';
        wrapper.style.left = '50%';
        wrapper.style.transform = 'translateX(-50%)';
      } else {
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
      }

      // Justification logic
      let justifyContent = 'center';
      if (mode === 'left') justifyContent = 'flex-start';
      else if (mode === 'stretch') justifyContent = 'space-between'; // Or stretch, handled by flex-grow

      wrapper.style.justifyContent = justifyContent;

      // Inner Grid
      const grid = document.createElement('div');
      grid.style.display = 'flex';
      grid.style.flexDirection = isRow ? 'column' : 'row';
      grid.style.gap = (item.gutter || 0) + 'px';

      // Base sizing
      grid.style.width = '100%';
      grid.style.height = '100%';

      // Margins / Offsets
      const margin = (item.margin || 0) + 'px';
      const offset = (item.offset || 0) + 'px';

      if (mode === 'stretch') {
        if (isRow) {
          grid.style.paddingTop = margin;
          grid.style.paddingBottom = margin;
        } else {
          grid.style.paddingLeft = margin;
          grid.style.paddingRight = margin;
        }
      } else {
        // Fixed width/height modes usually use offset
        if (isRow) grid.style.marginTop = offset;
        else grid.style.marginLeft = offset;
      }

      const color = this.hexToRgba(item.color, item.opacity);
      const count = item.count || 12;

      for (let i = 0; i < count; i++) {
        const cell = document.createElement('div');
        cell.style.backgroundColor = color;

        if (mode === 'stretch') {
          cell.style.flex = '1';
        } else {
          const sizeVal = (item.width || 80) + 'px';
          cell.style.flex = '0 0 auto';
          if (isRow) cell.style.height = sizeVal;
          else cell.style.width = sizeVal;
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

      // Performance: Use requestAnimationFrame for smoother UI blocking
      requestAnimationFrame(() => {
        root.innerHTML = ''; // Clear previous
        this.state.items.forEach((item) => {
          if (!item.visible) return;
          const node = item.type === 'grid' ? this.renderPixelGrid(item) : this.renderFlexGrid(item);
          if (node) root.appendChild(node);
        });
      });
    }
  }

  // Initialize
  new Overlay();
})();
