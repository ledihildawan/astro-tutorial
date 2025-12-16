// src/lib/universal-marquee.ts

export interface ImageSeparator {
  type: 'image';
  src: string;
  alt?: string;
}

export type Separator = string | Node | ImageSeparator;

export type MarqueeItem = any;

export interface UniversalMarqueeOptions {
  speed?: number;
  gap?: string | number;
  direction?: 'left' | 'right';
  items: MarqueeItem[];
  separator?: Separator;
  renderItem?: (item: MarqueeItem) => Node | Element;
}

class ContentBuilder {
  private _opts: Required<UniversalMarqueeOptions>;

  constructor(options: UniversalMarqueeOptions) {
    this._opts = {
      speed: 50,
      gap: '2rem',
      direction: 'left',
      items: [],
      separator: '',
      renderItem: (i) => document.createTextNode(String(i)),
      ...options,
    };
  }

  #buildSeparatorNode(separator: Separator): HTMLElement {
    const sepContainer = document.createElement('span');
    sepContainer.classList.add('um-item-separator');
    sepContainer.setAttribute('aria-hidden', 'true');

    if (typeof separator === 'string') {
      sepContainer.textContent = separator;
    } else if (separator instanceof Node) {
      sepContainer.appendChild(separator.cloneNode(true));
    } else if (typeof separator === 'object' && separator.type === 'image') {
      const wrapper = document.createElement('div');
      wrapper.className = 'um-img-skeleton';

      const img = document.createElement('img');
      img.src = separator.src;
      img.alt = separator.alt || '';
      img.loading = 'lazy';

      const handleLoad = () => img.classList.add('loaded');
      img.onload = handleLoad;
      if (img.complete) handleLoad();

      wrapper.appendChild(img);
      sepContainer.appendChild(wrapper);
    }

    return sepContainer;
  }

  buildCycleContent(forSR = false): DocumentFragment {
    const frag = document.createDocumentFragment();
    const items = this._opts.items;

    if (!items || items.length === 0) return frag;

    for (const item of items) {
      if (forSR) {
        const li = document.createElement('li');
        li.textContent = (item as any).alt || String(item);
        frag.appendChild(li);
      } else {
        let node = this._opts.renderItem(item);

        if (!(node instanceof Element || node instanceof Text)) {
          const w = document.createElement('span');
          w.appendChild(node as Node);
          node = w;
        }

        const cloned = node.cloneNode(true) as Element;

        const img = cloned.querySelector('img');
        if (img) {
          if (img.complete) img.classList.add('loaded');
          else img.onload = () => img.classList.add('loaded');
        }

        if (cloned.id) cloned.removeAttribute('id');
        cloned.querySelectorAll('*').forEach((el) => {
          if (el.id) el.removeAttribute('id');
          el.setAttribute('tabindex', '-1');
        });

        frag.appendChild(cloned);

        const sep = this.#buildSeparatorNode(this._opts.separator);
        if (sep) frag.appendChild(sep);
      }
    }

    return frag;
  }

  buildCycleContainer(): HTMLElement {
    const c = document.createElement('div');
    c.appendChild(this.buildCycleContent(false));
    return c;
  }

  buildSRList(): HTMLElement {
    const ul = document.createElement('ul');
    ul.className = 'um-sr-only';
    ul.appendChild(this.buildCycleContent(true));
    return ul;
  }

  measureCycleMetrics(root: HTMLElement): { width: number; gap: number } {
    if (!this._opts.items || this._opts.items.length === 0) return { width: 0, gap: 0 };

    const temp = document.createElement('div');
    temp.className = 'um-track';
    Object.assign(temp.style, { position: 'absolute', visibility: 'hidden' });

    let gapVal = this._opts.gap;
    if (typeof gapVal === 'number') gapVal = `${gapVal}px`;
    temp.style.setProperty('--um-gap', gapVal);

    const cycle = this.buildCycleContainer();
    temp.appendChild(cycle);
    root.appendChild(temp);

    const width = cycle.offsetWidth || 0;
    const style = getComputedStyle(temp);
    let parsedGap = parseFloat(style.columnGap || style.gap || '0');
    if (isNaN(parsedGap)) parsedGap = 0;

    root.removeChild(temp);

    return { width, gap: parsedGap };
  }
}

class AnimationController {
  private _track: HTMLElement;
  private _opts: Required<UniversalMarqueeOptions>;
  private _anim: Animation | null = null;

  constructor(track: HTMLElement, opts: Required<UniversalMarqueeOptions>) {
    this._track = track;
    this._opts = opts;
  }

  start(width: number, gap: number): void {
    if (this._anim) this._anim.cancel();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const safeWidth = Number.isFinite(width) ? width : 0;
    const safeGap = Number.isFinite(gap) ? gap : 0;
    const safeSpeed = this._opts.speed > 0 ? this._opts.speed : 50;

    const dist = safeWidth + safeGap;
    if (dist <= 0) return;

    const duration = (dist / safeSpeed) * 1000;

    let from = 'translate3d(0,0,0)';
    let to = `translate3d(-${dist}px,0,0)`;

    if (this._opts.direction === 'right') {
      from = `translate3d(-${dist}px,0,0)`;
      to = 'translate3d(0,0,0)';
    }

    this._anim = this._track.animate([{ transform: from }, { transform: to }], {
      duration,
      iterations: Infinity,
      easing: 'linear',
    });
  }

  pause(): void {
    if (this._anim && this._anim.playState === 'running') {
      this._anim.pause();
    }
  }

  play(): void {
    if (this._anim && this._anim.playState !== 'running') {
      this._anim.play();
    }
  }
}

export class UniversalMarquee {
  private _root: HTMLElement;
  private _opts: Required<UniversalMarqueeOptions>;
  private _builder: ContentBuilder;
  private _track!: HTMLElement;
  private _anim!: AnimationController;
  private _resizeTimer?: number;
  private _observer?: IntersectionObserver;
  private _isInViewport = false;

  constructor(selector: string, opts: UniversalMarqueeOptions = {}) {
    const root = document.querySelector(selector);
    if (!root) throw new Error(`Element ${selector} not found`);
    this._root = root as HTMLElement;

    this._opts = {
      speed: 50,
      gap: '2rem',
      direction: 'left',
      items: [],
      separator: '',
      renderItem: (i) => document.createTextNode(String(i)),
      ...opts,
    };

    this._root.classList.add('um-container');

    this._builder = new ContentBuilder(this._opts);

    this.#setup();
    this.#initObservers();
  }

  #setup(): void {
    this._root.innerHTML = '';
    this._track = document.createElement('div');
    this._track.className = 'um-track';
    this._track.setAttribute('aria-hidden', 'true');

    this._root.appendChild(this._builder.buildSRList());
    this._root.appendChild(this._track);

    this.#reflow();
  }

  #reflow(): void {
    const m = this._builder.measureCycleMetrics(this._root);
    if (m.width === 0) return;

    const cycles = Math.ceil(this._root.offsetWidth / (m.width + m.gap)) + 2;

    this._track.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < Math.max(3, cycles); i++) {
      frag.appendChild(this._builder.buildCycleContainer());
    }
    this._track.appendChild(frag);

    this._anim = new AnimationController(this._track, this._opts);
    this._anim.start(m.width, m.gap);
  }

  #initObservers(): void {
    const resizeHandler = () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        requestAnimationFrame(() => this.#reflow());
      }, 200);
    };

    new ResizeObserver(resizeHandler).observe(this._root);

    if ('IntersectionObserver' in window) {
      this._observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            this._isInViewport = entry.isIntersecting;
            if (entry.isIntersecting) {
              if (!document.hidden) this._anim.play();
            } else {
              this._anim.pause();
            }
          });
        },
        { rootMargin: '50px 0px' }
      );
      this._observer.observe(this._root);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._anim.pause();
      } else if (this._isInViewport) {
        this._anim.play();
      }
    });
  }

  public pause(): void {
    this._anim.pause();
  }

  public play(): void {
    this._anim.play();
  }

  public reflow(): void {
    this.#reflow();
  }

  public destroy(): void {
    this._anim?.pause();
    this._observer?.disconnect();
    clearTimeout(this._resizeTimer);
    this._root.innerHTML = '';
    this._root.classList.remove('um-container');
  }
}
