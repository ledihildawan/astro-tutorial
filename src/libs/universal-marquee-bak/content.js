/**
 * CONTENT JAVASCRIPT
 * File: content.js
 * Deskripsi: Inisialisasi data dan instance Universal Marquee dengan struktur yang konsisten.
 */

import { UniversalMarquee } from './main';

// --- Helper Functions ---

/**
 * Membuat elemen pembungkus item marquee dengan class tertentu
 */
const createWrapper = (className = 'um-item-wrapper') => {
  const div = document.createElement('div');
  div.className = className;
  return div;
};

// --- Data & Configuration ---

const ICONS = {
  twitter: `<svg class="t-icon icon-twitter" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>`,
  linkedin: `<svg class="t-icon icon-linkedin" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  ph: `<svg class="t-icon icon-ph" viewBox="0 0 24 24"><path d="M13.6,8.4h-3.4v7.2h3.4c2,0,3.6-1.6,3.6-3.6S15.6,8.4,13.6,8.4z M12,24C5.4,24,0,18.6,0,12S5.4,0,12,0 s12,5.4,12,12S18.6,24,12,24z M13.6,6h-5.8v12h2.4v-2.4h3.4c3.3,0,6-2.7,6-6S16.9,6,13.6,6z"/></svg>`,
};

const features = [
  'Seamless infinite horizontal marquee', 'Automatic dynamic cycle duplication',
  'Speed-based scrolling or fixed duration', 'Configurable scrolling direction',
  'Customizable gap between items', 'Flexible separator support',
  'Custom renderItem function', 'Built-in lazy loading',
  'Dynamic gradient overlay', 'Pause on hover, focus, and touch',
  'Automatic play/pause based on visibility', 'Prefers-reduced-motion support',
  'Full accessibility (ARIA/SR)', 'Web Animations API performance',
  'Zero dependencies', 'Fully responsive',
];

const initApp = () => {
  
  // --- 1. Features Marquee (Fun & Colorful) ---
  new UniversalMarquee('#features', {
    speed: 45,
    gap: 0,
    items: features,
    separator: ' 🎊 ',
    renderItem: (text) => {
      const wrapper = createWrapper('um-item');
      wrapper.innerHTML = `<span>${text}</span>`;
      return wrapper;
    },
    pauseOnHover: true,
    ariaLabel: 'List of Universal Marquee key features',
    screenReader: true,
  });

  // --- 2. Testimonials Marquee (Social Proof) ---
  const reviews = [
    { name: 'Sarah Jenkins', handle: '@sarah_dev', role: 'Frontend Lead', company: 'Vercel', avatar: 'https://i.pravatar.cc/150?u=a1', text: 'This marquee library is an absolute game-changer. The performance on mobile is silky smooth.', source: 'twitter', stars: 5, date: '2h ago' },
    { name: 'Michael Chen', handle: '@mchen_design', role: 'Product Designer', company: 'Figma', avatar: 'https://i.pravatar.cc/150?u=a2', text: "Finally, a marquee solution that doesn't break accessibility standards. Reduced-motion is spot on.", source: 'linkedin', stars: 5, date: '5h ago' },
    { name: 'Alex Rivera', handle: '@arivera', role: 'CTO', company: 'Stripe', avatar: 'https://i.pravatar.cc/150?u=a3', text: 'We implemented this on our landing page and saw a 15% increase in engagement.', source: 'ph', stars: 4, date: '1d ago' },
  ];

  new UniversalMarquee('#demo-testimonials', {
    items: reviews,
    speed: 25,
    gap: '3rem',
    pauseOnHover: true,
    renderItem: (item) => {
      const div = createWrapper('testimonial-card');
      const sourceIcon = ICONS[item.source] || ICONS.twitter;
      div.innerHTML = `
        <div class="t-header">
          <div class="t-avatar"><img src="${item.avatar}" alt="${item.name}" loading="lazy" /></div>
          <div class="t-profile">
            <div class="t-name-row">
              <span class="t-name">${item.name}</span>
            </div>
            <span class="t-handle">${item.handle}</span>
            <div class="t-role-company">${item.role} at <strong>${item.company}</strong></div>
          </div>
        </div>
        <div class="t-body">"${item.text}"</div>
        <div class="t-footer">
          <div class="t-source">${sourceIcon} <span>${item.date}</span></div>
          <div class="t-stars">${'★'.repeat(item.stars)}</div>
        </div>
      `;
      return div;
    },
  });

  // --- 3. Product Gallery Marquee (Visual Showcase) ---
  const products = [
    { view: 'Side Profile', img: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/3bbecbdf584e40398446a8bf0117cf62_9366/Samba_OG_Shoes_White_B75806_01_00_standard.jpg', alt: 'Adidas Samba Side' },
    { view: 'Top-Down View', img: 'https://assets.adidas.com/images/h_2000,f_auto,q_auto,fl_lossy,c_fill,g_auto/97cd0902ae2e402b895aa8bf0117f98f_9366/Samba_OG_Shoes_White_B75806_03_standard.jpg', alt: 'Adidas Samba Top' },
  ];

  new UniversalMarquee('#demo-products', {
    items: products,
    speed: 35,
    gap: 'var(--products-gap)',
    pauseOnHover: true,
    renderItem: (item, index) => {
      const div = createWrapper('product-view-card um-img-skeleton');
      div.innerHTML = `
        <div class="view-label">View ${String(index + 1).padStart(2, '0')}</div>
        <img src="${item.img}" alt="${item.alt}" loading="lazy">
        <div class="product-info-overlay">
          <span>Samba OG</span>
          <h4>${item.view}</h4>
        </div>
      `;
      return div;
    },
  });

  // --- 4. Stock Ticker Marquee (Dynamic Data) ---
  const stocks = [
    { sym: 'BTC', name: 'Bitcoin', val: '96,420', diff: '3,840', change: '4.2', up: true, trend: [10, 30, 25, 50, 45, 80, 75] },
    { sym: 'ETH', name: 'Ethereum', val: '3,124', diff: '34', change: '1.1', up: false, trend: [80, 70, 85, 60, 50, 40, 30] },
  ];

  new UniversalMarquee('#demo-ticker', {
    items: stocks,
    speed: 40,
    gap: '3rem',
    pauseOnHover: true,
    renderItem: (item) => {
      const div = createWrapper(`god-tier-card ${item.up ? 'is-up' : 'is-down'}`);
      const points = item.trend.map((val, i) => `${i * 18},${100 - val}`).join(' ');
      div.innerHTML = `
        <div class="card-main">
          <div class="card-top">
            <div class="brand">
              <div class="symbol-icon">${item.sym[0]}</div>
              <div class="symbol-meta"><span class="sym-text">${item.sym}</span><span class="full-name">${item.name}</span></div>
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
        </div>
      `;
      return div;
    },
  });
};

// Start application
initApp();