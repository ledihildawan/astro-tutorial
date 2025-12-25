const codeExamples = {
  testimonials: {
    html: `<!-- Tempatkan di mana pun Anda ingin marquee muncul -->
<div id="testimonials"></div>`,
    css: `/* Styling opsional untuk card testimonial */
.testimonial-card {
  background: rgba(30, 41, 59, 0.8);
  padding: 1.8rem;
  border-radius: 28px;
  width: 400px;
  backdrop-filter: blur(12px);
  border: 1px solid rgba(34, 211, 238, 0.15);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
}`,
    js: `const reviews = [
  { name: "Sarah Jenkins", handle: "@sarah_dev", avatar: "https://i.pravatar.cc/150?u=sarah", text: "Game-changer. The performance on mobile is silky smooth.", stars: 5 }
  // tambahkan review lainnya...
];

new UniversalMarquee("#testimonials", {
  items: reviews,
  speed: 25,
  gap: "3rem",
  pauseOnHover: true,
  whiteSpace: "normal",
  renderItem: (item) => {
    const card = document.createElement("div");
    card.className = "testimonial-card";
    card.innerHTML = \`
      <div style="margin-bottom:1rem;font-style:italic;color:#e0f2fe;">"\${item.text}"</div>
      <div style="display:flex;align-items:center;gap:1rem;">
        <img src="\${item.avatar}" alt="\${item.name}" style="width:60px;height:60px;border-radius:50%;">
        <div>
          <strong>\${item.name}</strong><br>
          <span style="color:#94a3b8;">\${item.handle}</span>
        </div>
      </div>
    \`;
    return card;
  }
});`,
  },
  products: {
    html: `<div id="gallery"></div>`,
    js: `const images = [
  { img: "https://example.com/samba-side.jpg", alt: "Side view", label: "Side Profile" },
  { img: "https://example.com/samba-top.jpg", alt: "Top view", label: "Top-Down" }
  // tambahkan gambar lain...
];

new UniversalMarquee("#gallery", {
  items: images,
  speed: 30,
  gap: "1.5rem",
  pauseOnHover: true,
  renderItem: (item) => {
    const card = document.createElement("div");
    card.className = "um-img-skeleton product-view-card";
    card.style.cssText = "width:420px;height:280px;border-radius:24px;overflow:hidden;position:relative;";
    card.innerHTML = \`
      <img src="\${item.img}" alt="\${item.alt}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">
      <div style="position:absolute;bottom:20px;left:20px;background:rgba(0,0,0,0.7);backdrop-filter:blur(12px);padding:10px 20px;border-radius:50px;color:#fff;font-weight:800;">\${item.label}</div>
    \`;
    return card;
  }
});`,
  },
  ticker: {
    html: `<div id="ticker"></div>`,
    js: `const stocks = [
  { sym: "NVDA", val: "$177", change: "1.2%", up: true },
  { sym: "TSLA", val: "$475", change: "3.6%", up: true },
  { sym: "AAPL", val: "$274", change: "1.5%", up: false }
  // tambahkan data lain...
];

new UniversalMarquee("#ticker", {
  items: stocks,
  speed: 70,
  separator: " • ",
  renderItem: (item) => {
    const el = document.createElement("div");
    el.style.cssText = "display:flex;align-items:center;gap:1.8rem;background:rgba(30,41,59,0.6);padding:1rem 2rem;border-radius:16px;white-space:nowrap;border:1px solid rgba(34,211,238,0.1);";
    const sign = item.up ? "+" : "-";
    const color = item.up ? "#34d399" : "#f87171";
    el.innerHTML = \`
      <span style="font-weight:800;letter-spacing:1px;">\${item.sym}</span>
      <span style="font-weight:700;">\${item.val}</span>
      <span style="font-weight:800;color:\${color};">\${sign}\${item.change}</span>
    \`;
    return el;
  }
});`,
  },
};

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

document.querySelectorAll('.code-panel code').forEach((block) => hljs.highlightElement(block));
document.querySelectorAll('.code-toggle-btn').forEach((btn) => {
  const span = btn.querySelector('span');

  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const newState = !expanded;

    btn.setAttribute('aria-expanded', newState);

    span.textContent = newState ? 'Hide code' : 'Show code';

    const viewer = document.getElementById(btn.getAttribute('aria-controls'));
    if (viewer) {
      viewer.classList.toggle('open', newState);
    }
  });
});

document.querySelectorAll('.code-viewer').forEach((viewer) => {
  const tabs = viewer.querySelectorAll('.code-tab');
  const copyBtn = viewer.querySelector('.copy-tab-btn');

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

  if (copyBtn) {
    const defaultIcon = copyBtn.innerHTML;

    copyBtn.addEventListener('click', async () => {
      const codeEl = viewer.querySelector('.code-panel.active code');
      if (!codeEl) return;
      const text = codeEl.textContent.trim();

      try {
        await navigator.clipboard.writeText(text);
        copyBtn.innerHTML =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#27c93f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      } catch {
        copyBtn.innerHTML =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff5f56" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/></svg>';
      }

      setTimeout(() => {
        copyBtn.innerHTML = defaultIcon;
      }, 2000);
    });
  }
});
// Highlight semua inline code setelah DOM loaded
document.querySelectorAll('code.inline-code').forEach((block) => {
  hljs.highlightElement(block);
});
