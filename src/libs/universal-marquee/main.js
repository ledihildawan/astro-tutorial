/**
 * UniversalMarquee v9.0 (Ultra-Stable Edition)
 * Fixed: Sub-pixel gaps, resize jumping, and background-tab desync.
 */

function deepMerge(target, source) {
  if (typeof source !== 'object' || source === null) return source;
  if (Array.isArray(source)) return [...source];
  if (source.nodeType) return source;
  if (source instanceof Date) return new Date(source);
  if (source instanceof RegExp) return new RegExp(source);

  if (typeof target !== 'object' || target === null || Array.isArray(target)) {
    target = {};
  }

  const output = { ...target };
  for (const key of Object.keys(source)) {
    const value = source[key];
    if (value instanceof Object && !Array.isArray(value) && typeof value !== 'function' && !value.nodeType && !(value instanceof Date) && !(value instanceof RegExp)) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

export class UniversalMarquee {
  static #DEFAULTS = {
    debug: false,
    content: { items: [], renderItem: (item) => String(item), separator: null, wrapperClass: '' },
    style: { speed: 50, gap: '2rem', direction: 'normal', align: 'center', rtl: false, mask: true, maskWidth: '5%' },
    behavior: { autoStart: true, startWhenVisible: false, centerIfShort: true, hoverAction: 'pause', hoverSpeedFactor: 0.3, pauseOnInvisibility: true, cloneStrategy: 'auto', cloneCount: 0, randomize: false },
    physics: { draggable: true, dragSpeed: 1.2, touchThreshold: 10, snap: { enabled: false, friction: 0.1 }, scrollSync: { enabled: false, factor: 2.5, reverse: false }, lockAxis: true },
    animation: { delay: 0, loops: 'infinite', easing: 'linear', reducedMotion: 'stop' },
    performance: { lazyLoad: false },
    a11y: { ariaLabel: 'Scrolling content', hideClones: true },
    breakpoints: {},
    callbacks: { onInit: () => {}, onCycleComplete: () => {}, onItemClick: () => {}, onDragStart: () => {}, onDragEnd: () => {}, onMouseEnter: () => {}, onMouseLeave: () => {}, onBreakpointChange: () => {} },
  };

  constructor(selector, options = {}) {
    this.root = document.querySelector(selector);
    if (!this.root) throw new Error(`UniversalMarquee: Node '${selector}' not found.`);

    this._baseConfig = deepMerge({}, UniversalMarquee.#DEFAULTS);
    this._baseConfig = deepMerge(this._baseConfig, options);
    this.config = deepMerge({}, this._baseConfig);

    this._observers = [];
    this._rafId = null;
    this._resizeTimer = null;
    this._currentBreakpoint = null;
    this._isDestroyed = false;
    this._isCentered = false;
    this._isManuallyPaused = false;
    this._hasStarted = false;
    this._singleLoopWidth = 0;

    this._drag = { active: false, startX: 0, startY: 0, currentX: 0, lastTranslate: 0, velocity: 0, lastTime: 0, hasMoved: false, isLocked: false };
    this._scroll = { currentOffset: 0, targetOffset: 0, lastY: window.scrollY, rafId: null };
    this._boundOnScroll = this.#onScroll.bind(this);
    
    this.#init();
  }

  #log(...args) { if (this.config.debug) console.log(`[UniversalMarquee]`, ...args); }

  #init() {
    this.root.classList.add('um-host');
    this.root.setAttribute('role', 'marquee');
    if (this.config.a11y.ariaLabel) this.root.setAttribute('aria-label', this.config.a11y.ariaLabel);

    this.#checkBreakpoints();
    if (this.config.behavior.randomize) this.#shuffleItems();
    
    this.#buildDOM();

    this.#waitForAssets().then(() => {
      this.#measureAndSync();
      this.#initObservers();
      this.#toggleListeners(true);

      if (this.config.behavior.autoStart && !this._isCentered && !this.config.behavior.startWhenVisible) {
        this.play();
      } else {
        this.pause();
        this._isManuallyPaused = false;
      }

      if (this.config.callbacks.onInit) this.config.callbacks.onInit(this);
    });
  }

  #measureAndSync() {
    if (!this.track || this._isCentered || this._isDestroyed) return;
    
    const items = Array.from(this.track.querySelectorAll('.um-item:not([data-clone="true"])'));
    const separators = Array.from(this.track.querySelectorAll('.um-separator:not([data-clone="true"])'));
    const gap = this.#parseGap(this.config.style.gap);
    
    // Peningkatan: Menggunakan getBoundingClientRect untuk presisi sub-pixel
    let totalWidth = 0;
    items.forEach(el => totalWidth += el.getBoundingClientRect().width);
    separators.forEach(el => totalWidth += el.getBoundingClientRect().width);

    this._singleLoopWidth = totalWidth + ((items.length + separators.length) * gap);
    
    requestAnimationFrame(() => this.#syncCSS());
  }

  #syncCSS() {
    if (this._isDestroyed) return;
    const s = this.root.style;
    const c = this.config;

    s.setProperty('--um-gap', `${this.#parseGap(c.style.gap)}px`);
    s.setProperty('--um-align', c.style.align);
    s.setProperty('--um-direction-attr', c.style.rtl ? 'rtl' : 'ltr');
    s.setProperty('--um-direction', c.style.direction);
    s.setProperty('--um-easing', c.animation.easing);
    s.setProperty('--um-iteration', c.animation.loops === 'infinite' ? 'infinite' : String(c.animation.loops));

    if (this.track && !this._isCentered) {
      const dist = this._singleLoopWidth.toFixed(2);
      s.setProperty('--um-travel-dist', `-${dist}px`);
      const dur = c.style.speed > 0 ? (this._singleLoopWidth / c.style.speed).toFixed(4) : 0;
      s.setProperty('--um-duration', `${dur}s`);
    }

    if (c.style.mask) {
      this.root.setAttribute('data-mask', typeof c.style.mask === 'string' ? c.style.mask : 'both');
      s.setProperty('--um-mask-width', c.style.maskWidth);
    }
  }

  #snapToCSS() {
    const loopLen = this._singleLoopWidth;
    if (loopLen <= 0) return;

    let norm = this._drag.currentX % loopLen;
    if (norm > 0) norm -= loopLen;

    const progress = Math.abs(norm) / loopLen;
    const dur = parseFloat(getComputedStyle(this.root).getPropertyValue('--um-duration')) || 10;
    
    this.root.style.setProperty('--um-delay', `-${(progress * dur).toFixed(4)}s`);
    
    // Double-RAF untuk transisi mulus dari inline-transform kembali ke CSS Animation
    this.track.style.transform = `translate3d(${norm.toFixed(2)}px, 0, 0.01px)`;
    requestAnimationFrame(() => {
      this.root.classList.add('um-animating');
      requestAnimationFrame(() => {
        this.track.style.transform = '';
      });
    });
  }

  #initObservers() {
    const ro = new ResizeObserver(() => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => this.#measureAndSync(), 150);
    });
    ro.observe(this.root);
    if (this.track) ro.observe(this.track);
    this._observers.push(ro);

    const io = new IntersectionObserver((e) => {
      e.forEach(entry => {
        if (entry.isIntersecting) {
          if (this.config.behavior.startWhenVisible && !this._hasStarted) this.play();
          if (this.config.behavior.pauseOnInvisibility && !this._isManuallyPaused) this.root.classList.remove('um-paused');
        } else {
          if (this.config.behavior.pauseOnInvisibility) this.root.classList.add('um-paused');
        }
      });
    }, { rootMargin: '50px' });
    io.observe(this.root);
    this._observers.push(io);

    // Visibility Change: Mencegah lonjakan animasi saat kembali ke tab
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.root.classList.add('um-paused');
      else if (!this._isManuallyPaused) this.root.classList.remove('um-paused');
    });
  }

  // --- Sisa fungsi dasar yang dipertahankan ---
  play() { if (this._isCentered) return; this.root.classList.remove('um-paused'); this.root.style.setProperty('--um-play-state', 'running'); this._hasStarted = true; this._isManuallyPaused = false; }
  pause() { this.root.classList.add('um-paused'); this.root.style.setProperty('--um-play-state', 'paused'); this._isManuallyPaused = true; }
  
  #buildDOM() {
    const { items, separator, renderItem, wrapperClass } = this.config.content;
    const frag = document.createDocumentFragment();
    items.forEach((item, idx) => {
      frag.appendChild(this.#createItem(item, idx, renderItem, wrapperClass));
      if (separator) frag.appendChild(this.#createSeparator(separator));
    });

    this.track = document.createElement('div');
    this.track.className = 'um-track';
    
    const temp = document.createElement('div');
    temp.style.cssText = 'position:absolute;visibility:hidden;width:max-content;display:flex;';
    temp.appendChild(frag.cloneNode(true));
    this.root.appendChild(temp);
    const contentWidth = temp.getBoundingClientRect().width;
    this.root.removeChild(temp);

    const viewW = this.root.offsetWidth || window.innerWidth;
    if (this.config.behavior.centerIfShort && contentWidth < viewW) {
      this._isCentered = true;
      this.root.classList.add('um-centered');
      this.track.appendChild(frag.cloneNode(true));
    } else {
      this._isCentered = false;
      this.root.classList.remove('um-centered');
      const clones = Math.max(1, this.config.behavior.cloneStrategy === 'exact' ? this.config.behavior.cloneCount : Math.ceil(viewW / contentWidth) + 1);
      for (let i = 0; i <= clones; i++) {
        const set = frag.cloneNode(true);
        if (i > 0) { this.#sanitizeIds(set); if (this.config.a11y.hideClones) this.#markAsClone(set); }
        this.track.appendChild(set);
      }
    }
    this.root.innerHTML = '';
    this.root.appendChild(this.track);
    this.root.classList.add('um-animating');
  }

  // ... (Fungsi helper lainnya: #dragMove, #onScroll, etc tetap ada di background)
  #dragStart(e) {
    if (this._isCentered || e.button === 2) return;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._drag.active = true;
    this._drag.hasMoved = false;
    const point = e.touches ? e.touches[0] : e;
    this._drag.startX = point.clientX;
    this._drag.startY = point.clientY;
    this._drag.lastTime = performance.now();
    const matrix = new (window.DOMMatrix || window.WebKitCSSMatrix)(getComputedStyle(this.track).transform);
    this._drag.lastTranslate = matrix.m41;
    this._drag.currentX = matrix.m41;
  }

  #dragMove(e) {
    if (!this._drag.active) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - this._drag.startX;
    const dy = point.clientY - this._drag.startY;
    if (this.config.physics.lockAxis && Math.abs(dy) > Math.abs(dx)) return;
    if (!this._drag.hasMoved && Math.abs(dx) < this.config.physics.touchThreshold) return;
    if (e.cancelable) e.preventDefault();
    if (!this._drag.hasMoved) {
      this.root.classList.add('um-dragging', 'um-cursor-grabbing');
      this.root.classList.remove('um-animating');
      this._drag.hasMoved = true;
    }
    const now = performance.now();
    this._drag.velocity = (this._drag.lastTranslate + (dx * this.config.physics.dragSpeed) - this._drag.currentX) / (now - this._drag.lastTime || 1);
    this._drag.currentX = this._drag.lastTranslate + (dx * this.config.physics.dragSpeed);
    this.track.style.transform = `translate3d(${this._drag.currentX.toFixed(2)}px, 0, 0.01px)`;
    this._drag.lastTime = now;
  }

  #dragEnd() {
    if (!this._drag.active) return;
    this._drag.active = false;
    this.root.classList.remove('um-dragging', 'um-cursor-grabbing');
    if (this._drag.hasMoved) {
      if (Math.abs(this._drag.velocity) > 0.1) this.#momentumLoop();
      else this.#snapToCSS();
    }
  }

  #momentumLoop() {
    this._drag.velocity *= 0.95;
    this._drag.currentX += this._drag.velocity * 16;
    this.track.style.transform = `translate3d(${this._drag.currentX.toFixed(2)}px, 0, 0.01px)`;
    if (Math.abs(this._drag.velocity) < 0.1) this.#snapToCSS();
    else this._rafId = requestAnimationFrame(() => this.#momentumLoop());
  }

  #onScroll() {
    if (this._isDestroyed || this._isCentered) return;
    const delta = window.scrollY - this._scroll.lastY;
    this._scroll.lastY = window.scrollY;
    if (this.config.physics.scrollSync.enabled) {
      this._scroll.targetOffset -= delta * this.config.physics.scrollSync.factor;
      if (!this._scroll.rafId) this._scroll.rafId = requestAnimationFrame(this.#loopScrollBoost);
    }
  }

  #loopScrollBoost = () => {
    this._scroll.currentOffset += (this._scroll.targetOffset - this._scroll.currentOffset) * 0.1;
    this.root.style.setProperty('--um-scroll-boost', `${this._scroll.currentOffset.toFixed(2)}px`);
    this._scroll.targetOffset *= 0.9;
    if (Math.abs(this._scroll.currentOffset) < 0.5) {
      this._scroll.rafId = null;
      this.root.style.setProperty('--um-scroll-boost', '0px');
    } else {
      this._scroll.rafId = requestAnimationFrame(this.#loopScrollBoost);
    }
  };

  #createItem(data, idx, renderer, wrapperClass) {
    const el = document.createElement('div');
    el.className = `um-item ${wrapperClass || ''}`;
    try {
      const content = renderer(data, idx);
      if (content instanceof Node) el.appendChild(content);
      else el.insertAdjacentHTML('beforeend', content);
    } catch (e) { el.textContent = 'Error'; }
    if (this.config.callbacks.onItemClick) {
      el.addEventListener('click', (e) => { if (!this._drag.hasMoved) this.config.callbacks.onItemClick(data, idx, e); });
    }
    return el;
  }

  #createSeparator(content) {
    const el = document.createElement('span');
    el.className = 'um-separator';
    el.setAttribute('aria-hidden', 'true');
    if (content instanceof Node) el.appendChild(content);
    else el.insertAdjacentHTML('beforeend', content);
    return el;
  }

  #parseGap(gap) { if (typeof gap === 'number') return gap; if (gap?.endsWith('rem')) return parseFloat(gap) * 16; return parseFloat(gap) || 0; }
  #sanitizeIds(node) { if (node.id) node.removeAttribute('id'); node.querySelectorAll?.('[id]').forEach(e => e.removeAttribute('id')); }
  #markAsClone(frag) { Array.from(frag.children || [frag]).forEach(c => { c.setAttribute('aria-hidden', 'true'); c.setAttribute('data-clone', 'true'); }); }
  #shuffleItems() { const items = this.config.content.items; for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; } }
  
  async #waitForAssets() {
    const imgs = Array.from(this.root.querySelectorAll('img'));
    const promises = imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; }));
    const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();
    await Promise.all([Promise.all(promises), Promise.race([fontPromise, new Promise(r => setTimeout(r, 2000))])]);
  }

  #checkBreakpoints() {
    const width = window.innerWidth;
    const breakpoints = Object.keys(this._baseConfig.breakpoints).map(Number).sort((a, b) => a - b);
    let targetConfig = deepMerge({}, this._baseConfig);
    let activeBp = null;
    breakpoints.filter(bp => width >= bp).forEach(bp => { targetConfig = deepMerge(targetConfig, this._baseConfig.breakpoints[bp]); activeBp = bp; });
    if (this._currentBreakpoint !== activeBp) {
      this.config = targetConfig;
      this._currentBreakpoint = activeBp;
      if (this.track) { this.#buildDOM(); this.#measureAndSync(); }
      if (this.config.callbacks.onBreakpointChange) this.config.callbacks.onBreakpointChange(activeBp);
    }
  }

  #toggleListeners(enable) {
    const method = enable ? 'addEventListener' : 'removeEventListener';
    this.root[method]('mouseenter', this.#onMouseEnter);
    this.root[method]('mouseleave', this.#onMouseLeave);
    if (this.config.physics.scrollSync?.enabled) window[method]('scroll', this._boundOnScroll, { passive: true });
    if (this.config.physics.draggable) this.#toggleDragListeners(enable);
  }

  #onMouseEnter = () => {
    if (this._drag.active || this._isCentered) return;
    if (this.config.behavior.hoverAction === 'pause') this.root.classList.add('um-paused');
    else if (this.config.behavior.hoverAction === 'slow') this.#setPlaybackRate(this.config.behavior.hoverSpeedFactor);
  };

  #onMouseLeave = () => {
    if (this._drag.active || this._isCentered) return;
    if (this.config.behavior.hoverAction === 'pause' && !this._isManuallyPaused) this.root.classList.remove('um-paused');
    else if (this.config.behavior.hoverAction === 'slow') this.#setPlaybackRate(1);
  };

  #setPlaybackRate(rate) {
    if (!this.track) return;
    this.track.getAnimations().forEach(anim => { if (anim.animationName === 'um-scroll') anim.playbackRate = rate; });
  }

  #toggleDragListeners(enable) {
    const m = enable ? 'addEventListener' : 'removeEventListener';
    const start = (e) => this.#dragStart(e);
    const move = (e) => this.#dragMove(e);
    const end = () => this.#dragEnd();
    this.root[m]('mousedown', start);
    this.root[m]('touchstart', start, { passive: false });
    window[m]('mousemove', move);
    window[m]('touchmove', move, { passive: false });
    window[m]('mouseup', end);
    window[m]('touchend', end);
  }

  updateItems(newItems) {
    this._baseConfig.content.items = newItems;
    this.config.content.items = newItems;
    this.#buildDOM();
    this.#measureAndSync();
  }

  destroy() {
    this._isDestroyed = true;
    this._observers.forEach((o) => o.disconnect());
    this.#toggleListeners(false);
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this.root.innerHTML = '';
    this.root.removeAttribute('style');
  }
}