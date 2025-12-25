/**
 * UniversalMarquee v5.1
 * Features: Responsive, A11y, Dynamic Hover, Lazy Load
 */

function deepMerge(target, source) {
  if (!source) return target;
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export class UniversalMarquee {
  // --- UPDATED DEFAULT CONFIG ---
  static #DEFAULTS = {
    content: {
      items: [],
      separator: null,
      renderItem: (item) => String(item),
    },
    
    style: {
      speed: 50,             
      gap: '2rem',
      direction: 'normal',   
      align: 'center',       
      rtl: false,
      mask: true,
      maskWidth: '5%',
    },

    animation: {
      delay: 0,              
      loops: 'infinite',     
      easing: 'linear',      
      reducedMotion: 'stop', 
    },

    behavior: {
      hoverAction: 'pause',  // Feature D: 'pause' | 'slow' | 'none'
      hoverSpeedFactor: 0.3, // Used if hoverAction is 'slow' (0.3 = 30% speed)
      pauseOnInvisibility: true,
      cloneStrategy: 'auto', 
      cloneCount: 0,         
      randomize: false,      
    },

    // Feature E: Performance
    performance: {
      lazyLoad: false,       // Enable loading="lazy" on images
    },

    // Feature C: Accessibility
    a11y: {
      ariaLabel: 'Scrolling content', // Label for screen readers
      hideClones: true,               // Hides duplicate items from screen readers
    },

    physics: {
      draggable: false,      
      dragSpeed: 1.2,
      scrollVelocity: false, 
      scrollReverse: false,  
    },

    // Feature B: Responsive Breakpoints
    // Format: { 768: { style: { speed: 30 } } }
    breakpoints: {},

    callbacks: {
      onInit: () => {},
      onCycleComplete: () => {},
      onItemClick: () => {},
      onDragStart: () => {},
      onDragEnd: () => {},
      onMouseEnter: () => {}, 
      onMouseLeave: () => {}, 
      onBreakpointChange: () => {}, // New Callback
    }
  };

  constructor(selector, options = {}) {
    this.root = document.querySelector(selector);
    if (!this.root) throw new Error(`UniversalMarquee: Node '${selector}' not found.`);

    // Store base config to allow resetting before applying breakpoints
    this._baseConfig = deepMerge(
      JSON.parse(JSON.stringify(UniversalMarquee.#DEFAULTS)), 
      options
    );
    
    // Active config starts as base
    this.config = JSON.parse(JSON.stringify(this._baseConfig));

    // Internal State
    this._observers = [];
    this._rafId = null; 
    this._resizeTimer = null;
    this._scrollListener = null;
    this._currentBreakpoint = null; // Track active breakpoint

    // Physics State
    this._drag = { active: false, startX: 0, currentX: 0, lastTranslate: 0, velocity: 0, lastTime: 0, hasMoved: false };
    this._scroll = { currentOffset: 0, targetOffset: 0, lastY: window.scrollY, rafId: null };
    this._dragListeners = null;

    this.#init();
  }

  // --- API ---
  
  updateItems(newItems) {
    this._baseConfig.content.items = newItems; // Update base
    this.config.content.items = newItems;      // Update active
    if (this.config.behavior.randomize) this.#shuffleItems();
    this.#buildDOM();
    this.#waitForAssets().then(() => this.#syncCSS());
  }

  play() {
    this.root.classList.remove('um-paused');
    this.root.style.setProperty('--um-play-state', 'running');
  }

  pause() {
    this.root.classList.add('um-paused');
    this.root.style.setProperty('--um-play-state', 'paused');
  }

  destroy() {
    this._observers.forEach(o => o.disconnect());
    this.#toggleListeners(false);
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._scroll.rafId) cancelAnimationFrame(this._scroll.rafId);
    this.root.innerHTML = '';
    this.root.className = '';
    this.root.removeAttribute('style');
  }

  // --- CORE ---

  #init() {
    this.root.classList.add('um-host');
    
    // Feature C: A11y Base
    this.root.setAttribute('role', 'marquee');
    if (this.config.a11y.ariaLabel) {
      this.root.setAttribute('aria-label', this.config.a11y.ariaLabel);
    }

    // Feature B: Initial Breakpoint Check
    this.#checkBreakpoints();

    if (this.config.behavior.randomize) this.#shuffleItems();
    
    // Check Reduced Motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (this.config.animation.reducedMotion === 'stop') this.config.style.speed = 0;
      else this.config.style.speed *= 0.15;
    }

    this.#buildDOM();
    
    this.#waitForAssets().then(() => {
      this.#syncCSS();
      this.#initObservers();
      this.#toggleListeners(true);
      if (this.config.callbacks.onInit) this.config.callbacks.onInit(this);
    });
  }

  // Feature B: Breakpoint Logic
  #checkBreakpoints() {
    const width = window.innerWidth;
    const breakpoints = Object.keys(this._baseConfig.breakpoints)
      .map(Number)
      .sort((a, b) => a - b);
    
    let activeBp = null;

    // Find the largest matching breakpoint (mobile-first approach logic)
    // Or logic: "Apply if width >= bp". Let's assume standard min-width logic.
    // However, usually overrides are specific. Let's use: Closest match less than width?
    // Let's stick to standard: keys are 'max-width' or 'min-width'? 
    // Let's assume keys are MAX-WIDTH (desktop-first) or MIN-WIDTH. 
    // Implementation: Matches exact or closest lower/upper.
    // Simple approach: Last key that is <= width is the winner? 
    // Let's go with: Apply all configurations where window.innerWidth <= breakpoint (Mobile First override? No, usually Desktop First).
    // Let's use: Keys are 'min-width'.
    
    // Let's implement simpler: Exact Override based on largest match <= window width.
    let targetConfig = JSON.parse(JSON.stringify(this._baseConfig));
    
    // Filter active breakpoints (min-width logic)
    // e.g. 768: applies if width >= 768.
    const activePoints = breakpoints.filter(bp => width >= bp);
    
    // Merge sequentially
    activePoints.forEach(bp => {
        deepMerge(targetConfig, this._baseConfig.breakpoints[bp]);
        activeBp = bp;
    });

    // Check if changed
    if (this._currentBreakpoint !== activeBp) {
        this.config = targetConfig;
        this._currentBreakpoint = activeBp;
        this.#syncCSS(); // Apply new styles/speed
        // Only rebuild DOM if strictly necessary (e.g. content change), otherwise CSS handles gap/speed.
        if (this.config.callbacks.onBreakpointChange) this.config.callbacks.onBreakpointChange(activeBp);
    }
  }

  #buildDOM() {
    const { items, separator, renderItem } = this.config.content;
    const frag = document.createDocumentFragment();

    items.forEach((item, idx) => {
      frag.appendChild(this.#createItem(item, idx, renderItem));
      if (separator) frag.appendChild(this.#createSeparator(separator));
    });

    this.track = document.createElement('div');
    this.track.className = 'um-track';
    this.track.addEventListener('animationiteration', () => {
       if (this.config.callbacks.onCycleComplete) this.config.callbacks.onCycleComplete();
    });

    // Measure Content
    const temp = document.createElement('div');
    temp.style.cssText = 'position:absolute; visibility:hidden; width:max-content; display:flex; gap:var(--um-gap);';
    temp.appendChild(frag.cloneNode(true));
    this.root.appendChild(temp);
    const contentWidth = temp.offsetWidth;
    this.root.removeChild(temp);

    // Feature 6: Clone Strategy
    let clones = 0;
    const { cloneStrategy, cloneCount } = this.config.behavior;
    
    if (cloneStrategy === 'exact') {
      clones = cloneCount;
    } else if (cloneStrategy === 'auto' && contentWidth > 0) {
      const viewW = this.root.offsetWidth || window.innerWidth;
      clones = Math.ceil(viewW / contentWidth) + 1; // +1 for safety
    }

    // Append Original
    this.track.appendChild(frag.cloneNode(true)); 
    
    // Append Clones with A11y Handling
    for (let i = 0; i < clones; i++) {
       const clone = frag.cloneNode(true);
       this.#sanitizeIds(clone);
       // Feature C: Hide clones
       if (this.config.a11y.hideClones) {
           this.#markAsClone(clone);
       }
       this.track.appendChild(clone);
    }
    
    // Infinite Loop Fix
    if (this.config.animation.loops === 'infinite' && cloneStrategy !== 'none') {
       const loopSet = frag.cloneNode(true);
       this.#sanitizeIds(loopSet);
       if (this.config.a11y.hideClones) this.#markAsClone(loopSet);
       this.track.appendChild(loopSet);
    }

    this.root.innerHTML = '';
    this.root.appendChild(this.track);
    this.root.classList.add('um-animating');
  }

  #syncCSS() {
    const s = this.root.style;
    const c = this.config;
    
    // Layout
    s.setProperty('--um-gap', typeof c.style.gap === 'number' ? `${c.style.gap}px` : c.style.gap);
    s.setProperty('--um-align', c.style.align);
    s.setProperty('--um-direction-attr', c.style.rtl ? 'rtl' : 'ltr');
    
    // Animation
    s.setProperty('--um-direction', c.style.direction);
    s.setProperty('--um-easing', c.animation.easing);
    s.setProperty('--um-iteration', c.animation.loops === 'infinite' ? 'infinite' : String(c.animation.loops));
    s.setProperty('--um-init-delay', `${c.animation.delay}ms`);

    // Speed Calculation
    if (this.track) {
      const dist = this.track.scrollWidth / (this.track.childElementCount > 1 ? 2 : 1); // Approx single set width
      // Better distance calc if we know clones, but relying on scrollWidth is safer for CSS animation logic
      // Note: CSS Animation '100%' moves by 50% of track width usually in these tricks.
      // Let's stick to previous logic:
      const effectiveDist = this.track.scrollWidth / 2; // Assuming at least 1 clone set exists
      const dur = c.style.speed > 0 ? effectiveDist / c.style.speed : 0;
      
      s.setProperty('--um-duration', `${dur}s`);
      // Feature D: Store base duration for calculations
      this._baseDuration = dur;
    }

    // Visuals
    if (c.style.mask) {
      this.root.setAttribute('data-mask', 'both');
      s.setProperty('--um-mask-width', c.style.maskWidth);
    } else {
      this.root.removeAttribute('data-mask');
    }

    if (c.physics.draggable) this.root.classList.add('um-cursor-grab');
  }

  // --- EVENTS & PHYSICS ---

  #toggleListeners(enable) {
    const method = enable ? 'addEventListener' : 'removeEventListener';
    
    // Hover
    this.root[method]('mouseenter', this.#onMouseEnter);
    this.root[method]('mouseleave', this.#onMouseLeave);

    // Scroll
    if (this.config.physics.scrollVelocity || this.config.physics.scrollReverse) {
      window[method]('scroll', this.#onScroll, { passive: true });
    }

    // Drag
    if (this.config.physics.draggable) {
      this.#toggleDragListeners(enable);
    }
  }

  // Feature D: Dynamic Hover Action
  #onMouseEnter = () => {
    if (this._drag.active) return;
    const action = this.config.behavior.hoverAction;

    if (action === 'pause') {
        this.root.classList.add('um-paused');
    } else if (action === 'slow') {
        // Calculate slower duration
        const factor = this.config.behavior.hoverSpeedFactor || 0.5;
        // If speed factor is 0.5, duration should trigger 2x (1/0.5)
        const newDur = this._baseDuration * (1 / factor);
        this.root.style.setProperty('--um-duration', `${newDur}s`);
    }

    if (this.config.callbacks.onMouseEnter) this.config.callbacks.onMouseEnter();
  }

  #onMouseLeave = () => {
    if (this._drag.active) return;
    const action = this.config.behavior.hoverAction;

    if (action === 'pause') {
        this.root.classList.remove('um-paused');
    } else if (action === 'slow') {
        // Reset duration
        this.root.style.setProperty('--um-duration', `${this._baseDuration}s`);
    }

    if (this.config.callbacks.onMouseLeave) this.config.callbacks.onMouseLeave();
  }

  #onScroll = () => {
    const currentY = window.scrollY;
    const delta = currentY - this._scroll.lastY;
    this._scroll.lastY = currentY;

    if (this.config.physics.scrollVelocity) {
      this._scroll.targetOffset -= delta * 2;
      if (!this._scroll.rafId) this._scroll.rafId = requestAnimationFrame(this.#loopScrollBoost);
    }

    if (this.config.physics.scrollReverse && Math.abs(delta) > 2) {
      const baseDir = this.config.style.direction;
      const isDown = delta > 0;
      const newDir = isDown ? baseDir : (baseDir === 'normal' ? 'reverse' : 'normal');
      this.root.style.setProperty('--um-direction', newDir);
    }
  }

  #loopScrollBoost = () => {
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
  }

  // --- DRAG SYSTEM (Unchanged Logic, mostly) ---
  #toggleDragListeners(enable) {
    const method = enable ? 'addEventListener' : 'removeEventListener';
    if (!this._dragListeners) {
        this._dragListeners = {
            start: (e) => this.#dragStart(e),
            move: (e) => this.#dragMove(e),
            end: (e) => this.#dragEnd(e)
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
    if (e.button === 2) return;
    if (this._rafId) cancelAnimationFrame(this._rafId);

    this._drag.active = true;
    this._drag.hasMoved = false;
    this._drag.velocity = 0;
    this._drag.startX = e.touches ? e.touches[0].clientX : e.clientX;
    this._drag.lastTime = performance.now();

    const matrix = new WebKitCSSMatrix(window.getComputedStyle(this.track).transform);
    this._drag.lastTranslate = matrix.m41;
    this._drag.currentX = this._drag.lastTranslate;

    this.root.classList.add('um-dragging', 'um-cursor-grabbing');
    this.root.classList.remove('um-animating', 'um-cursor-grab');
    this.track.style.transform = `translate3d(${this._drag.currentX}px, 0, 0)`;

    if (this.config.callbacks.onDragStart) this.config.callbacks.onDragStart();
  }

  #dragMove(e) {
    if (!this._drag.active) return;
    e.preventDefault(); 
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const delta = (clientX - this._drag.startX) * this.config.physics.dragSpeed;
    const now = performance.now();
    const dt = now - this._drag.lastTime;

    if (dt > 0) {
      const v = delta / dt;
      this._drag.velocity = (this._drag.velocity * 0.5) + (v * 0.5); 
    }

    this._drag.currentX = this._drag.lastTranslate + delta;
    this.track.style.transform = `translate3d(${this._drag.currentX}px, 0, 0)`;
    this._drag.lastTime = now;
    if (Math.abs(delta) > 5) this._drag.hasMoved = true;
  }

  #dragEnd() {
    if (!this._drag.active) return;
    this._drag.active = false;

    this.root.classList.remove('um-dragging', 'um-cursor-grabbing');
    this.root.classList.add('um-cursor-grab');

    if (Math.abs(this._drag.velocity) > 0.1) {
      this.#momentumLoop();
    } else {
      this.#snapToCSS();
    }
    if (this.config.callbacks.onDragEnd) this.config.callbacks.onDragEnd();
  }

  #momentumLoop() {
    this._drag.velocity *= 0.95; 
    this._drag.currentX += this._drag.velocity * 16;
    this.track.style.transform = `translate3d(${this._drag.currentX}px, 0, 0)`;

    if (Math.abs(this._drag.velocity) < 0.01) {
      this.#snapToCSS();
    } else {
      this._rafId = requestAnimationFrame(this.#momentumLoop.bind(this));
    }
  }

  #snapToCSS() {
    const loopLen = this.track.scrollWidth / (this.track.childElementCount > 1 ? 2 : 1);
    let norm = this._drag.currentX % loopLen;
    if (norm > 0) norm -= loopLen; 

    const progress = Math.abs(norm) / loopLen;
    const durationStr = getComputedStyle(this.root).getPropertyValue('--um-duration');
    const delay = -1 * progress * (parseFloat(durationStr) || 0);

    this.root.style.setProperty('--um-delay', `${delay}s`);
    this.track.style.transform = ''; 
    this.root.classList.add('um-animating');
  }

  // --- HELPERS ---

  #initObservers() {
    // Resize Observer with Debounce for Breakpoints
    const ro = new ResizeObserver(entries => {
      if (entries[0].contentRect.width === 0) return;
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
          this.#checkBreakpoints(); // Feature B
          this.#syncCSS(); // Ensure physics match new size
      }, 150);
    });
    ro.observe(this.root);
    this._observers.push(ro);

    if (this.config.behavior.pauseOnInvisibility) {
      const io = new IntersectionObserver(e => {
        e.forEach(entry => {
          if (entry.isIntersecting) this.root.classList.remove('um-paused');
          else this.root.classList.add('um-paused');
        });
      }, { rootMargin: '50px' });
      io.observe(this.root);
      this._observers.push(io);
    }
  }

  #createItem(data, idx, renderer) {
    const el = document.createElement('div');
    el.className = 'um-item';
    const content = renderer(data, idx);
    
    if (content instanceof Node) el.appendChild(content);
    else el.innerHTML = String(content);

    // Feature E: Lazy Load Injection
    if (this.config.performance.lazyLoad) {
        const imgs = el.querySelectorAll('img');
        imgs.forEach(img => {
            img.setAttribute('loading', 'lazy');
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
    // Separators are decorative, hide from A11y
    el.setAttribute('aria-hidden', 'true'); 
    if (content instanceof Node) el.appendChild(content.cloneNode(true));
    else el.innerHTML = content;
    return el;
  }

  #markAsClone(frag) {
      // Helper for Feature C
      const childs = frag.children ? Array.from(frag.children) : [frag];
      childs.forEach(c => {
          c.setAttribute('aria-hidden', 'true');
          c.setAttribute('data-clone', 'true');
      });
  }

  #sanitizeIds(node) {
    if (node.id) node.removeAttribute('id');
    node.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  }

  #shuffleItems() {
    const items = this.config.content.items;
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }

  async #waitForAssets() {
    // Feature E: If lazy loading, do NOT wait for images
    if (this.config.performance.lazyLoad) return Promise.resolve();

    const imgs = Array.from(this.root.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise(r => { img.onload = r; img.onerror = r; });
    }));
    if (document.fonts) try { await document.fonts.ready; } catch(e) {}
  }
}