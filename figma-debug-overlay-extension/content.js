(function() {
  const HOST_ID = 'grid-pro-v8-engine';
  class Overlay {
    constructor() {
      this.state = { enabled: false, items: [] };
      this.init();
    }
    init() {
      chrome.storage.local.get(['store'], (data) => {
        if (data.store?.profiles) {
          const profile = data.store.profiles[data.store.activeProfileId];
          this.state.items = profile ? profile.items : [];
          this.render();
        }
      });
      const resizeObserver = new ResizeObserver(() => {
        if (this.state.enabled) this.render();
      });
      resizeObserver.observe(document.documentElement);
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'UPDATE') { this.state.items = msg.items; this.render(); }
        else if (msg.action === 'TOGGLE_LOCAL') {
          this.state.enabled = !this.state.enabled;
          this.render();
          chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: this.state.enabled, tabId: 'self' });
        } else if (msg.action === 'GET_STATUS') { sendResponse({ enabled: this.state.enabled }); }
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
      if (!this.state.enabled) { document.getElementById(HOST_ID)?.remove(); return; }
      const host = this.createHost();
      const shadow = host.shadowRoot;
      const root = shadow.getElementById('root');
      root.innerHTML = '';
      const vp = document.createElement('div');
      vp.style.cssText = `position:absolute;top:12px;right:12px;background:rgba(9,9,11,0.9);color:#10b981;padding:4px 10px;font-family:monospace;font-size:11px;font-weight:700;border-radius:6px;border:1px solid rgba(16,185,129,0.3);z-index:9999;backdrop-filter:blur(8px);`;
      vp.innerText = `${window.innerWidth}px`;
      root.appendChild(vp);
      this.state.items.forEach(item => {
        if (!item.visible) return;
        const layer = document.createElement('div');
        layer.style.cssText = `position:absolute;inset:0;display:grid;width:100%;height:100%;margin:0 auto;box-sizing:border-box;`;
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
            cell.style.position = 'relative';
            if (i === 0 && item.opacity > 0.05) {
              const label = document.createElement('div');
              label.style.cssText = `position:absolute;top:4px;left:4px;font-size:9px;color:#fff;background:rgba(0,0,0,0.6);padding:2px 4px;border-radius:3px;font-family:monospace;pointer-events:none;`;
              requestAnimationFrame(() => {
                const rect = cell.getBoundingClientRect();
                label.innerText = `${Math.round(isRow ? rect.height : rect.width)}px`;
              });
              cell.appendChild(label);
            }
            layer.appendChild(cell);
          }
        }
        root.appendChild(layer);
      });
    }
  }
  new Overlay();
})();