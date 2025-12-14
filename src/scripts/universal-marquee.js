export default class UniversalMarquee {
  #root;
  #opts;
  #masterTrack = null;
  #currentDirection = 'left';
  #intersectionObserver;
  #resizeObserver;
  #resizeTimer = null;
  #isManuallyPaused = false;

  #handleFocusIn = this.#_handleFocusIn.bind(this);
  #handleFocusOut = this.#_handleFocusOut.bind(this);

  constructor(selector, options) {
    this.#root = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!this.#root) throw new Error('Element not found');

    const {
      duration = '15s',
      gap = '2rem',
      direction = 'left',
      items = [],
      separator = ' • ',
      renderItem = (item) => document.createTextNode(String(item)),
      a11yLabel = 'Berita terkini yang bergerak secara horizontal.',
    } = options;

    this.#opts = {
      duration,
      gap,
      direction,
      items,
      separator,
      renderItem,
      a11yLabel,
    };

    this.#currentDirection = direction === 'rtl' ? 'right' : direction;
    this.#root.dir = direction === 'rtl' ? 'rtl' : 'ltr';

    this.#init();
  }

  #init() {
    this.#root.classList.add('um-container');

    this.#root.setAttribute('role', 'marquee');
    this.#root.setAttribute('aria-label', this.#opts.a11yLabel);
    this.#root.setAttribute('aria-live', 'off');
    this.#root.setAttribute('tabindex', '0');

    this.#root.style.setProperty('--um-duration', this.#opts.duration);
    this.#root.style.setProperty('--um-gap', this.#opts.gap);

    this.#_setupContent();
    this.#_registerIntersectionObserver();
    this.#_registerResizeObserver();

    this.#root.addEventListener('focusin', this.#handleFocusIn);
    this.#root.addEventListener('focusout', this.#handleFocusOut);
  }

  #_setupContent() {
    this.#masterTrack = document.createElement('div');
    this.#masterTrack.className = 'um-track um-animate';
    this.#_applyDirection();
    this.#root.innerHTML = '';
    this.#root.appendChild(this.#masterTrack);
    requestAnimationFrame(this.#_fillScreen.bind(this));
  }

  #_applyDirection() {
    if (!this.#masterTrack) return;
    if (this.#currentDirection === 'right') {
      this.#masterTrack.classList.add('um-right');
    } else {
      this.#masterTrack.classList.remove('um-right');
    }
  }

  #_createCycle() {
    const frag = document.createDocumentFragment();

    const baseItemStyle = `
            font-size: var(--um-font-size); 
            font-weight: var(--um-font-weight); 
            color: var(--um-color-separator); 
            flex-shrink: 0; 
            white-space: nowrap;
            display: flex;
            align-items: center;
          `;
    const sepStyle = `
            color: var(--um-color-separator); 
            padding: 0 0.5rem; 
            flex-shrink: 0;
            display: flex;
            align-items: center;
            font-size: 0.9em;
          `;

    for (const item of this.#opts.items) {
      let node = this.#opts.renderItem(item);

      if (node instanceof Element) {
        node.style.cssText += baseItemStyle;
      } else {
        const wrapper = document.createElement('span');
        wrapper.style.cssText = baseItemStyle;
        wrapper.appendChild(node);
        node = wrapper;
      }

      frag.appendChild(node);

      if (this.#opts.separator) {
        const sep = document.createElement('span');
        sep.textContent = this.#opts.separator;
        sep.style.cssText = sepStyle;
        frag.appendChild(sep);
      }
    }
    return frag;
  }

  #_fillScreen() {
    if (!this.#masterTrack || this.#opts.items.length === 0) return;

    this.#root.classList.add('um-paused');
    this.#masterTrack.innerHTML = '';

    const temp = document.createElement('div');
    temp.className = 'um-track';
    Object.assign(temp.style, {
      position: 'absolute',
      visibility: 'hidden',
    });
    temp.style.setProperty('--um-gap', this.#opts.gap);
    const cycleContent = this.#_createCycle().cloneNode(true);
    temp.appendChild(cycleContent);

    this.#root.appendChild(temp);
    const cycleWidth = temp.offsetWidth;
    this.#root.removeChild(temp);

    if (cycleWidth === 0 || this.#opts.items.length === 0) return;

    let cycles = Math.ceil(this.#root.offsetWidth / cycleWidth) + 2;
    if (cycles < 3) cycles = 3;

    const content = document.createDocumentFragment();
    for (let i = 0; i < cycles; i++) {
      content.appendChild(this.#_createCycle().cloneNode(true));
    }

    this.#masterTrack.appendChild(content);
    this.#masterTrack.style.setProperty('--um-num-cycles', cycles);

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReduced) {
      requestAnimationFrame(() => this.#_updatePauseState(false));
    }
  }

  #_updatePauseState(isOffScreen) {
    const shouldBePaused =
      isOffScreen || this.#isManuallyPaused || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.#root.classList.toggle('um-paused', shouldBePaused);
  }

  #_registerIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    this.#root.classList.add('um-paused');
    this.#intersectionObserver = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries[0].isIntersecting;
        this.#_updatePauseState(!isIntersecting);
      },
      { threshold: 0 }
    );
    this.#intersectionObserver.observe(this.#root);
  }

  #_registerResizeObserver() {
    if (!('ResizeObserver' in window)) return;
    const resizeCallback = () => {
      if (this.#resizeTimer) {
        cancelAnimationFrame(this.#resizeTimer);
      }
      this.#resizeTimer = requestAnimationFrame(this.#_fillScreen.bind(this));
    };
    this.#resizeObserver = new ResizeObserver(resizeCallback);
    this.#resizeObserver.observe(this.#root);
  }

  #_handleFocusIn() {
    this.#isManuallyPaused = true;
    this.#root.classList.add('um-paused');
    this.#root.classList.add('um-focused');
    this.#root.setAttribute('aria-live', 'polite');
  }

  #_handleFocusOut() {
    this.#isManuallyPaused = false;
    this.#root.classList.remove('um-focused');
    this.#root.setAttribute('aria-live', 'off');

    // >>> PERBAIKAN KRITIS: Reset posisi scroll horizontal ke awal (0) <<<
    this.#root.scrollLeft = 0;

    this.#_updatePauseState(false);
  }
}
