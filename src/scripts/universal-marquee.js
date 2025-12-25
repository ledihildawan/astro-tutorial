class ContentBuilder {
  constructor(options) {
    this._opts = options;
  }

  #buildSeparatorNode(separator) {
    if (!separator) return null;
    const el = document.createElement('span');
    el.className = 'um-item-separator';
    el.setAttribute('aria-hidden', 'true');

    if (typeof separator === 'string') {
      el.insertAdjacentHTML('beforeend', separator);
    } else if (separator instanceof Node) {
      el.appendChild(separator.cloneNode(true));
    } else {
      el.textContent = String(separator);
    }
    return el;
  }

  buildCycleContent(forSR = false, addTrailingSeparator = true) {
    const frag = document.createDocumentFragment();
    const items = this._opts.items || [];

    items.forEach((item, i) => {
      if (forSR) {
        const li = document.createElement('li');
        li.textContent = item.alt || item.text || item;
        frag.appendChild(li);
      } else {
        let node = this._opts.renderItem(item, i);
        if (!(node instanceof Element)) {
          const wrapper = document.createElement('span');
          wrapper.appendChild(node);
          node = wrapper;
        }

        // Membersihkan ID duplikat untuk validitas DOM & performa selector
        const nodesWithId = node.querySelectorAll('[id]');
        nodesWithId.forEach((el) => el.removeAttribute('id'));
        node.setAttribute('tabindex', '-1');
        frag.appendChild(node);

        if (i < items.length - 1 || (addTrailingSeparator && i === items.length - 1)) {
          const sep = this.#buildSeparatorNode(this._opts.separator);
          if (sep) frag.appendChild(sep);
        }
      }
    });
    return frag;
  }
}

class UniversalMarquee {
  constructor(selector, opts = {}) {
    this._root = document.querySelector(selector);
    if (!this._root) return;

    this._opts = {
      speed: 50,
      gap: '2rem',
      direction: 'left',
      items: [],
      separator: '',
      renderItem: (item) => {
        const span = document.createElement('span');
        span.textContent = String(item);
        return span;
      },
      pauseOnHover: true,
      ...opts,
    };

    this._builder = new ContentBuilder(this._opts);
    this._controller = new AbortController();
    this._animation = null;

    this.#setup();
  }

  #setup() {
    const gapValue = typeof this._opts.gap === 'number' ? `${this._opts.gap}px` : this._opts.gap;

    // GPU Acceleration & Isolation
    this._root.style.contain = 'layout paint size';
    this._root.classList.add('um-container');

    this._track = document.createElement('div');
    this._track.className = 'um-track';
    this._track.style.setProperty('--um-gap', gapValue);

    this._root.appendChild(this._track);
    this.#renderContent();
    this.#initEvents();
  }

  #renderContent() {
    this._track.innerHTML = '';
    const set1 = this._builder.buildCycleContent(false, true);
    const set2 = set1.cloneNode(true);

    this._track.appendChild(set1);
    this._track.appendChild(set2);

    // Initial animation trigger
    requestAnimationFrame(() => this.#updateAnimation());
  }

  #updateAnimation() {
    const trackWidth = this._track.scrollWidth;
    const duration = trackWidth / 2 / this._opts.speed;

    const keyframes = [
      { transform: 'translate3d(0, 0, 0)' },
      { transform: `translate3d(calc(-50% - (var(--um-gap) / 2)), 0, 0)` },
    ];

    if (this._animation) {
      // Update keyframes secara smooth jika sudah ada animasi berjalan
      this._animation.effect.setKeyframes(keyframes);
      this._animation.effect.updateTiming({ duration: duration * 1000 });
    } else {
      this._animation = this._track.animate(keyframes, {
        duration: duration * 1000,
        iterations: Infinity,
        easing: 'linear',
      });
      if (this._opts.direction === 'right') this._animation.reverse();
    }
  }

  #initEvents() {
    // Penggunaan ResizeObserver yang lebih efisien
    let resizeTimer;
    const resizer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeTimer);
      resizeTimer = requestAnimationFrame(() => this.#updateAnimation());
    });

    resizer.observe(this._root);

    if (this._opts.pauseOnHover) {
      const { signal } = this._controller;
      // Performa: Menggunakan event listener yang pasif jika memungkinkan
      this._root.addEventListener('mouseenter', () => this._animation?.pause(), { signal });
      this._root.addEventListener('mouseleave', () => this._animation?.play(), { signal });
    }
  }

  destroy() {
    this._controller.abort();
    if (this._animation) this._animation.cancel();
    this._root.innerHTML = '';
  }
}

window.UniversalMarquee = UniversalMarquee;
