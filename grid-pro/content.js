(function() {
  const HOST_ID = 'grid-pro-v8-engine';
  const DEFAULT_ITEMS = [{ 
    type: 'columns', count: 12, typeMode: 'center', width: 80, 
    gutter: 24, offset: 0, color: '#dc3545', opacity: 0.15, 
    visible: true, maxWidth: 1320 
  }];

  class Overlay {
    constructor() {
      this.state = { enabled: false, items: [] };
      this.host = null;
      this.init();
    }

    init() {
      chrome.storage.local.get(['store'], (data) => {
        this.updateStateFromStorage(data);
        if (this.state.enabled) this.render();
      });

      let resizeTimer;
      window.addEventListener('resize', () => {
        if (!this.state.enabled) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this.updateViewportTag(), 50);
      });

      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'UPDATE') {
          this.state.items = msg.items || DEFAULT_ITEMS;
          if (this.state.enabled) this.render();
        } else if (msg.action === 'TOGGLE_LOCAL') {
          this.state.enabled = !this.state.enabled;
          this.state.enabled ? this.render() : this.removeHost();
          sendResponse({ enabled: this.state.enabled });
          chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: this.state.enabled, tabId: 'self' });
        } else if (msg.action === 'GET_STATUS') {
          sendResponse({ enabled: this.state.enabled });
        }
        return true;
      });
    }

    updateStateFromStorage(data) {
      if (data?.store?.activeProfileId) {
        const activeId = data.store.activeProfileId;
        const profiles = data.store.profiles || {};
        this.state.items = profiles[activeId]?.items || DEFAULT_ITEMS;
      } else {
        this.state.items = DEFAULT_ITEMS;
      }
    }

    removeHost() {
      if (this.host) { this.host.remove(); this.host = null; }
    }

    createHost() {
      if (this.host) return this.host;
      this.host = document.createElement('div');
      this.host.id = HOST_ID;
      this.host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;contain:strict;will-change:transform;';
      const shadow = this.host.attachShadow({ mode: 'open' });
      document.documentElement.appendChild(this.host);
      return this.host;
    }

    parseColor(color, alpha) {
      let hex = (color || '#ff0000').replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    updateViewportTag() {
      const tag = this.host?.shadowRoot.querySelector('.viewport-tag');
      if (tag) tag.textContent = `${window.innerWidth}px`;
    }

    render() {
      const host = this.createHost();
      const shadow = host.shadowRoot;
      const container = document.createElement('div');
      container.className = 'grid-container';
      
      const style = document.createElement('style');
      style.textContent = `
        :host { all: initial; }
        .viewport-tag { 
          position: fixed; top: 12px; right: 12px; background: rgba(9,9,11,0.95); 
          color: #10b981; padding: 6px 12px; font-family: ui-monospace, monospace; 
          font-size: 11px; font-weight: 700; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3); 
          z-index: 9999; backdrop-filter: blur(10px); box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        .grid-container { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .grid-layer { position: absolute; inset: 0; display: grid; width: 100%; height: 100%; margin: 0 auto; box-sizing: border-box; }
      `;

      const tag = document.createElement('div');
      tag.className = 'viewport-tag';
      tag.textContent = `${window.innerWidth}px`;

      this.state.items.forEach(item => {
        if (!item.visible) return;
        const layer = document.createElement('div');
        layer.className = 'grid-layer';
        const color = this.parseColor(item.color, item.opacity);
        const isRow = item.type === 'rows';

        if (item.maxWidth > 0) {
          layer.style.maxWidth = `${item.maxWidth}px`;
          layer.style.left = '50%';
          layer.style.transform = `translateX(-50%)`;
        }

        if (item.type === 'grid') {
          layer.style.backgroundImage = `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)`;
          layer.style.backgroundSize = `${item.size}px ${item.size}px`;
          if (item.offset) layer.style.backgroundPosition = `${item.offset}px ${item.offset}px`;
        } else {
          const mode = item.typeMode || 'stretch';
          if (mode === 'stretch') {
            const m = item.margin || 0;
            layer.style.padding = isRow ? `${m}px 0` : `0 ${m}px`;
            layer.style[isRow ? 'gridTemplateRows' : 'gridTemplateColumns'] = `repeat(${item.count}, 1fr)`;
          } else {
            const align = (mode === 'center') ? 'center' : (mode === 'left' || mode === 'top') ? 'start' : 'end';
            layer.style.justifyContent = isRow ? 'stretch' : align;
            layer.style.alignContent = isRow ? align : 'stretch';
            layer.style[isRow ? 'gridTemplateRows' : 'gridTemplateColumns'] = `repeat(${item.count}, ${isRow ? (item.height || 80) : (item.width || 80)}px)`;
            
            const off = item.offset || 0;
            const currentX = item.maxWidth > 0 ? '-50%' : '0';
            if (isRow) layer.style.transform = `translateY(${off}px)`;
            else layer.style.transform = `translateX(calc(${currentX} + ${off}px))`;
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

      shadow.replaceChildren(style, tag, container);
    }
  }
  new Overlay();
})();