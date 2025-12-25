/**
 * UniversalMarquee v2.2
 * Features: Mobile First Responsive, Hot-Swap, Auto-Reverse (PingPong)
 */
export class UniversalMarquee {
  static #DEFAULTS = {
    // Physics & Timing
    speed: 50, // px per second
    gap: '2rem',
    direction: 'normal', // 'normal' | 'reverse'
    delay: 0, // ms
    
    // NEW FEATURE v2.2: Ping-Pong Mode
    autoReverse: false, // true = bounce back and forth (good for long text)

    // Interaction
    pauseOnHover: true,
    pauseOnClick: false,

    // Visuals
    mask: true,
    maskWidth: '5%',

    // Responsive (Mobile First / Min-Width)
    responsive: {}, 

    // Data
    items: [],
    separator: null,
    renderItem: (item) => document.createTextNode(String(item)),
  };

  constructor(selector, options = {}) {
    this.root = document.querySelector(selector);
    if (!this.root) throw new Error(`UniversalMarquee: Node '${selector}' not found.`);

    this.userOptions = options;
    this.config = { ...UniversalMarquee.#DEFAULTS, ...options };
    
    this._observers = [];
    this._resizeTimer = null;
    this._isManualPaused = false;
    
    this.#init();
  }

  // --- Public API ---

  updateItems(newItems) {
    this.config.items = newItems;
    this.#buildDOM(); // Rebuild structure
    this.#waitForAssets().then(() => this.#syncPhysics());
  }

  pause() {
    this._isManualPaused = true;
    this.root.style.setProperty('--um-play-state', 'paused');
  }

  play() {
    this._isManualPaused = false;
    this.root.style.setProperty('--um-play-state', 'running');
  }

  set direction(val) {
    this.config.direction = val;
    this.root.style.setProperty('--um-direction', val);
  }

  set speed(pxPerSecond) {
    this.config.speed = pxPerSecond;
    this.#syncPhysics();
  }

  destroy() {
    this._observers.forEach(obs => obs.disconnect());
    this.root.classList.remove('um-host', 'um-pause-hover', 'um-pause-click', 'um-no-mask', 'um-mode-reverse');
    this.root.style = '';
    this.root.innerHTML = '';
  }

  // --- Core Lifecycle ---

  #init() {
    this.root.classList.add('um-host');
    this.#evaluateResponsive(); 
    this.#buildDOM();
    
    this.#waitForAssets().then(() => {
      this.#syncPhysics();
      this.#attachObservers();
    });
  }

  #buildDOM() {
    // Stage 1: Create Item Fragment
    const singleSet = document.createDocumentFragment();
    this.config.items.forEach((item, index) => {
      const node = this.#createItemNode(item, index);
      singleSet.appendChild(node);
      
      if (this.config.separator) {
        singleSet.appendChild(this.#createSeparatorNode());
      }
    });

    this.track = document.createElement('div');
    this.track.className = 'um-track';

    // --- LOGIC BRANCH: Auto Reverse vs Infinite Loop ---
    if (this.config.autoReverse) {
        // MODE A: Auto Reverse (Ping-Pong)
        // Tidak perlu cloning ganda. Cukup render apa adanya.
        this.root.classList.add('um-mode-reverse');
        this.track.appendChild(singleSet.cloneNode(true));
    } else {
        // MODE B: Infinite Loop (Standard)
        this.root.classList.remove('um-mode-reverse');

        // Measure Context
        const tempContainer = document.createElement('div');
        tempContainer.style.cssText = 'position:absolute; visibility:hidden; width:max-content; display:flex; gap:var(--um-gap);';
        tempContainer.appendChild(singleSet.cloneNode(true));
        this.root.appendChild(tempContainer);
        
        const contentWidth = tempContainer.offsetWidth;
        const viewportWidth = this.root.offsetWidth || window.innerWidth;
        this.root.removeChild(tempContainer);

        if (contentWidth > 0) {
            // Fill Screen + Clone A & B
            const coverageNeeded = Math.ceil(viewportWidth / contentWidth) + 1;
            const filledContent = document.createDocumentFragment();
            for (let i = 0; i < coverageNeeded; i++) filledContent.appendChild(singleSet.cloneNode(true));

            const groupA = document.createElement('div');
            groupA.style.display = 'flex';
            groupA.style.gap = 'var(--um-gap)';
            groupA.appendChild(filledContent.cloneNode(true));
            
            const groupB = groupA.cloneNode(true);
            this.#sanitizeIds(groupB);

            this.track.appendChild(groupA);
            this.track.appendChild(groupB);
        }
    }
    
    this.root.innerHTML = '';
    this.root.appendChild(this.track);
  }

  #syncPhysics() {
    if (!this.track) return;

    let distanceToTravel = 0;

    if (this.config.autoReverse) {
        // Physics: Bounce
        // Hitung selisih antara konten penuh dan lebar container
        const contentWidth = this.track.scrollWidth;
        const containerWidth = this.root.offsetWidth;

        if (contentWidth <= containerWidth) {
            // Jika konten lebih kecil dari layar, tidak perlu gerak
            distanceToTravel = 0;
            this.root.style.setProperty('--um-bounce-dist', '0px');
        } else {
            distanceToTravel = contentWidth - containerWidth;
            this.root.style.setProperty('--um-bounce-dist', `${distanceToTravel}px`);
        }
    } else {
        // Physics: Infinite Loop
        // Jarak tempuh adalah setengah dari total track (karena diduplikasi)
        distanceToTravel = this.track.scrollWidth / 2;
    }
    
    // Set Duration
    if (distanceToTravel <= 0) {
         this.root.style.setProperty('--um-duration', '0s');
    } else {
         const duration = distanceToTravel / this.config.speed;
         this.root.style.setProperty('--um-duration', `${duration}s`);
    }
  }

  #evaluateResponsive() {
    const width = window.innerWidth;
    
    // Mobile First Logic: Start with base, stack changes
    let targetConfig = { ...UniversalMarquee.#DEFAULTS, ...this.userOptions };

    if (this.userOptions.responsive) {
        const breakpoints = Object.keys(this.userOptions.responsive)
            .map(Number)
            .sort((a, b) => a - b);

        for (const bp of breakpoints) {
            if (width >= bp) {
                targetConfig = { ...targetConfig, ...this.userOptions.responsive[bp] };
            }
        }
    }

    // Jika mode berubah drastis (misal responsive menyalakan autoReverse),
    // kita perlu rebuild DOM. Cek flag sebelum update.
    const modeChanged = this.config.autoReverse !== targetConfig.autoReverse;
    this.config = targetConfig;
    
    this.#applyConfigStyles();
    
    if (modeChanged) {
        this.#buildDOM();
    }
    this.#syncPhysics();
  }

  #applyConfigStyles() {
    this.root.style.setProperty('--um-delay', `${this.config.delay}ms`);
    
    if (this.config.mask) {
      this.root.classList.remove('um-no-mask');
      this.root.style.setProperty('--um-mask-width', this.config.maskWidth);
    } else {
      this.root.classList.add('um-no-mask');
    }

    this.root.classList.toggle('um-pause-hover', this.config.pauseOnHover);
    this.root.classList.toggle('um-pause-click', this.config.pauseOnClick);

    this.root.style.setProperty('--um-gap', this.#parseGap(this.config.gap));
    this.root.style.setProperty('--um-direction', this.config.direction);
  }

  // --- Helpers ---

  #createItemNode(item, index) {
    // 1. Dapatkan hasil dari renderItem (bisa String atau Element)
    let content = this.config.renderItem(item, index);
    let node;

    // 2. Cek tipe datanya
    if (content instanceof Element) {
      // Jika user me-return document.createElement(...)
      node = content;
    } else {
      // Jika user me-return String HTML atau Teks biasa
      // Kita bungkus dengan div (atau span) dan gunakan innerHTML
      node = document.createElement('div');
      node.innerHTML = String(content);
      
      // Opsional: Jika wrapper menghasilkan extra spacing, atur display
      // node.style.display = 'contents'; // Hati-hati browser support
    }

    // 3. Tambahkan class wajib library
    node.classList.add('um-item');
    return node;
  }

  #createSeparatorNode() {
    const sep = document.createElement('span');
    sep.className = 'um-separator';
    if (this.config.separator instanceof Node) {
      sep.appendChild(this.config.separator.cloneNode(true));
    } else {
      sep.innerHTML = this.config.separator;
    }
    return sep;
  }

  #sanitizeIds(node) {
    if (node.id) node.removeAttribute('id');
    if (node.querySelectorAll) {
      node.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    }
  }

  #parseGap(gap) {
    return typeof gap === 'number' ? `${gap}px` : gap;
  }

  async #waitForAssets() {
    const images = Array.from(this.root.querySelectorAll('img'));
    if (images.length === 0) return;
    const promises = images.map(img => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    });
    await Promise.all(promises);
  }

  #attachObservers() {
    const io = new IntersectionObserver((entries) => {
      if (this._isManualPaused) return;
      const isVisible = entries[0].isIntersecting;
      this.root.style.setProperty('--um-play-state', isVisible ? 'running' : 'paused');
    }, { threshold: 0.01 });
    io.observe(this.root);
    this._observers.push(io);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      if (width === 0) return;

      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
         this.#evaluateResponsive();
      }, 150);
    });
    ro.observe(this.root);
    this._observers.push(ro);
  }
}