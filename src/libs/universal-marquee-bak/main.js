/**
 * UniversalMarquee
 * Arsitektur: Stateless UI dengan Dynamic Velocity Calculation.
 */
export class UniversalMarquee {
  constructor(selector, options = {}) {
    this._node = document.querySelector(selector);
    if (!this._node) return;

    this._state = {
      speed: options.speed || 50, // pixels per second
      gap: options.gap || '2rem',
      direction: options.direction || 'normal',
      items: options.items || [],
      separator: options.separator || '',
      renderItem:
        options.renderItem ||
        ((item) => {
          const el = document.createElement('span');
          el.textContent = String(item);
          return el;
        }),
    };

    this._observers = new Set();
    this.#setupComponent();
  }

  /**
   * Mengatur nilai kecepatan secara dinamis tanpa re-inisialisasi DOM.
   * @param {number} value - Kecepatan dalam pixel per detik.
   */
  set speed(value) {
    this._state.speed = value;
    this.#computeAnimationMetrics();
  }

  #setupComponent() {
    this._node.classList.add('um-container');

    this._track = document.createElement('div');
    this._track.className = 'um-track';

    const gapValue = typeof this._state.gap === 'number' ? `${this._state.gap}px` : this._state.gap;
    this._node.style.setProperty('--um-gap', gapValue);
    this._node.style.setProperty('--um-direction', this._state.direction);

    this.#commitContentUpdate();
    this.#initializeObservers();
  }

  #commitContentUpdate() {
    const fragment = document.createDocumentFragment();
    const contentBuffer = document.createElement('div');
    contentBuffer.className = 'um-content-wrapper';

    this._state.items.forEach((item, idx) => {
      let itemNode = this._state.renderItem(item, idx);

      if (!(itemNode instanceof Element)) {
        const wrapper = document.createElement('span');
        wrapper.appendChild(itemNode);
        itemNode = wrapper;
      }

      // DOM Sanitization: Mencegah collision pada accessibility tree
      itemNode.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      if (itemNode.id) itemNode.removeAttribute('id');

      contentBuffer.appendChild(itemNode);

      if (this._state.separator) {
        const sepNode = document.createElement('span');
        sepNode.className = 'um-item-separator';
        sepNode.setAttribute('aria-hidden', 'true');

        if (this._state.separator instanceof Node) {
          sepNode.appendChild(this._state.separator.cloneNode(true));
        } else {
          sepNode.innerHTML = this._state.separator;
        }
        contentBuffer.appendChild(sepNode);
      }
    });

    // Mirroring content untuk seamless linear translation
    this._track.innerHTML = '';
    this._track.appendChild(contentBuffer);
    this._track.appendChild(contentBuffer.cloneNode(true));
    this._node.appendChild(this._track);
  }

  #initializeObservers() {
    // ResizeObserver: Menangani kalkulasi ulang durasi saat terjadi Layout Reflow
    const ro = new ResizeObserver(() => this.#computeAnimationMetrics());
    ro.observe(this._track);

    // IntersectionObserver: Mengoptimalkan pemrosesan GPU berdasarkan visibilitas viewport
    const io = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0].isIntersecting;
        this._node.style.setProperty('--um-play-state', isVisible ? 'running' : 'paused');
      },
      { threshold: 0.01 }
    );
    io.observe(this._node);

    this._observers.add(ro).add(io);
  }

  #computeAnimationMetrics() {
    // Formula: T = d / v (Time = Distance / Velocity)
    const halfWidth = this._track.scrollWidth / 2;
    const duration = halfWidth / this._state.speed;

    this._node.style.setProperty('--um-duration', `${duration}s`);
  }

  /**
   * Membersihkan instance dan memutuskan koneksi observers.
   */
  destroy() {
    this._observers.forEach((obs) => obs.disconnect());
    this._observers.clear();
    this._node.innerHTML = '';
  }
}
