// content.js - High Performance Rendering Engine
(function () {
  const HOST_ID = 'overlay-engine-v4';

  class Overlay {
    constructor() {
      this.state = { enabled: false, items: [] };
      chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: false, tabId: 'self' });
      this.init();
    }

    init() {
      chrome.storage.sync.get(['store'], (data) => {
        if (data.store?.profiles) {
          const profile = data.store.profiles[data.store.activeProfileId];
          this.state.items = profile ? profile.items : [];
          this.render();
        }
      });

      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'UPDATE') {
          this.state.items = msg.items;
          this.render();
        } else if (msg.action === 'TOGGLE_LOCAL') {
          this.state.enabled = !this.state.enabled;
          this.render();
          chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: this.state.enabled, tabId: 'self' });
        } else if (msg.action === 'GET_STATUS') {
          sendResponse({ enabled: this.state.enabled });
        }
      });

      document.addEventListener('keydown', (e) => {
        const tag = e.target.tagName.toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
        if (e.altKey && e.key.toLowerCase() === 'g') {
          e.preventDefault();
          chrome.runtime.sendMessage({ action: 'TOGGLE_REQUEST' });
        }
      });
    }

    createHost() {
      let host = document.getElementById(HOST_ID);
      if (host) return host;
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;contain:strict;';
      const shadow = host.attachShadow({ mode: 'open' });
      const root = document.createElement('div');
      root.id = 'root';
      root.style.cssText = 'width:100%;height:100%;position:relative;overflow:hidden;';
      shadow.appendChild(root);
      document.documentElement.appendChild(host);
      return host;
    }

    parseColor(color, alpha) {
      let hex = (color || '#ff0000').replace('#', '');
      if (hex.length === 3)
        hex = hex
          .split('')
          .map((c) => c + c)
          .join('');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    renderPixelGrid(item) {
      const el = document.createElement('div');
      const size = item.size || 8;
      const color = this.parseColor(item.color, item.opacity);
      el.style.cssText = `position:absolute;inset:0;box-sizing:border-box;`;
      el.style.backgroundImage = `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`;
      el.style.backgroundSize = `${size}px ${size}px`;
      if (item.maxWidth > 0) {
        el.style.width = '100%';
        el.style.maxWidth = `${item.maxWidth}px`;
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        el.style.borderLeft = `1px solid ${color}`;
        el.style.borderRight = `1px solid ${color}`;
      }
      return el;
    }

    renderFlexGrid(item) {
      const isRow = item.type === 'rows';
      const mode = item.typeMode || 'stretch';
      const color = this.parseColor(item.color, item.opacity);
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;inset:0;display:flex;box-sizing:border-box;';
      if (item.maxWidth > 0) {
        wrapper.style.width = '100%';
        wrapper.style.maxWidth = `${item.maxWidth}px`;
        wrapper.style.margin = '0 auto';
        wrapper.style.left = '0';
        wrapper.style.right = '0';
      }
      let justify =
        mode === 'stretch'
          ? 'stretch'
          : mode === 'left' || mode === 'top'
            ? 'flex-start'
            : mode === 'right' || mode === 'bottom'
              ? 'flex-end'
              : 'center';
      if (isRow) {
        wrapper.style.alignItems = justify;
        wrapper.style.justifyContent = 'stretch';
      } else {
        wrapper.style.justifyContent = justify;
        wrapper.style.alignItems = 'stretch';
      }
      const grid = document.createElement('div');
      grid.style.display = 'flex';
      grid.style.flexDirection = isRow ? 'column' : 'row';
      grid.style.gap = `${item.gutter || 0}px`;
      grid.style.boxSizing = 'border-box';
      if (mode === 'stretch') {
        grid.style.width = '100%';
        grid.style.height = '100%';
        const m = `${item.margin || 0}px`;
        isRow ? (grid.style.padding = `${m} 0`) : (grid.style.padding = `0 ${m}`);
      } else {
        const off = `${item.offset || 0}px`;
        if (isRow) {
          grid.style.width = '100%';
          if (mode === 'top') grid.style.marginTop = off;
          if (mode === 'bottom') grid.style.marginBottom = off;
        } else {
          grid.style.height = '100%';
          if (mode === 'left') grid.style.marginLeft = off;
          if (mode === 'right') grid.style.marginRight = off;
        }
      }
      for (let i = 0; i < (item.count || 12); i++) {
        const cell = document.createElement('div');
        cell.style.backgroundColor = color;
        if (mode === 'stretch') cell.style.flex = '1';
        else {
          const size = `${item.width || 80}px`;
          isRow ? (cell.style.height = size) : (cell.style.width = size);
          cell.style.flex = '0 0 auto';
        }
        grid.appendChild(cell);
      }
      wrapper.appendChild(grid);
      return wrapper;
    }

    render() {
      if (!this.state.enabled) {
        const host = document.getElementById(HOST_ID);
        if (host) host.remove();
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
