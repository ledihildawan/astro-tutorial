/**
 * UniversalMarquee v8.4 (Refactored Edition)
 * Fixed: Loop math, Deep merge safety, Drag momentum sync, Memory leaks.
 */

// Helper: Deep Merge (Safer Version)
function deepMerge(target, source) {
  if (typeof source !== 'object' || source === null) return source;
  if (Array.isArray(source)) return [...source];
  if (source.nodeType) return source;
  // Protect complex built-ins
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
    content: {
      items: [],
      renderItem: (item) => String(item),
      separator: null,
      wrapperClass: '',
    },
    style: {
      speed: 50, // px per second
      gap: '2rem',
      direction: 'normal',
      align: 'center',
      rtl: false,
      mask: true,
      maskWidth: '5%',
    },
    behavior: {
      autoStart: true,
      startWhenVisible: false,
      centerIfShort: true,
      hoverAction: 'pause',
      hoverSpeedFactor: 0.3,
      pauseOnInvisibility: true,
      cloneStrategy: 'auto',
      cloneCount: 0,
      randomize: false,
    },
    physics: {
      draggable: true,
      dragSpeed: 1.2,
      touchThreshold: 10,
      snap: { enabled: false, friction: 0.1 },
      scrollSync: { enabled: false, factor: 2.5, reverse: false },
      lockAxis: true,
    },
    animation: {
      delay: 0,
      loops: 'infinite',
      easing: 'linear',
      reducedMotion: 'stop',
    },
    performance: { lazyLoad: false },
    a11y: { ariaLabel: 'Scrolling content', hideClones: true },
    breakpoints: {},
    callbacks: {
      onInit: () => {},
      onCycleComplete: () => {},
      onItemClick: () => {},
      onDragStart: () => {},
      onDragEnd: () => {},
      onMouseEnter: () => {},
      onMouseLeave: () => {},
      onBreakpointChange: () => {},
    },
  };

  constructor(selector, options = {}) {
    this.root = document.querySelector(selector);
    if (!this.root) throw new Error(`UniversalMarquee: Node '${selector}' not found.`);

    this._baseConfig = deepMerge({}, UniversalMarquee.#DEFAULTS);
    this._baseConfig = deepMerge(this._baseConfig, options);
    this.config = deepMerge({}, this._baseConfig);

    // State
    this._observers = [];
    this._rafId = null;
    this._resizeTimer = null;
    this._currentBreakpoint = null;
    this._isDestroyed = false;
    this._isCentered = false;
    this._isManuallyPaused = false;
    this._hasStarted = false;
    this._singleLoopWidth = 0; // Kritis untuk animasi mulus

    // Physics
    this._drag = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      lastTranslate: 0,
      velocity: 0,
      lastTime: 0,
      hasMoved: false,
      isLocked: false,
      snapTarget: null,
    };
    
    // Binding agar bisa removeEventListener dengan benar
    this._boundOnScroll = this.#onScroll.bind(this);
    
    this._scroll = { currentOffset: 0, targetOffset: 0, lastY: window.scrollY, rafId: null };
    this._dragListeners = null;

    this.#init();
  }

  #log(...args) {
    if (this.config.debug) console.log(`[UniversalMarquee]`, ...args);
  }

  // --- PUBLIC API ---

  updateItems(newItems) {
    this.#log('Updating items:', newItems.length);
    this._baseConfig.content.items = newItems;
    this.config.content.items = newItems;
    if (this.config.behavior.randomize) this.#shuffleItems();
    this.#buildDOM();
    this.#waitForAssets().then(() => {
      this.#syncCSS();
      // Restart animation clean
      this.root.classList.remove('um-animating');
      void this.root.offsetWidth; // Trigger reflow
      this.root.classList.add('um-animating');
    });
  }

  setSpeed(speed) {
    this.config.style.speed = speed;
    this.#syncCSS();
  }

  reverse() {
    const current = this.config.style.direction;
    this.config.style.direction = current === 'normal' ? 'reverse' : 'normal';
    this.#syncCSS();
  }

  play() {
    if (this._isCentered) return;
    this.root.classList.remove('um-paused');
    this.root.style.setProperty('--um-play-state', 'running');
    this._hasStarted = true;
    this._isManuallyPaused = false;
  }

  pause() {
    this.root.classList.add('um-paused');
    this.root.style.setProperty('--um-play-state', 'paused');
    this._isManuallyPaused = true;
  }

  destroy() {
    this.#log('Destroying instance');
    this._isDestroyed = true;
    this._observers.forEach((o) => o.disconnect());
    this.#toggleListeners(false);

    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._scroll.rafId) cancelAnimationFrame(this._scroll.rafId);
    clearTimeout(this._resizeTimer);

    if (this.track) {
      while (this.track.firstChild) this.track.removeChild(this.track.firstChild);
    }

    this.root.innerHTML = '';
    this.root.className = '';
    this.root.removeAttribute('style');
    this.root.removeAttribute('role');
    this.root.removeAttribute('aria-label');
  }

  // --- CORE ---

  #init() {
    this.#log('Initializing v8.4...');
    this.root.classList.add('um-host');
    this.root.setAttribute('role', 'marquee');
    if (this.config.a11y.ariaLabel) {
      this.root.setAttribute('aria-label', this.config.a11y.ariaLabel);
    }

    this.#checkBreakpoints();
    if (this.config.behavior.randomize) this.#shuffleItems();

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (this.config.animation.reducedMotion === 'stop') this.config.style.speed = 0;
      else this.config.style.speed *= 0.15;
    }

    this.#buildDOM();

    this.#waitForAssets().then(() => {
      this.#syncCSS();
      this.#initObservers();
      this.#toggleListeners(true);

      const shouldWait = this.config.behavior.startWhenVisible;
      if (this.config.behavior.autoStart && !this._isCentered && !shouldWait) {
        this.play();
      } else {
        this.root.classList.add('um-paused');
        this.root.style.setProperty('--um-play-state', 'paused');
      }

      if (this.config.callbacks.onInit) this.config.callbacks.onInit(this);
    });
  }

  #checkBreakpoints() {
    const width = window.innerWidth;
    const breakpoints = Object.keys(this._baseConfig.breakpoints).map(Number).sort((a, b) => a - b);
    let activeBp = null;
    let targetConfig = deepMerge({}, this._baseConfig);

    const activePoints = breakpoints.filter((bp) => width >= bp);
    activePoints.forEach((bp) => {
      targetConfig = deepMerge(targetConfig, this._baseConfig.breakpoints[bp]);
      activeBp = bp;
    });

    if (this._currentBreakpoint !== activeBp) {
      this.#log(`Breakpoint changed: ${activeBp || 'default'}`);
      this.config = targetConfig;
      this._currentBreakpoint = activeBp;
      this.#syncCSS();
      if (this.track) this.#buildDOM();
      if (this.config.callbacks.onBreakpointChange) this.config.callbacks.onBreakpointChange(activeBp);
    }
  }

  #buildDOM() {
    const { items, separator, renderItem, wrapperClass } = this.config.content;
    const frag = document.createDocumentFragment();

    items.forEach((item, idx) => {
      frag.appendChild(this.#createItem(item, idx, renderItem, wrapperClass));
      if (separator) frag.appendChild(this.#createSeparator(separator));
    });

    // --- MEASUREMENT PHASE ---
    // Kita harus mengukur lebar konten asli (1 set) secara akurat termasuk gap
    const tempMeasure = document.createElement('div');
    const gapValue = this.#parseGap(this.config.style.gap);
    
    tempMeasure.style.cssText = `position:absolute; visibility:hidden; width:max-content; display:flex; gap:${gapValue}px; padding:0; margin:0;`;
    tempMeasure.appendChild(frag.cloneNode(true));
    this.root.appendChild(tempMeasure);
    
    const contentWidth = tempMeasure.offsetWidth;
    // Lebar 1 siklus loop = lebar konten + 1 gap (karena gap ada di antara tiap set)
    this._singleLoopWidth = contentWidth + gapValue;
    
    this.root.removeChild(tempMeasure);
    // -------------------------

    this.track = document.createElement('div');
    this.track.className = 'um-track';
    
    // Event listener untuk loop events
    this.track.addEventListener('animationiteration', () => {
      if (this.config.callbacks.onCycleComplete) this.config.callbacks.onCycleComplete();
    });

    const viewW = this.root.offsetWidth || window.innerWidth;

    // Center Logic
    if (this.config.behavior.centerIfShort && contentWidth < viewW) {
      this.#log('Content shorter than viewport. Centering.');
      this._isCentered = true;
      this.root.classList.add('um-centered');
      this.track.appendChild(frag.cloneNode(true));
      this.root.innerHTML = '';
      this.root.appendChild(this.track);
      return;
    } else {
      this._isCentered = false;
      this.root.classList.remove('um-centered');
    }

    // Cloning Strategy
    // Kita butuh cukup clone untuk mengisi viewport + buffer untuk scroll
    // Minimal harus ada 2 set (asli + 1 clone) untuk animasi loop
    let clones = 0;
    const { cloneStrategy, cloneCount } = this.config.behavior;

    if (cloneStrategy === 'exact') {
      clones = cloneCount;
    } else if (cloneStrategy === 'auto' && contentWidth > 0) {
      // Hitung berapa set yang dibutuhkan untuk memenuhi lebar layar + 1 set ekstra untuk buffer animasi
      // Math.ceil(viewW / this._singleLoopWidth) memberi jumlah set untuk memenuhi layar.
      // Kita tambah 1 agar saat set pertama keluar layar, set baru sudah siap.
      const neededSets = Math.ceil(viewW / this._singleLoopWidth) + 1;
      clones = Math.max(1, neededSets - 1); // -1 karena set asli sudah ada
    }

    // Append Original
    this.track.appendChild(frag.cloneNode(true));
    
    // Append Clones
    for (let i = 0; i < clones; i++) {
      const clone = frag.cloneNode(true);
      this.#sanitizeIds(clone);
      if (this.config.a11y.hideClones) this.#markAsClone(clone);
      this.track.appendChild(clone);
    }

    this.root.innerHTML = '';
    this.root.appendChild(this.track);
    this.root.classList.add('um-animating');
  }

  #syncCSS() {
    if (this._isDestroyed) return;
    const s = this.root.style;
    const c = this.config;
    const gapVal = this.#parseGap(c.style.gap);

    s.setProperty('--um-gap', `${gapVal}px`);
    s.setProperty('--um-align', c.style.align);
    s.setProperty('--um-direction-attr', c.style.rtl ? 'rtl' : 'ltr');
    s.setProperty('--um-direction', c.style.direction);
    s.setProperty('--um-easing', c.animation.easing);
    s.setProperty('--um-iteration', c.animation.loops === 'infinite' ? 'infinite' : String(c.animation.loops));
    s.setProperty('--um-init-delay', `${c.animation.delay}ms`);

    if (this.track && !this._isCentered) {
      // FIX: Jarak tempuh animasi adalah tepat 1 siklus set item (original content + 1 gap)
      // Ini mencegah glitch/lompatan di akhir animasi.
      const dist = this._singleLoopWidth;
      
      // Kirim jarak ini ke CSS
      s.setProperty('--um-travel-dist', `-${dist}px`);

      const dur = c.style.speed > 0 ? dist / c.style.speed : 0;
      s.setProperty('--um-duration', `${dur}s`);
      this._baseDuration = dur;
    }

    if (c.style.mask) {
      const maskVal = typeof c.style.mask === 'string' ? c.style.mask : 'both';
      this.root.setAttribute('data-mask', maskVal);
      s.setProperty('--um-mask-width', c.style.maskWidth);
    } else {
      this.root.removeAttribute('data-mask');
    }

    if (c.physics.draggable && !this._isCentered) this.root.classList.add('um-cursor-grab');
    else this.root.classList.remove('um-cursor-grab');
  }

  // Helper untuk parse gap string ke angka
  #parseGap(gap) {
    if (typeof gap === 'number') return gap;
    if (!gap) return 0;
    // Simple parser for px/rem. Default to 0 if fails.
    if (gap.endsWith('px')) return parseFloat(gap);
    if (gap.endsWith('rem')) return parseFloat(gap) * 16; // Asumsi root 16px
    return parseFloat(gap) || 0;
  }

  // --- EVENTS & PHYSICS ---

  #toggleListeners(enable) {
    const method = enable ? 'addEventListener' : 'removeEventListener';
    this.root[method]('mouseenter', this.#onMouseEnter);
    this.root[method]('mouseleave', this.#onMouseLeave);

    const scrollEnabled = this.config.physics.scrollSync?.enabled;
    const reverseEnabled = this.config.physics.scrollSync?.reverse;

    // FIX: Gunakan bound function reference agar tidak memory leak
    if (scrollEnabled || reverseEnabled) {
      window[method]('scroll', this._boundOnScroll, { passive: true });
    }

    if (this.config.physics.draggable) {
      this.#toggleDragListeners(enable);
    }
  }

  #setPlaybackRate(rate) {
    if (!this.track) return;
    const anims = this.track.getAnimations();
    const scrollAnim = anims.find((a) => a.animationName === 'um-scroll');
    if (scrollAnim) scrollAnim.playbackRate = rate;
  }

  #onMouseEnter = () => {
    if (this._drag.active || this._isCentered) return;
    const action = this.config.behavior.hoverAction;
    if (action === 'pause') this.root.classList.add('um-paused');
    else if (action === 'slow') this.#setPlaybackRate(this.config.behavior.hoverSpeedFactor || 0.3);
    if (this.config.callbacks.onMouseEnter) this.config.callbacks.onMouseEnter();
  };

  #onMouseLeave = () => {
    if (this._drag.active || this._isCentered) return;
    const action = this.config.behavior.hoverAction;
    if (action === 'pause') {
      if (!this._isManuallyPaused) this.root.classList.remove('um-paused');
    } else if (action === 'slow') {
      this.#setPlaybackRate(1);
    }
    if (this.config.callbacks.onMouseLeave) this.config.callbacks.onMouseLeave();
  };

  #onScroll = () => {
    if (this._isDestroyed || this._isCentered) return;
    const currentY = window.scrollY;
    const delta = currentY - this._scroll.lastY;
    this._scroll.lastY = currentY;

    const { enabled, factor, reverse } = this.config.physics.scrollSync;

    if (enabled) {
      this._scroll.targetOffset -= delta * factor;
      if (!this._scroll.rafId) this._scroll.rafId = requestAnimationFrame(this.#loopScrollBoost);
    }

    if (reverse && Math.abs(delta) > 2) {
      const isDown = delta > 0;
      const newDir = isDown ? 'normal' : 'reverse';
      this.root.style.setProperty('--um-direction', newDir);
    }
  };

  #loopScrollBoost = () => {
    if (this._isDestroyed) return;
    this._scroll.currentOffset += (this._scroll.targetOffset - this._scroll.currentOffset) * 0.1;
    this.root.style.setProperty('--um-scroll-boost', `${this._scroll.currentOffset}px`);
    this._scroll.targetOffset *= 0.9;

    if (Math.abs(this._scroll.currentOffset) < 0.5 && Math.abs(this._scroll.targetOffset) < 0.5) {
      this._scroll.currentOffset = 0;
      this.root.style.setProperty('--um-scroll-boost', '0px');
      this._scroll.rafId = null;
    } else {
      this._scroll.rafId = requestAnimationFrame(this.#loopScrollBoost);
    }
  };

  // --- DRAG SYSTEM ---
  #toggleDragListeners(enable) {
    const method = enable ? 'addEventListener' : 'removeEventListener';
    if (!this._dragListeners) {
      this._dragListeners = {
        start: (e) => this.#dragStart(e),
        move: (e) => this.#dragMove(e),
        end: (e) => this.#dragEnd(e),
      };
    }
    const { start, move, end } = this._dragListeners;
    this.root[method]('mousedown', start);
    this.root[method]('touchstart', start, { passive: false });
    window[method]('mousemove', move);
    window[method]('touchmove', move, { passive: false });
    window[method]('mouseup', end);
    window[method]('touchend', end);
  }

  #dragStart(e) {
    if (this._isCentered) return;
    if (e.button === 2) return;
    if (this._rafId) cancelAnimationFrame(this._rafId);

    this._drag.active = true;
    this._drag.hasMoved = false;
    this._drag.isLocked = false;
    this._drag.velocity = 0;

    const point = e.touches ? e.touches[0] : e;
    this._drag.startX = point.clientX;
    this._drag.startY = point.clientY;
    this._drag.lastTime = performance.now();

    // Get current visual transform
    const style = window.getComputedStyle(this.track).transform;
    const Matrix = window.DOMMatrix || window.WebKitCSSMatrix;
    const matrix = new Matrix(style);

    this._drag.lastTranslate = matrix.m41;
    this._drag.currentX = this._drag.lastTranslate;

    if (this.config.callbacks.onDragStart) this.config.callbacks.onDragStart();
  }

  #dragMove(e) {
    if (!this._drag.active || this._isCentered || this._drag.isLocked) return;

    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - this._drag.startX;
    const dy = point.clientY - this._drag.startY;

    if (this.config.physics.lockAxis && e.touches) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        this._drag.isLocked = true;
        this._drag.active = false;
        return;
      }
    }

    if (!this._drag.hasMoved && Math.abs(dx) < this.config.physics.touchThreshold) return;
    if (e.cancelable) e.preventDefault();

    if (!this._drag.hasMoved) {
      this.root.classList.add('um-dragging', 'um-cursor-grabbing');
      this.root.classList.remove('um-animating', 'um-cursor-grab');
      this._drag.hasMoved = true;
    }

    const now = performance.now();
    const dt = now - this._drag.lastTime;
    const deltaX = dx * this.config.physics.dragSpeed;
    const instantV = (this._drag.lastTranslate + deltaX - this._drag.currentX) / dt;
    
    if (dt > 0) this._drag.velocity = this._drag.velocity * 0.5 + instantV * 0.5;

    this._drag.currentX = this._drag.lastTranslate + deltaX;
    this.track.style.transform = `translate3d(${this._drag.currentX}px, 0, 0)`;
    this._drag.lastTime = now;
  }

  #dragEnd() {
    if (!this._drag.active) return;
    this._drag.active = false;

    this.root.classList.remove('um-dragging', 'um-cursor-grabbing');
    this.root.classList.add('um-cursor-grab');

    if (this._drag.hasMoved) {
      if (Math.abs(this._drag.velocity) > 0.1 || this.config.physics.snap.enabled) {
        this.#momentumLoop();
      } else {
        this.#snapToCSS();
      }
    }
    if (this.config.callbacks.onDragEnd) this.config.callbacks.onDragEnd();
  }

  #momentumLoop() {
    if (this._isDestroyed) return;
    this._drag.velocity *= 0.95;
    this._drag.currentX += this._drag.velocity * 16;
    this.track.style.transform = `translate3d(${this._drag.currentX}px, 0, 0)`;

    if (Math.abs(this._drag.velocity) < 0.1) {
      if (this.config.physics.snap.enabled) {
        this.#calculateSnapTarget();
        this._rafId = requestAnimationFrame(this.#snapLoop.bind(this));
      } else {
        this.#snapToCSS();
      }
    } else {
      this._rafId = requestAnimationFrame(this.#momentumLoop.bind(this));
    }
  }

  #calculateSnapTarget() {
    if (!this.track.children[0]) return;
    const itemW = this.track.children[0].offsetWidth;
    const gapVal = this.#parseGap(this.config.style.gap);
    const unit = itemW + gapVal;
    this._drag.snapTarget = Math.round(this._drag.currentX / unit) * unit;
  }

  #snapLoop() {
    if (this._isDestroyed) return;
    const dist = this._drag.snapTarget - this._drag.currentX;
    const friction = this.config.physics.snap.friction || 0.1;
    this._drag.currentX += dist * friction;
    this.track.style.transform = `translate3d(${this._drag.currentX}px, 0, 0)`;

    if (Math.abs(dist) < 0.5) {
      this._drag.currentX = this._drag.snapTarget;
      this.track.style.transform = `translate3d(${this._drag.currentX}px, 0, 0)`;
      this.#snapToCSS();
    } else {
      this._rafId = requestAnimationFrame(this.#snapLoop.bind(this));
    }
  }

  #snapToCSS() {
    // FIX: Kalkulasi momentum resume yang akurat
    // Kita gunakan _singleLoopWidth yang sudah kita hitung secara akurat
    const loopLen = this._singleLoopWidth; 
    
    // Normalisasi posisi X ke dalam range 0 hingga -loopLen
    let norm = this._drag.currentX % loopLen;
    if (norm > 0) norm -= loopLen; // Pastikan selalu negatif/kiri

    const progress = Math.abs(norm) / loopLen;
    const durationStr = getComputedStyle(this.root).getPropertyValue('--um-duration');
    const delay = -1 * progress * (parseFloat(durationStr) || 0);

    // Terapkan delay, hapus transform manual, dan nyalakan animasi kembali
    this.root.style.setProperty('--um-delay', `${delay}s`);
    this.track.style.transform = ''; // Biarkan CSS mengambil alih
    
    // Force Reflow agar browser sadar perubahan transform ke animasi
    void this.track.offsetWidth; 
    this.root.classList.add('um-animating');
  }

  // --- OBSERVERS ---
  #initObservers() {
    const ro = new ResizeObserver((entries) => {
      if (entries[0].contentRect.width === 0) return;
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this.#checkBreakpoints();
        if(this.track) {
           this.#buildDOM(); // Rebuild saat resize agar cloning tetap konsisten
           this.#syncCSS();
        }
      }, 150);
    });
    ro.observe(this.root);
    this._observers.push(ro);

    const io = new IntersectionObserver(
      (e) => {
        e.forEach((entry) => {
          if (entry.isIntersecting) {
            if (this.config.behavior.startWhenVisible && !this._hasStarted) {
              this._hasStarted = true;
              this.play();
            }
            if (this.config.behavior.pauseOnInvisibility) {
              if (this.config.behavior.autoStart && !this._isCentered && !this._isManuallyPaused) {
                this.root.classList.remove('um-paused');
              }
            }
          } else {
            if (this.config.behavior.pauseOnInvisibility) {
              this.root.classList.add('um-paused');
            }
          }
        });
      },
      { rootMargin: '50px' }
    );
    io.observe(this.root);
    this._observers.push(io);
  }

  // --- DOM HELPERS ---

  #appendContent(parent, content) {
    if (content === null || content === undefined) return;
    if (Array.isArray(content) || content instanceof NodeList) {
      Array.from(content).forEach((item) => this.#appendContent(parent, item));
      return;
    }
    if (content instanceof Node) {
      parent.appendChild(content.cloneNode(true));
      return;
    }
    parent.insertAdjacentHTML('beforeend', String(content));
  }

  #createItem(data, idx, renderer, wrapperClass) {
    const el = document.createElement('div');
    el.className = 'um-item';
    if (wrapperClass) el.classList.add(wrapperClass);

    let safeRenderer = typeof renderer === 'function' ? renderer : (d) => String(d);
    try {
      const content = safeRenderer(data, idx);
      this.#appendContent(el, content);
    } catch (e) {
      console.error('UniversalMarquee: Error rendering item', e);
      el.textContent = 'Error';
    }

    if (this.config.performance.lazyLoad) {
      const imgs = el.querySelectorAll('img');
      imgs.forEach((img) => {
        img.setAttribute('loading', 'lazy');
        img.onload = () => {
          if (this._resizeTimer) clearTimeout(this._resizeTimer);
          // Debounce rebuild
          this._resizeTimer = setTimeout(() => {
             this.#buildDOM(); 
             this.#syncCSS();
          }, 100);
        };
      });
    }

    if (this.config.callbacks.onItemClick) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', (e) => {
        if (this.config.physics.draggable && this._drag.hasMoved) return;
        this.config.callbacks.onItemClick(data, idx, e);
      });
    }
    return el;
  }

  #createSeparator(content) {
    const el = document.createElement('span');
    el.className = 'um-separator';
    el.setAttribute('aria-hidden', 'true');
    this.#appendContent(el, content);
    return el;
  }

  #markAsClone(frag) {
    const childs = frag.children ? Array.from(frag.children) : [frag];
    childs.forEach((c) => {
      c.setAttribute('aria-hidden', 'true');
      c.setAttribute('data-clone', 'true');
    });
  }

  #sanitizeIds(node) {
    if (node.id) node.removeAttribute('id');
    node.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
  }

  #shuffleItems() {
    const items = this.config.content.items;
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }

  async #waitForAssets() {
    if (this.config.performance.lazyLoad) return Promise.resolve();
    
    const imgs = Array.from(this.root.querySelectorAll('img'));
    const imgPromises = imgs.map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((r) => {
          img.onload = r;
          img.onerror = r;
        });
    });

    // FIX: Gunakan Promise.race untuk Fonts agar tidak hang selamanya
    const fontPromise = document.fonts ? document.fonts.ready : Promise.resolve();
    const timeoutPromise = new Promise(r => setTimeout(r, 2000)); // Max wait 2s

    await Promise.all([
        Promise.all(imgPromises),
        Promise.race([fontPromise, timeoutPromise])
    ]);
  }
}