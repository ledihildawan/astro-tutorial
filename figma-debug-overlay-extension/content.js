(function() {
  const HOST_ID = 'grid-pro-v8-engine';

  class Overlay {
    constructor() {
      this.state = { enabled: false, items: [] };
      this.init();
    }

    init() {
      // Load initial state
      chrome.storage.local.get(['store'], (data) => {
        if (data.store?.profiles) {
          const profile = data.store.profiles[data.store.activeProfileId];
          this.state.items = profile ? profile.items : [];
          this.render();
        }
      });

      // Track Resize (for Viewport Tag accuracy)
      window.addEventListener('resize', () => {
        if (this.state.enabled) this.render();
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
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    render() {
      if (!this.state.enabled) {
        document.getElementById(HOST_ID)?.remove();
        return;
      }
      const host = this.createHost();
      const shadow = host.shadowRoot;

      // Clean render with window.innerWidth for CSS Media Query parity
      shadow.innerHTML = `
        <style>
          :host { all: initial; }
          .viewport-tag { 
            position: fixed; top: 12px; right: 12px; background: rgba(9,9,11,0.92); 
            color: #10b981; padding: 6px 12px; font-family: ui-monospace, SFMono-Regular, monospace; 
            font-size: 11px; font-weight: 700; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3); 
            z-index: 9999; backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          }
          .grid-container { position: absolute; inset: 0; overflow: hidden; }
          .grid-layer { 
            position: absolute; inset: 0; display: grid; width: 100%; height: 100%; 
            margin: 0 auto; box-sizing: border-box; 
          }
        </style>
        <div class="viewport-tag">${window.innerWidth}px</div>
        <div class="grid-container"></div>
      `;
      
      const container = shadow.querySelector('.grid-container');
      this.state.items.forEach(item => {
        if (!item.visible) return;
        const layer = document.createElement('div');
        layer.className = 'grid-layer';
        const color = this.parseColor(item.color, item.opacity);

        if (item.type === 'grid') {
          layer.style.backgroundImage = `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`;
          layer.style.backgroundSize = `${item.size}px ${item.size}px`;
        } else {
          const isRow = item.type === 'rows';
          const mode = item.typeMode || 'stretch';
          if (item.maxWidth > 0) layer.style.maxWidth = `${item.maxWidth}px`;

          if (mode === 'stretch') {
            const m = item.margin || 0;
            layer.style.padding = isRow ? `${m}px 0` : `0 ${m}px`;
            layer.style[isRow ? 'gridTemplateRows' : 'gridTemplateColumns'] = `repeat(${item.count}, 1fr)`;
          } else {
            const justify = (mode === 'left' || mode === 'top') ? 'start' : (mode === 'right' || mode === 'bottom') ? 'end' : 'center';
            layer.style.justifyContent = isRow ? 'stretch' : justify;
            layer.style.alignContent = isRow ? justify : 'stretch';
            layer.style[isRow ? 'gridTemplateRows' : 'gridTemplateColumns'] = `repeat(${item.count}, ${item.width}px)`;
          }
          layer.style.gap = `${item.gutter}px`;

          for (let i = 0; i < item.count; i++) {
            const cell = document.createElement('div');
            cell.style.backgroundColor = color;
            layer.appendChild(cell);
          }
        }
        container.appendChild(layer);
      });
    }
  }
  new Overlay();
})();