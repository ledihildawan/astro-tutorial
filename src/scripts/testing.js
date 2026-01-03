// 1. Pastikan path dan ekstensi .js sudah benar

import { UniversalMarquee } from '../libs/universal-marquee/main';

const initApp = () => {
  // --- DEMO 1: Status Ticker (News Style) ---
  const tickerItems = [
    'v8.5 Released',
    'Zero Jitter Update',
    'ScrollSync Physics',
    'Drag & Throw Enabled',
    'Sub-pixel Rendering',
    'Lazy Loading',
  ];

  new UniversalMarquee('#ticker-marquee', {
    content: {
      // Masukkan items dan renderer di sini
      items: tickerItems,
      renderItem: (text) => `
          <div class="ticker-item">
            <div class="dot"></div>
            <span>${text}</span>
          </div>
        `,
    },
    style: {
      // Kecepatan dan arah masuk ke kategori style
      speed: 30,
      gap: '1.5rem',
      direction: 'reverse',
      mask: 'both',
      maskWidth: '100px',
    },
    behavior: {
      // Logika cloning dan hover
      cloneStrategy: 'auto',
      hoverAction: 'pause',
    },
    physics: {
      // Draggable masuk ke kategori physics
      draggable: true,
      dragSpeed: 1.5,
    },
  });

  // --- DEMO 2: Tech Stack (Modern Logo) ---
  const logos = [
    'https://www.mdpabel.com/md-pabel.png', // Logo Anda
    'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
    'https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg',
    'https://upload.wikimedia.org/wikipedia/commons/f/f1/Vitejs-logo.svg',
    'https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg',
    'https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg',
    'https://upload.wikimedia.org/wikipedia/commons/6/6a/JavaScript-logo.png',
  ];

  const techMarquee = new UniversalMarquee('#tech-marquee', {
    content: {
      items: logos,
      renderItem: (src) => `<div class="tech-item"><img src="${src}" alt="Tech Logo" loading="lazy" /></div>`,
    },
    style: {
      speed: 50,
      gap: '5rem',
      mask: 'both',
      align: 'center',
    },
    behavior: {
      hoverAction: 'slow',
      hoverSpeedFactor: 0.1,
    },
    performance: {
      lazyLoad: true, // Membantu sinkronisasi jika gambar lambat dimuat
    },
  });

  // --- DEMO 3: Feature Cards (Physics Focus) ---
  const featureData = [
    {
      icon: '🚀',
      title: 'High Performance',
      desc: 'Menggunakan requestAnimationFrame dan translasi 3D GPU-accelerated.',
    },
    {
      icon: '🖱️',
      title: 'Draggable',
      desc: 'Interaksi sentuh dan mouse natural dengan momentum throw (lempar).',
    },
    { icon: '📜', title: 'Scroll Sync', desc: 'Kecepatan marquee bereaksi terhadap kecepatan scroll halaman.' },
    {
      icon: '🎯',
      title: 'Pixel Perfect',
      desc: 'Kalkulasi loop yang presisi hingga sub-pixel, menghilangkan efek lompatan.',
    },
    { icon: '🧩', title: 'Modular', desc: 'Mudah dikonfigurasi dengan opsi deep-merge untuk kontrol penuh.' },
    { icon: '📱', title: 'Responsive', desc: 'Breakpoint system bawaan untuk mengatur kecepatan/gap di mobile.' },
  ];

  const featuresMarquee = new UniversalMarquee('#features-marquee', {
    content: {
      items: featureData,
      renderItem: (data) => `
          <div class="card-item">
            <div class="card-icon">${data.icon}</div>
            <h4 class="card-title">${data.title}</h4>
            <p class="card-desc">${data.desc}</p>
          </div>
        `,
    },
    style: {
      speed: 35,
      gap: '2rem',
      mask: 'both',
      maskWidth: '8%',
    },
    physics: {
      draggable: true,
      dragSpeed: 1.1,
      scrollSync: {
        // Fitur ScrollSync v8.5
        enabled: true,
        factor: 3.0,
      },
    },
    behavior: {
      startWhenVisible: true,
    },
    callbacks: {
      onDragStart: () => (document.body.style.cursor = 'grabbing'),
      onDragEnd: () => (document.body.style.cursor = 'default'),
    },
  });

  // --- RE-SYNC GUARD ---
  // Kadang gambar (Modern Stack) membutuhkan waktu untuk tahu lebarnya.
  // window 'load' memastikan semua asset (logo/image) sudah terunduh sempurna.
  window.addEventListener('load', () => {
    setTimeout(() => {
      // Memicu penghitungan ulang piksel lintasan (measureAndSync)
      techMarquee.updateItems(logos);
      featuresMarquee.updateItems(featureData);
    }, 500);
  });
};

// Jalankan inisialisasi hanya di browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
} else {
  console.warn('UniversalMarquee demo skipped: window/document not available.');
}
