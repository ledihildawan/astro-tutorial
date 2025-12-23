(function() {
  const HOST_ID = 'grid-pro-v9-engine';
  // FIX: Disamakan dengan 'desktop_fluid' di popup.js agar konsisten
  const DEFAULT_ITEMS = [{ type: 'columns', count: 12, typeMode: 'stretch', gutter: 24, margin: 48, maxWidth: 1440, color: '#3b82f6', opacity: 0.15, visible: true }];

  class Overlay {
    constructor() { 
      this.state = { enabled: false, items: [] }; 
      this.host = null; this.rafId = null; this._resizeHandler = null; 
      this.init(); 
    }

    init() {
      try { const s = sessionStorage.getItem('gridProEnabled'); this.state.enabled = s ? JSON.parse(s) : false; } catch(e) { this.state.enabled = false; }

      chrome.storage.local.get(['store'], (data) => {
        this.updateStateFromStorage(data);
        if (this.state.enabled) { this.render(); this.toggleListener(true); }
      });

      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.store) {
            this.updateStateFromStorage({ store: changes.store.newValue });
            if (this.state.enabled) this.render();
        }
      });

      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'TOGGLE_LOCAL') {
          this.state.enabled = !this.state.enabled;
          sessionStorage.setItem('gridProEnabled', JSON.stringify(this.state.enabled));
          if (this.state.enabled) { this.render(); this.toggleListener(true); } else { this.removeHost(); this.toggleListener(false); }
          sendResponse({ enabled: this.state.enabled });
          chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: this.state.enabled, tabId: 'self' }).catch(() => {});
        } else if (msg.action === 'GET_STATUS') { sendResponse({ enabled: this.state.enabled }); }
        return true;
      });
    }

    toggleListener(shouldListen) {
        if (shouldListen) {
            if (!this._resizeHandler) { this._resizeHandler = () => { if (this.rafId) cancelAnimationFrame(this.rafId); this.rafId = requestAnimationFrame(() => this.updateTagTextOnly()); }; }
            window.addEventListener('resize', this._resizeHandler);
        } else {
            if (this._resizeHandler) { window.removeEventListener('resize', this._resizeHandler); this._resizeHandler = null; }
        }
    }

    updateStateFromStorage(data) {
      if (data?.store?.activeRenderItems && Array.isArray(data.store.activeRenderItems)) { this.state.items = data.store.activeRenderItems; } 
      else { this.state.items = DEFAULT_ITEMS; }
    }

    hexToRgba(hex, alpha) {
        if (!hex || typeof hex !== 'string') return `rgba(59, 130, 246, ${alpha})`;
        let c = hex.trim().replace('#', '');
        if (!/^[0-9A-Fa-f]{3,6}$/.test(c)) return `rgba(59, 130, 246, ${alpha})`;
        if (c.length === 3) c = c.split('').map(char => char + char).join('');
        const num = parseInt(c, 16);
        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    removeHost() { if (this.host) { this.host.remove(); this.host = null; } }

    createHost() {
      if (this.host && this.host.shadowRoot) return this.host;
      const existing = document.getElementById(HOST_ID);
      if (existing) existing.remove();
      this.host = document.createElement('div'); this.host.id = HOST_ID;
      this.host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;contain:strict;display:block;isolation:isolate;';
      this.host.attachShadow({ mode: 'open' });
      document.documentElement.appendChild(this.host);
      return this.host;
    }
    
    updateTagTextOnly() {
        if(this.host && this.host.shadowRoot) { const tag = this.host.shadowRoot.querySelector('.viewport-tag'); if(tag) tag.textContent = `${document.documentElement.clientWidth}px`; }
    }

    render() {
      const host = this.createHost(); const shadow = host.shadowRoot; const viewportWidth = document.documentElement.clientWidth;
      shadow.innerHTML = '';
      const container = document.createElement('div'); container.className = 'grid-container';
      const style = document.createElement('style');
      style.textContent = `* { box-sizing: border-box; } .grid-container { position: absolute; inset: 0; display: flex; justify-content: center; overflow: hidden; pointer-events: none; } .viewport-tag { position: fixed; top: 12px; right: 24px; background: rgba(9,9,11,0.9); color: #10b981; padding: 4px 8px; font-family: -apple-system, sans-serif; font-size: 11px; line-height: 1; font-weight: 500; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3); z-index: 9999; pointer-events: none; user-select: none; box-shadow: 0 2px 5px rgba(0,0,0,0.2); } .grid-layer { position: absolute; height: 100%; width: 100%; pointer-events: none; } @media print { :host { display: none !important; } }`;
      const tag = document.createElement('div'); tag.className = 'viewport-tag'; tag.textContent = `${viewportWidth}px`;

      this.state.items.forEach(item => {
        if (!item.visible) return;
        const count = Number(item.count)||12, opacity = Number(item.opacity)||0.15, gutter = Number(item.gutter)||0, width = Number(item.width)||80, height = Number(item.height)||80, margin = Number(item.margin)||0, maxWidth = Number(item.maxWidth)||0, size = Number(item.size)||20;
        const colorVal = this.hexToRgba(item.color, opacity);
        const layer = document.createElement('div'); layer.className = 'grid-layer';
        
        if (maxWidth > 0) { layer.style.width = `min(100%, ${maxWidth}px)`; layer.style.left = '50%'; layer.style.transform = 'translateX(-50%)'; }
        const isRow = item.type === 'rows';

        if (item.type === 'grid') {
            layer.style.backgroundImage = `linear-gradient(to right, ${colorVal} 1px, transparent 1px), linear-gradient(to bottom, ${colorVal} 1px, transparent 1px)`;
            layer.style.backgroundSize = `${size}px ${size}px`;
        } else {
            const mode = item.typeMode || 'stretch';
            const direction = isRow ? 'to bottom' : 'to right';
            let gradient = '';
            if (mode === 'stretch') {
                if(margin > 0) {
                    if (maxWidth > 0) { layer.style.width = `min(calc(100% - ${margin*2}px), ${maxWidth}px)`; } 
                    else { layer.style.left = `${margin}px`; layer.style.width = isRow ? '100%' : `calc(100% - ${margin * 2}px)`; layer.style.transform = 'none'; }
                }
                const colWidth = `((100% - ${(count - 1) * gutter}px) / ${count})`;
                gradient = `repeating-linear-gradient(${direction}, ${colorVal} 0, ${colorVal} calc(${colWidth}), transparent calc(${colWidth}), transparent calc(${colWidth} + ${gutter}px))`;
            } else {
                const sizeVal = isRow ? height : width;
                const totalGridSize = (count * sizeVal) + ((count - 1) * gutter);
                if (!isRow && maxWidth > 0) { layer.style.width = `min(${totalGridSize}px, ${maxWidth}px)`; } 
                else { layer.style[isRow ? 'height' : 'width'] = `${totalGridSize}px`; }
                
                if (mode === 'center') {
                    if (!isRow) { layer.style.left = '50%'; layer.style.transform = 'translateX(-50%)'; }
                    else { layer.style.top = '50%'; layer.style.transform = 'translateY(-50%)'; }
                } else if (mode === 'right' || mode === 'bottom') {
                     layer.style[isRow ? 'bottom' : 'right'] = '0'; layer.style[isRow ? 'top' : 'left'] = 'auto';
                } else { layer.style[isRow ? 'top' : 'left'] = '0'; }
                gradient = `repeating-linear-gradient(${direction}, ${colorVal} 0, ${colorVal} ${sizeVal}px, transparent ${sizeVal}px, transparent ${sizeVal + gutter}px)`;
            }
            layer.style.backgroundImage = gradient;
            if (mode !== 'stretch') layer.style.backgroundRepeat = 'no-repeat'; 
        }
        container.appendChild(layer);
      });
      shadow.replaceChildren(style, tag, container);
    }
  }
  if (!window.GridProInstance) { window.GridProInstance = new Overlay(); }
})();