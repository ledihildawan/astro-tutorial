import { UniversalMarquee } from '../../libs/universal-marquee/main';

// Code examples for documentation
const codeExamples = {
  testimonials: {
    html: `<div id="demo-testimonials"></div>`,
    css: `/* Elegant testimonial card styling */
.testimonial-card {
  background: rgba(30, 41, 59, 0.8);
  padding: 1.8rem;
  border-radius: 28px;
  width: 400px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(34, 211, 238, 0.15);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
  color: #f8fafc;
}`,
    js: `// Build social proof with customer reviews
const reviews = [
  { 
    name: "Sarah Jenkins", 
    handle: "@sarah_dev", 
    avatar: "https://i.pravatar.cc/150?u=sarah", 
    text: "Zero dependencies with silky smooth performance. The new standard for marquees!", 
    stars: 5 
  }
  // Add more customer feedback...
];

new UniversalMarquee("#demo-testimonials", {
  content: {
    items: reviews,
    renderItem: (item) => {
      const card = document.createElement("div");
      card.className = "testimonial-card";
      card.innerHTML = \`
        <div style="margin-bottom:1.2rem; font-style:italic; color:#e0f2fe; line-height:1.6;">"\${item.text}"</div>
        <div style="display:flex; align-items:center; gap:1rem;">
          <img src="\${item.avatar}" alt="\${item.name}" style="width:52px; height:52px; border-radius:50%; border: 2px solid #22d3ee;">
          <div>
            <strong style="display:block; font-size:1.1rem; color:#fff;">\${item.name}</strong>
            <span style="color:#94a3b8; font-size:0.9rem;">\${item.handle}</span>
          </div>
        </div>
      \`;
      return card;
    }
  },
  style: { speed: 30, gap: "3rem" },
  behavior: { hoverAction: 'pause' }
});`,
  },
  products: {
    html: `<div id="demo-products"></div>`,
    js: `// Display product galleries with full control
const images = [
  { img: "https://www.mdpabel.com/md-pabel.png", alt: "Side view", label: "Front Profile" },
  { img: "https://www.mdpabel.com/md-pabel.png", alt: "Top view", label: "Visual Showcase" }
  // Add your high-quality visual assets...
];

new UniversalMarquee("#demo-products", {
  content: {
    items: images,
    renderItem: (item) => {
      const card = document.createElement("div");
      card.className = "product-view-card";
      card.style.cssText = "width:420px; height:280px; border-radius:24px; overflow:hidden; position:relative;";
      card.innerHTML = \`
        <img src="\${item.img}" alt="\${item.alt}" loading="lazy" style="width:100%; height:100%; object-fit:cover;">
        <div style="position:absolute; bottom:20px; left:20px; background:rgba(15, 23, 42, 0.85); backdrop-filter:blur(10px); padding:8px 22px; border-radius:50px; color:#fff; font-weight:600; border: 1px solid rgba(255,255,255,0.15);">\${item.label}</div>
      \`;
      return card;
    }
  },
  style: { speed: 40, gap: "1.5rem" },
  physics: { draggable: true }
});`,
  },
  ticker: {
    html: `<div id="demo-ticker"></div>`,
    js: `// Keep users informed with dynamic content flow
const updates = [
  { label: "MARKET", val: "NVDA", change: "+1.2%", up: true },
  { label: "SYSTEM", val: "All nodes operational", change: "100%", up: true },
  { label: "NEWS", val: "Marquee v9.0 Polished Edition", change: "NEW", up: true }
];

new UniversalMarquee("#demo-ticker", {
  content: {
    items: updates,
    separator: '<span style="color:rgba(34, 211, 238, 0.3); padding: 0 1rem;"> • </span>',
    renderItem: (item) => {
      const el = document.createElement("div");
      el.style.cssText = "display:flex; align-items:center; gap:1.2rem; background:rgba(30, 41, 59, 0.4); padding:0.8rem 1.5rem; border-radius:14px; white-space:nowrap; border:1px solid rgba(34,211,238,0.1);";
      const color = item.up ? "#34d399" : "#f87171";
      el.innerHTML = \`
        <span style="font-weight:700; color:#94a3b8; font-size:0.75rem; letter-spacing:0.1em;">\${item.label}</span>
        <span style="font-weight:600; color:#f1f5f9;">\${item.val}</span>
        <span style="font-weight:800; color:\${color}; font-size:0.85rem;">\${item.change}</span>
      \`;
      return el;
    }
  },
  style: { speed: 70, mask: true }
});`,
  },
};

// Initialize app and marquees
const initApp = () => {
  const ICONS = {
    twitter: `<svg class="t-icon icon-twitter" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417a9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>`,
    linkedin: `<svg class="t-icon icon-linkedin" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
    ph: `<svg class="t-icon icon-ph" viewBox="0 0 24 24"><path d="M13.6,8.4h-3.4v7.2h3.4c2,0,3.6-1.6,3.6-3.6S15.6,8.4,13.6,8.4z M12,24C5.4,24,0,18.6,0,12S5.4,0,12,0 s12,5.4,12,12S18.6,24,12,24z M13.6,6h-5.8v12h2.4v-2.4h3.4c3.3,0,6-2.7,6-6S16.9,6,13.6,6z"/></svg>`,
  };

  const features = [
    'Seamless infinite horizontal marquee',
    'Automatic dynamic cycle duplication',
    'Speed-based scrolling or fixed duration',
    'Configurable scrolling direction',
    'Customizable gap between items',
    'Flexible separator support',
    'Custom renderItem function',
    'Built-in lazy loading',
    'Dynamic gradient overlay',
    'Pause on hover, focus, and touch',
    'Automatic play/pause based on visibility',
    'Prefers-reduced-motion support',
    'Full accessibility (ARIA/SR)',
    'Web Animations API performance',
    'Zero dependencies',
    'Fully responsive',
  ];

  // Main features marquee
  const mainMarquee = new UniversalMarquee('#features', {
    style: {
      speed: 45,
      gap: 0,
      direction: 'normal',
    },
    content: {
      items: features,
      separator: ' 🎊 ',
      renderItem: (text) => {
        const span = document.createElement('span');
        span.textContent = text;
        return span;
      },
    },
    behavior: {
      hoverAction: 'pause',
      startWhenVisible: true,
    },
  });

  const reviews = [
    {
      id: 1,
      name: 'Sarah Jenkins',
      handle: '@sarah_dev',
      role: 'Frontend Lead',
      company: 'Vercel',
      companyLogo: 'https://assets.vercel.com/image/upload/v1588805858/repositories/vercel/logo.png',
      avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d',
      text: 'This marquee library is an absolute game-changer. The performance on mobile is silky smooth.',
      source: 'twitter',
      stars: 5,
      date: '2h ago',
    },
    {
      id: 2,
      name: 'Michael Chen',
      handle: '@mchen_design',
      role: 'Product Designer',
      company: 'Figma',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg',
      avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d',
      text: "Finally, a marquee solution that doesn't break accessibility standards. Reduced-motion is spot on.",
      source: 'linkedin',
      stars: 5,
      date: '5h ago',
    },
    {
      id: 3,
      name: 'Alex Rivera',
      handle: '@arivera',
      role: 'CTO',
      company: 'Stripe',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/Stripe_Logo%2C_revised_2016.svg',
      avatar: 'https://i.pravatar.cc/150?u=a04258114e29026302d',
      text: 'We implemented this on our landing page and saw a 15% increase in engagement.',
      source: 'ph',
      stars: 4,
      date: '1d ago',
    },
    {
      id: 4,
      name: 'Emily Watson',
      handle: '@emily_w',
      role: 'DevRel',
      company: 'Supabase',
      companyLogo: 'https://pipedream.com/s.v0/app_1dBhP3/logo/orig',
      avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d2',
      text: 'Zero dependencies and just pure Vanilla JS? Sign me up. It fits perfectly into our lightweight tech stack.',
      source: 'twitter',
      stars: 5,
      date: '2d ago',
    },
    {
      id: 5,
      name: 'David Kim',
      handle: '@dkim_code',
      role: 'Senior Eng',
      company: 'Netflix',
      companyLogo: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg',
      avatar: 'https://i.pravatar.cc/150?u=a04258a2462d826712d',
      text: 'The dynamic duplication logic is smart. No more awkward jumps when the content loops.',
      source: 'linkedin',
      stars: 5,
      date: '3d ago',
    },
  ];

  // Customer testimonials marquee
  const testimonialMarquee = new UniversalMarquee('#demo-testimonials', {
    content: {
      items: reviews,
      renderItem: (item) => {
        const div = document.createElement('div');
        div.className = 'testimonial-card';
        const sourceIcon = ICONS[item.source] || ICONS.twitter;
        const companyDisplay = item.companyLogo
          ? `<img src="${item.companyLogo}" alt="${item.company}" class="t-logo-img" loading="lazy" />`
          : `<strong>${item.company}</strong>`;

        div.innerHTML = `
          <div class="t-header">
            <div class="t-avatar"><img src="${item.avatar}" alt="${item.name}" loading="lazy" /></div>
            <div class="t-profile">
              <div class="t-name-row">
                <span class="t-name">${item.name}</span>
                <svg class="t-verified" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .495.083.965.238 1.4-1.272.65-2.147 2.02-2.147 3.6 0 1.435.716 2.696 1.813 3.396-.105.41-.16.837-.16 1.28 0 2.682 2.126 4.87 4.793 4.87.585 0 1.135-.11 1.644-.305.65 1.127 1.875 1.905 3.286 1.905 1.41 0 2.635-.778 3.286-1.9.51.196 1.058.305 1.644.305 2.667 0 4.793-2.19 4.793-4.87 0-.443-.056-.87-.16-1.28C21.784 15.196 22.5 13.935 22.5 12.5zm-5.694-2.11L10.82 16.377l-3.655-3.655.858-.853 2.797 2.797 5.128-5.128.858.853z"/></path></svg>
              </div>
              <span class="t-handle">${item.handle}</span>
              <div class="t-role-company">${item.role} at ${companyDisplay}</div>
            </div>
          </div>
          <div class="t-body">"${item.text}"</div>
          <div class="t-footer">
            <div class="t-source">${sourceIcon} <span>${item.date}</span></div>
            <div class="t-stars">${'★'.repeat(item.stars)}</div>
          </div>`;
        return div;
      },
    },
    style: {
      speed: 25,
      gap: '3rem',
      direction: 'normal',
    },
    behavior: {
      hoverAction: 'pause',
      startWhenVisible: true,
      centerIfShort: true,
    },
  });

  const products = [
    {
      view: 'Side Profile',
      img: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/3bbecbdf584e40398446a8bf0117cf62_9366/Samba_OG_Shoes_White_B75806_01_00_standard.jpg',
      alt: 'Adidas Samba OG - Side',
    },
    {
      view: 'Perspective',
      img: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/8c4158c4c39a4ab09b8ba8c000c96fd0_9366/Samba_OG_Shoes_White_B75806_01_01_standard.jpg',
      alt: 'Adidas Samba OG - Angled',
    },
    {
      view: 'Medial Side',
      img: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/ec595635a2994adea094a8bf0117ef1a_9366/Samba_OG_Shoes_White_B75806_02_standard.jpg',
      alt: 'Adidas Samba OG - Medial',
    },
    {
      view: 'Top-Down',
      img: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/97cd0902ae2e402b895aa8bf0117f98f_9366/Samba_OG_Shoes_White_B75806_03_standard.jpg',
      alt: 'Adidas Samba OG - Top',
    },
    {
      view: 'Outsole',
      img: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/07567ea7d2bb425b8651a8bf0117e4f1_9366/Samba_OG_Shoes_White_B75806_06_standard.jpg',
      alt: 'Adidas Samba OG - Sole',
    },
    {
      view: 'On-Foot',
      img: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/671c62b81c3448e980aca8bf01181a93_9366/Samba_OG_Shoes_White_B75806_41_detail.jpg',
      alt: 'Adidas Samba OG - Lifestyle',
    },
  ];

  // Product gallery marquee with drag support
  const productsMarquee = new UniversalMarquee('#demo-products', {
    content: {
      items: products,
      renderItem: (item, index) => {
        const div = document.createElement('div');
        div.className = 'product-view-card um-img-skeleton';
        div.innerHTML = `
          <div class="view-label">View ${String(index + 1).padStart(2, '0')}</div>
          <img src="${item.img}" 
               alt="${item.alt}" 
               width="420" 
               height="280" 
               loading="lazy"
               style="display: block; width: 100%; height: auto;">
          <div class="product-info-overlay">
            <span>Samba OG</span>
            <h4>${item.view}</h4>
          </div>`;
        return div;
      },
    },
    style: {
      speed: 35,
      gap: '2rem',
      mask: 'both',
      maskWidth: '10%',
      direction: 'reverse',
    },
    behavior: {
      autoStart: true,
      startWhenVisible: true,
      cloneStrategy: 'auto',
    },
    physics: {
      draggable: true,
      snap: { enabled: true, friction: 0.1 },
    },
    performance: {
      lazyLoad: true,
    },
  });

  const stocks = [
    {
      sym: 'BTC',
      name: 'Bitcoin',
      val: '96,420',
      diff: '3,840',
      change: '4.2',
      up: true,
      trend: [10, 30, 25, 50, 45, 80, 75],
    },
    {
      sym: 'ETH',
      name: 'Ethereum',
      val: '3,124',
      diff: '34',
      change: '1.1',
      up: false,
      trend: [80, 70, 85, 60, 50, 40, 30],
    },
    {
      sym: 'SOL',
      name: 'Solana',
      val: '242.1',
      diff: '18.4',
      change: '8.4',
      up: true,
      trend: [5, 20, 40, 35, 70, 85, 95],
    },
    {
      sym: 'NVDA',
      name: 'Nvidia',
      val: '145.2',
      diff: '0.6',
      change: '0.4',
      up: true,
      trend: [40, 45, 42, 55, 50, 60, 65],
    },
  ];

  // Ticker marquee
  const tickerMarquee = new UniversalMarquee('#demo-ticker', {
    content: {
      items: stocks,
      renderItem: (item) => {
        const div = document.createElement('div');
        div.className = `god-tier-card ${item.up ? 'is-up' : 'is-down'}`;
        const points = item.trend.map((val, i) => `${i * 18},${100 - val}`).join(' ');
        div.innerHTML = `
        <div class="card-ambient-glow"></div>
        <div class="card-edge"></div>
        <div class="card-main">
          <div class="card-top">
            <div class="brand">
              <div class="symbol-icon">${item.sym[0]}</div>
              <div class="symbol-meta">
                <span class="sym-text">${item.sym}</span>
                <span class="full-name">${item.name}</span>
              </div>
            </div>
            <div class="status-pill">${item.up ? 'BULLISH' : 'BEARISH'}</div>
          </div>
          <div class="card-bottom">
            <div class="price-info">
              <span class="current-price">$${item.val}</span>
              <span class="price-diff">${item.up ? '+' : '-'}$${item.diff}</span>
            </div>
            <div class="visual-trend">
              <svg class="mini-chart" viewBox="0 0 120 100" preserveAspectRatio="none">
                <path d="M ${points}" fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <span class="percentage-label">${item.up ? '↑' : '↓'} ${item.change}%</span>
            </div>
          </div>
        </div>`;
        return div;
      },
    },
    style: {
      speed: 40,
      gap: '3rem',
    },
    physics: {
      scrollSync: { enabled: true, factor: 2.0 },
    },
  });

  // Resync after all assets load
  window.addEventListener('load', () => {
    setTimeout(() => {
      mainMarquee.updateItems(features);
      testimonialMarquee.updateItems(reviews);
      productsMarquee.updateItems(products);
      tickerMarquee.updateItems(stocks);
    }, 500);
  });
};

// UI handling for code viewers (browser-only)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // Initialize code examples
    document.querySelectorAll('.code-viewer').forEach((viewer) => {
      const id = viewer.id.replace('code-', '');
      const data = codeExamples[id];
      if (!data) return;

      const htmlEl = viewer.querySelector('[data-tab="html"] code');
      const jsEl = viewer.querySelector('[data-tab="js"] code');
      const cssEl = viewer.querySelector('[data-tab="css"] code');
      const cssTab = viewer.querySelector('[data-tab="css"]');

      if (htmlEl && data.html) htmlEl.textContent = data.html;
      if (jsEl && data.js) jsEl.textContent = data.js;
      if (cssEl && data.css) cssEl.textContent = data.css;
      else if (cssTab) cssTab.style.display = 'none';
    });

    // Syntax highlight code blocks
    document.querySelectorAll('.code-panel code, code.inline-code').forEach((block) => {
      if (typeof hljs !== 'undefined') hljs.highlightElement(block);
    });

    // Code viewer toggle
    document.querySelectorAll('.code-toggle-btn').forEach((btn) => {
      const span = btn.querySelector('span');
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        const newState = !expanded;
        btn.setAttribute('aria-expanded', newState);
        span.textContent = newState ? 'Hide Implementation' : 'View Implementation';
        const viewer = document.getElementById(btn.getAttribute('aria-controls'));
        if (viewer) viewer.classList.toggle('open', newState);
      });
    });

    // Code tab switching
    document.querySelectorAll('.code-viewer').forEach((viewer) => {
      const tabs = viewer.querySelectorAll('.code-tab');
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.tab;
          tabs.forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          viewer.querySelectorAll('.code-panel').forEach((p) => p.classList.remove('active'));
          const panel = viewer.querySelector(`.code-panel[data-tab="${target}"]`);
          if (panel) panel.classList.add('active');
        });
      });

      // Copy to clipboard
      const copyBtn = viewer.querySelector('.copy-tab-btn');
      if (copyBtn) {
        const defaultIcon = copyBtn.innerHTML;
        copyBtn.addEventListener('click', async () => {
          const codeEl = viewer.querySelector('.code-panel.active code');
          if (!codeEl) return;
          try {
            await navigator.clipboard.writeText(codeEl.textContent.trim());
            copyBtn.innerHTML =
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          } catch (err) {
            copyBtn.innerHTML =
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/></svg>';
          }
          setTimeout(() => {
            copyBtn.innerHTML = defaultIcon;
          }, 2000);
        });
      }
    });

    // Initialize app
    initApp();
  });
} else {
  console.warn('UniversalMarquee docs script skipped: window/document not available.');
}
