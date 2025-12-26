/**
 * UniversalMarquee Content Handler
 * Pelengkap interaktivitas untuk dokumentasi Universal Marquee.
 * Menggunakan gaya bahasa yang konsisten dengan narasi "Infinite Scroll, Perfected".
 */

const codeExamples = {
  testimonials: {
    html: `<div id="demo-testimonials"></div>`,
    css: `/* Styling elegan untuk kartu testimonial yang 'buttery-smooth' */
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
    js: `// Bangun social proof yang tak terbantahkan dengan data nyata
const reviews = [
  { 
    name: "Sarah Jenkins", 
    handle: "@sarah_dev", 
    avatar: "https://i.pravatar.cc/150?u=sarah", 
    text: "Zero dependencies dan performanya sangat mulus (silky smooth). Benar-benar standar baru untuk marquee!", 
    stars: 5 
  }
  // Tambahkan feedback pelanggan hebat lainnya...
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
    js: `// Tampilkan detail produk dengan kontrol penuh (drag & scroll)
const images = [
  { img: "https://www.mdpabel.com/md-pabel.png", alt: "Side view", label: "Front Profile" },
  { img: "https://www.mdpabel.com/md-pabel.png", alt: "Top view", label: "Visual Showcase" }
  // Sertakan aset visual berkualitas tinggi Anda...
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
  physics: { draggable: true } // Dirancang untuk menyenangkan pengguna
});`,
  },
  ticker: {
    html: `<div id="demo-ticker"></div>`,
    js: `// Jaga awareness pengguna dengan aliran konten yang dinamis
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

/**
 * UI LOGIC: Mengatur Tab Kode dan Interaktivitas Dokumentasi
 */
document.addEventListener('DOMContentLoaded', () => {
  // Inisialisasi konten ke dalam panel kode
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

  // Highlight elemen menggunakan library Highlight.js
  document.querySelectorAll('.code-panel code, code.inline-code').forEach((block) => {
    if (typeof hljs !== 'undefined') hljs.highlightElement(block);
  });

  // Toggle View Implementation
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

  // Switch Tab (HTML/JS/CSS)
  document.querySelectorAll('.code-viewer').forEach((viewer) => {
    const tabs = viewer.querySelectorAll('.code-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        viewer.querySelectorAll('.code-panel').forEach((p) => p.classList.remove('active'));
        const panel = viewer.querySelector(`.code-panel[data-tab="\${target}"]`);
        if (panel) panel.classList.add('active');
      });
    });

    // Copy to Clipboard
    const copyBtn = viewer.querySelector('.copy-tab-btn');
    if (copyBtn) {
      const defaultIcon = copyBtn.innerHTML;
      copyBtn.addEventListener('click', async () => {
        const codeEl = viewer.querySelector('.code-panel.active code');
        if (!codeEl) return;
        try {
          await navigator.clipboard.writeText(codeEl.textContent.trim());
          copyBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        } catch (err) {
          copyBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/></svg>';
        }
        setTimeout(() => { copyBtn.innerHTML = defaultIcon; }, 2000);
      });
    }
  });
});