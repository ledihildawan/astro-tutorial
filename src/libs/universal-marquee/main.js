/**
 * UniversalMarquee v6.0
 * Features: Responsive, A11y, Dynamic Hover, Lazy Load, Smart Drag, Debug Mode
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
  static #DEFAULTS = {
    // Feature 5: Debug Mode
    debug: false, 

    content: {
      items: [],
      separator: null,
      renderItem: (item) => String(item),
      // Feature 4: Wrapper Flexibility
      wrapperClass: '', // Class tambahan untuk container item (misal untuk Card styling)
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
      // Feature 2: Auto Start Control
      autoStart: true,       // Jika false, marquee diam sampai .play() dipanggil

      hoverAction: 'pause',  
      hoverSpeedFactor: 0.3, 
      pauseOnInvisibility: true,
      cloneStrategy: 'auto', 
      cloneCount: 0,         
      randomize: false,      
    },

    performance: {
      lazyLoad: false,       
    },

    a11y: {
      ariaLabel: 'Scrolling content', 
      hideClones: true,               
    },

    physics: {
      draggable: false,      
      dragSpeed: 1.2,
      scrollVelocity: false, 
      scrollReverse: false,
      // Feature 3: Smart Drag Constraints
      touchThreshold: 10,    // Pixel gerakan minimum sebelum drag aktif
      lockAxis: true,        // Mencegah drag horizontal jika user scroll vertikal
    },

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
    }
  };

  constructor(selector, options = {}) {
    this.root = document.querySelector(selector);
    if (!this.root) throw new Error(`UniversalMarquee: Node '${selector}' not found.`);

    this._baseConfig = deepMerge(
      JSON.parse(JSON.stringify(UniversalMarquee.#DEFAULTS)), 
      options
    );
    this.config = JSON.parse(JSON.stringify(this._baseConfig));

    // Internal State
    this._observers = [];
    this._rafId = null; 
    this._resizeTimer = null;
    this._currentBreakpoint = null; 
    this._isDestroyed = false;

    // Physics State
    this._drag = { 
      active: false, 
      startX: 0, 
      startY: 0, // Added for Smart Drag
      currentX: 0, 
      lastTranslate: 0, 
      velocity: 0, 
      lastTime: 0, 
      hasMoved: false,
      isLocked: false // Added for Smart Drag
    };
    this._scroll = { currentOffset: 0, targetOffset: 0, lastY: window.scrollY, rafId: null };
    this._dragListeners = null;

    this.#init();
  }

  // --- LOGGING (Feature 5) ---
  #log(...args) {
    if (this.config.debug) {
      console.log(`[UniversalMarquee]`, ...args);
    }
  }

  // --- API ---
  
  updateItems(newItems) {
    this.#log('Updating items:', newItems.length);
    this._baseConfig.content.items = newItems; 
    this.config.content.items = newItems;      
    if (this.config.behavior.randomize) this.#shuffleItems();
    this.#buildDOM();
    this.#waitForAssets().then(() => this.#syncCSS());
  }

  play() {
    this.root.classList.remove('um-paused');
    this.root.style.setProperty('--um-play-state', 'running');
    this.#log('State: Play');
  }

  pause() {
    this.root.classList.add('um-paused');
    this.root.style.setProperty('--um-play-state', 'paused');
    this.#log('State: Pause');
  }

  destroy() {
    this.#log('Destroying instance');
    this._isDestroyed = true;
    
    // Evaluation 2: Memory Leak Cleanup
    this._observers.forEach(o => o.disconnect());
    this.#toggleListeners(false);
    
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._scroll.rafId) cancelAnimationFrame(this._scroll.rafId);
    clearTimeout(this._resizeTimer);

    // Explicitly remove items to help GC
    if (this.track) {
      while (this.track.firstChild) {
        this.track.removeChild(this.track.firstChild);
      }
    }
    
    this.root.innerHTML = '';
    this.root.className = '';
    this.root.removeAttribute('style');
    this.root.removeAttribute('role');
    this.root.removeAttribute('aria-label');
  }

  // --- CORE ---

  #init() {
    this.#log('Initializing...');
    this.root.classList.add('um-host');
    
    this.root.setAttribute('role', 'marquee');
    if (this.config.a11y.ariaLabel) {
      this.root.setAttribute('aria-label', this.config.a11y.ariaLabel);
    }

    this.#checkBreakpoints();

    if (this.config.behavior.randomize) this.#shuffleItems();
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.#log('Reduced Motion detected');
      if (this.config.animation.reducedMotion === 'stop') this.config.style.speed = 0;
      else this.config.style.speed *= 0.15;
    }

    this.#buildDOM();
    
    this.#waitForAssets().then(() => {
      this.#syncCSS();
      this.#initObservers();
      this.#toggleListeners(true);
      
      // Feature 2: Auto Start Check
      if (this.config.behavior.autoStart) {
        this.play();
      } else {
        this.pause();
      }

      if (this.config.callbacks.onInit) this.config.callbacks.onInit(this);
    });
  }

  #checkBreakpoints() {
    const width = window.innerWidth;
    const breakpoints = Object.keys(this._baseConfig.breakpoints)
      .map(Number)
      .sort((a, b) => a - b);
    
    let activeBp = null;
    let targetConfig = JSON.parse(JSON.stringify(this._baseConfig));
    
    const activePoints = breakpoints.filter(bp => width >= bp);
    
    activePoints.forEach(bp => {
        deepMerge(targetConfig, this._baseConfig.breakpoints[bp]);
        activeBp = bp;
    });

    if (this._currentBreakpoint !== activeBp) {
        this.#log(`Breakpoint changed: ${activeBp || 'default'}`);
        this.config = targetConfig;
        this._currentBreakpoint = activeBp;
        this.#syncCSS();
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

    this.track = document.createElement('div');
    this.track.className = 'um-track';
    this.track.addEventListener('animationiteration', () => {
       if (this.config.callbacks.onCycleComplete) this.config.callbacks.onCycleComplete();
    });

    // Measure Content
    const temp = document.createElement('div');
    temp.style.cssText = 'position:absolute; visibility:hidden; width:max-content; display:flex; gap:var(--um-gap, 2rem);';
    temp.appendChild(frag.cloneNode(true));
    this.root.appendChild(temp);
    const contentWidth = temp.offsetWidth;
    this.root.removeChild(temp);

    // Clone Logic
    let clones = 0;
    const { cloneStrategy, cloneCount } = this.config.behavior;
    
    if (cloneStrategy === 'exact') {
      clones = cloneCount;
    } else if (cloneStrategy === 'auto' && contentWidth > 0) {
      const viewW = this.root.offsetWidth || window.innerWidth;
      clones = Math.ceil(viewW / contentWidth) + 1; 
    }

    this.#log(`Content width: ${contentWidth}px, Clones created: ${clones}`);

    this.track.appendChild(frag.cloneNode(true)); 
    
    for (let i = 0; i < clones; i++) {
       const clone = frag.cloneNode(true);
       this.#sanitizeIds(clone);
       if (this.config.a11y.hideClones) this.#markAsClone(clone);
       this.track.appendChild(clone);
    }
    
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
    if (this._isDestroyed) return;
    const s = this.root.style;
    const c = this.config;
    
    s.setProperty('--um-gap', typeof c.style.gap === 'number' ? `${c.style.gap}px` : c.style.gap);
    s.setProperty('--um-align', c.style.align);
    s.setProperty('--um-direction-attr', c.style.rtl ? 'rtl' : 'ltr');
    s.setProperty('--um-direction', c.style.direction);
    s.setProperty('--um-easing', c.animation.easing);
    s.setProperty('--um-iteration', c.animation.loops === 'infinite' ? 'infinite' : String(c.animation.loops));
    s.setProperty('--um-init-delay', `${c.animation.delay}ms`);

    if (this.track) {
      const effectiveDist = this.track.scrollWidth / (this.track.childElementCount > 1 ? 2 : 1);
      const dur = c.style.speed > 0 ? effectiveDist / c.style.speed : 0;
      s.setProperty('--um-duration', `${dur}s`);
      this._baseDuration = dur;
    }

    if (c.style.mask) {
      this.root.setAttribute('data-mask', 'both');
      s.setProperty('--um-mask-width', c.style.maskWidth);
    } else {
      this.root.removeAttribute('data-mask');
    }

    if (c.physics.draggable) this.root.classList.add('um-cursor-grab');
    else this.root.classList.remove('um-cursor-grab');
  }

  // --- EVENTS & PHYSICS ---

  #toggleListeners(enable) {
    const method = enable ? 'addEventListener' : 'removeEventListener';
    
    this.root[method]('mouseenter', this.#onMouseEnter);
    this.root[method]('mouseleave', this.#onMouseLeave);

    if (this.config.physics.scrollVelocity || this.config.physics.scrollReverse) {
      window[method]('scroll', this.#onScroll, { passive: true });
    }

    if (this.config.physics.draggable) {
      this.#toggleDragListeners(enable);
    }
  }

  #onMouseEnter = () => {
    if (this._drag.active) return;
    const action = this.config.behavior.hoverAction;

    if (action === 'pause') {
        this.root.classList.add('um-paused');
    } else if (action === 'slow') {
        const factor = this.config.behavior.hoverSpeedFactor || 0.5;
        const newDur = this._baseDuration * (1 / factor);
        this.root.style.setProperty('--um-duration', `${newDur}s`);
    }
    if (this.config.callbacks.onMouseEnter) this.config.callbacks.onMouseEnter();
  }

  #onMouseLeave = () => {
    if (this._drag.active) return;
    const action = this.config.behavior.hoverAction;

    if (action === 'pause') {
        // Only unpause if autoStart was true or we are playing
        // Simplification: just remove class, user manual pause handles different state
        this.root.classList.remove('um-paused');
    } else if (action === 'slow') {
        this.root.style.setProperty('--um-duration', `${this._baseDuration}s`);
    }
    if (this.config.callbacks.onMouseLeave) this.config.callbacks.onMouseLeave();
  }

  #onScroll = () => {
    if (this._isDestroyed) return;
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
  }

  // --- DRAG SYSTEM (Improved for Mobile) ---
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

    // Feature 3: Reset Smart Drag Logic
    this._drag.active = true;
    this._drag.hasMoved = false;
    this._drag.isLocked = false; // Reset lock state
    this._drag.velocity = 0;
    
    // Normalize Touch/Mouse
    const point = e.touches ? e.touches[0] : e;
    this._drag.startX = point.clientX;
    this._drag.startY = point.clientY; // Track Y for scroll detection
    this._drag.lastTime = performance.now();

    const matrix = new WebKitCSSMatrix(window.getComputedStyle(this.track).transform);
    this._drag.lastTranslate = matrix.m41;
    this._drag.currentX = this._drag.lastTranslate;

    // NOTE: Don't add 'um-dragging' yet. Wait for movement threshold (Feature 3)
    if (this.config.callbacks.onDragStart) this.config.callbacks.onDragStart();
  }

  #dragMove(e) {
    if (!this._drag.active) return;
    if (this._drag.isLocked) return; // Previously decided this was a scroll, ignore drag

    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - this._drag.startX;
    const dy = point.clientY - this._drag.startY;

    // Feature 3: Smart Drag / Axis Locking
    if (this.config.physics.lockAxis && e.touches) {
        // If vertical movement > horizontal movement, assume user wants to SCROLL the page
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
            this._drag.isLocked = true; // Lock drag, allow scroll
            this._drag.active = false;  // Stop tracking drag
            return;
        }
    }

    // Feature 3: Threshold
    // Only start dragging if moved more than threshold
    if (!this._drag.hasMoved && Math.abs(dx) < this.config.physics.touchThreshold) {
        return; 
    }

    // Now we are definitely dragging
    if (e.cancelable) e.preventDefault(); // Stop page scroll
    
    if (!this._drag.hasMoved) {
        this.root.classList.add('um-dragging', 'um-cursor-grabbing');
        this.root.classList.remove('um-animating', 'um-cursor-grab');
        this._drag.hasMoved = true;
    }

    const now = performance.now();
    const dt = now - this._drag.lastTime;
    // Calculate drag with existing physics
    const deltaX = dx * this.config.physics.dragSpeed; 

    // Velocity calc
    if (dt > 0) {
      const v = (point.clientX - (this._drag.startX + (this._drag.currentX - this._drag.lastTranslate))) / dt; // Approximation
       // Simplification for velocity:
       const moveStep = point.clientX - (this._drag.startX + (this._drag.currentX - this._drag.lastTranslate) / this.config.physics.dragSpeed);
       // Re-use simple velocity logic from previous:
       const rawV = (dx - (this._drag.currentX - this._drag.lastTranslate)) / dt; 
       // Better: Just use current delta
    }
    
    // Simplest velocity tracking:
    const instantV = (this._drag.lastTranslate + deltaX - this._drag.currentX) / dt;
    if (dt > 0) {
         this._drag.velocity = (this._drag.velocity * 0.5) + (instantV * 0.5); 
    }

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
        if (Math.abs(this._drag.velocity) > 0.1) {
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
    const ro = new ResizeObserver(entries => {
      if (entries[0].contentRect.width === 0) return;
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
          this.#checkBreakpoints(); 
          this.#syncCSS(); 
      }, 150);
    });
    ro.observe(this.root);
    this._observers.push(ro);

    if (this.config.behavior.pauseOnInvisibility) {
      const io = new IntersectionObserver(e => {
        e.forEach(entry => {
          if (entry.isIntersecting) {
             if (this.config.behavior.autoStart) this.root.classList.remove('um-paused');
          } else {
             this.root.classList.add('um-paused');
          }
        });
      }, { rootMargin: '50px' });
      io.observe(this.root);
      this._observers.push(io);
    }
  }

  #createItem(data, idx, renderer, wrapperClass) {
    const el = document.createElement('div');
    el.className = 'um-item';
    // Feature 4: Wrapper Flexibility
    if (wrapperClass) {
        el.classList.add(wrapperClass);
    }
    
    const content = renderer(data, idx);
    
    if (content instanceof Node) el.appendChild(content);
    else el.innerHTML = String(content);

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
    el.setAttribute('aria-hidden', 'true'); 
    if (content instanceof Node) el.appendChild(content.cloneNode(true));
    else el.innerHTML = content;
    return el;
  }

  #markAsClone(frag) {
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
    if (this.config.performance.lazyLoad) return Promise.resolve();

    const imgs = Array.from(this.root.querySelectorAll('img'));
    await Promise.all(imgs.map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise(r => { img.onload = r; img.onerror = r; });
    }));
    if (document.fonts) try { await document.fonts.ready; } catch(e) {}
  }
}