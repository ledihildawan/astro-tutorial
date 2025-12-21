(function() {
  const HOST_ID = 'grid-pro-v9-engine';
  const DEFAULT_ITEMS = [{ type: 'columns', count: 12, typeMode: 'center', width: 80, gutter: 24, color: '#dc3545', opacity: 0.15, visible: true, maxWidth: 1320 }];

  class Overlay {
    constructor() { 
      this.state = { enabled: false, items: [] }; 
      this.host = null; 
      this.init(); 
    }

    debounce(fn, delay) {
      let timer;
      return () => {
        clearTimeout(timer);
        timer = setTimeout(fn, delay);
      };
    }

    init() {
      const savedEnabled = sessionStorage.getItem('gridProEnabled');
      this.state.enabled = savedEnabled !== null ? JSON.parse(savedEnabled) : false;

      this.debouncedRender = this.debounce(() => this.render(), 80);

      chrome.storage.local.get(['store'], (data) => {
        this.updateStateFromStorage(data);
        if (this.state.enabled) this.render();
      });

      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'UPDATE') {
          this.state.items = msg.items || DEFAULT_ITEMS;
          if (this.state.enabled) this.render();
        } else if (msg.action === 'TOGGLE_LOCAL') {
          this.state.enabled = !this.state.enabled;
          sessionStorage.setItem('gridProEnabled', JSON.stringify(this.state.enabled));
          this.state.enabled ? this.render() : this.removeHost();
          sendResponse({ enabled: this.state.enabled });
          chrome.runtime.sendMessage({ action: 'SYNC_UI', enabled: this.state.enabled, tabId: 'self' });
        } else if (msg.action === 'GET_STATUS') {
          sendResponse({ enabled: this.state.enabled });
        }
        return true;
      });

      window.addEventListener('resize', () => {
        if (this.state.enabled) {
            if (this.host && this.host.shadowRoot) {
                const tag = this.host.shadowRoot.querySelector('.viewport-tag');
                if (tag) tag.textContent = `${document.documentElement.clientWidth}px`;
            }
            this.debouncedRender();
        }
      });
    }

    updateStateFromStorage(data) {
      const activeId = data?.store?.activeProfileId;
      this.state.items = data?.store?.profiles?.[activeId]?.items || DEFAULT_ITEMS;
    }

    removeHost() { 
      if (this.host) { 
        this.host.remove(); 
        this.host = null; 
      } 
    }

    createHost() {
      if (this.host) return this.host;
      this.host = document.createElement('div');
      this.host.id = HOST_ID;
      this.host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;contain:strict;';
      this.host.attachShadow({ mode: 'open' });
      document.documentElement.appendChild(this.host);
      return this.host;
    }

    render() {
      const host = this.createHost();
      const shadow = host.shadowRoot;
      const viewportWidth = document.documentElement.clientWidth;

      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;inset:0;display:flex;justify-content:center;overflow:hidden;';

      const style = document.createElement('style');
      style.textContent = `
        .viewport-tag { position: fixed; top: 12px; right: 24px; background: rgba(9,9,11,0.9); color: #10b981; padding: 4px 8px; font-family: monospace; font-size: 10px; border-radius: 4px; border: 1px solid rgba(16,185,129,0.3); z-index: 2; pointer-events: none; }
        .grid-layer { position: absolute; height: 100%; width: 100%; pointer-events: none; }
      `;

      const tag = document.createElement('div');
      tag.className = 'viewport-tag';
      tag.textContent = `${viewportWidth}px`;

      this.state.items.forEach(item => {
        if (!item.visible) return;
        const layer = document.createElement('div');
        layer.className = 'grid-layer';

        const isRow = item.type === 'rows';
        
        // UPDATE: Use '??' for color and opacity. Fixes bug where opacity 0 becomes 0.15
        const rgb = (item.color ?? '#3b82f6').replace('#','').match(/.{2}/g).map(x => parseInt(x, 16));
        const color = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${item.opacity ?? 0.15})`;
        
        const maxWidth = item.maxWidth ?? 0;
        if (maxWidth > 0) {
            layer.style.width = `min(100%, ${maxWidth}px)`;
            layer.style.left = '50%';
            layer.style.transform = 'translateX(-50%)';
        }

        if (item.type === 'grid') {
            const size = item.size ?? 20;
            layer.style.backgroundImage = `
                linear-gradient(to right, ${color} 1px, transparent 1px), 
                linear-gradient(to bottom, ${color} 1px, transparent 1px)
            `;
            layer.style.backgroundSize = `${size}px ${size}px`;
        } 
        else {
            const count = Math.max(1, item.count ?? 1);
            // UPDATE: Use '??' so gutter can be 0px
            const gutter = item.gutter ?? 0;
            const mode = item.typeMode ?? 'stretch';
            const direction = isRow ? 'to bottom' : 'to right';
            
            let gradient = '';

            if (mode === 'stretch') {
                // UPDATE: Use '??' so margin can be 0px
                const margin = item.margin ?? 0;
                
                if(margin > 0) {
                    if (maxWidth > 0) {
                        layer.style.width = `min(calc(100% - ${margin*2}px), ${maxWidth}px)`;
                    } else {
                        layer.style.left = `${margin}px`;
                        layer.style.width = isRow ? '100%' : `calc(100% - ${margin * 2}px)`;
                        layer.style.transform = 'none';
                    }
                }

                const colWidth = `((100% - ${(count - 1) * gutter}px) / ${count})`;
                
                gradient = `repeating-linear-gradient(
                    ${direction}, 
                    ${color} 0, 
                    ${color} calc(${colWidth}), 
                    transparent calc(${colWidth}), 
                    transparent calc(${colWidth} + ${gutter}px)
                )`;
                
            } else {
                // FIXED
                const sizeVal = isRow ? (item.height ?? 80) : (item.width ?? 80);
                const totalGridSize = count * sizeVal + (count - 1) * gutter;
                
                layer.style.width = `${totalGridSize}px`;
                
                if (mode === 'center') {
                    layer.style.left = '50%';
                    layer.style.transform = 'translateX(-50%)';
                } else if (mode === 'right' || mode === 'bottom') {
                     layer.style[isRow ? 'bottom' : 'right'] = '0';
                     layer.style[isRow ? 'top' : 'left'] = 'auto';
                     if(mode==='right') layer.style.transform = 'none';
                } else {
                     layer.style.left = '0';
                     layer.style.transform = 'none';
                }
                
                gradient = `repeating-linear-gradient(
                    ${direction}, 
                    ${color} 0, 
                    ${color} ${sizeVal}px, 
                    transparent ${sizeVal}px, 
                    transparent ${sizeVal + gutter}px
                )`;
            }

            layer.style.backgroundImage = gradient;
            if (mode !== 'stretch') {
                layer.style.backgroundRepeat = 'no-repeat'; 
            }
        }
        
        container.appendChild(layer);
      });

      shadow.replaceChildren(style, tag, container);
    }
  }
  new Overlay();
})();