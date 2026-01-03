(() => {
  'use strict';

  const DOM = {
    grid: document.getElementById('grid'),
    spotlight: document.getElementById('spotlight'),
    tooltip: document.getElementById('tooltip'),
    toast: document.getElementById('toast'),
    txt: document.getElementById('txt'),
    toastTxt: document.getElementById('toast-txt'),
  };

  // Safety check: jika elemen belum ada, berhenti.
  if (!DOM.grid) return;

  const fmt = new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let gridData = [];
  let mouse = { x: -1000, y: -1000 };
  let lastMouse = { x: -1000, y: -1000 };
  let currentCols = 0,
    cellCount = 0,
    todayIdx = -1;
  let idleTimer = null,
    motionTimer = null,
    tooltipTimer = null;
  let lastHoveredEl = null;
  let selectedEl = null;
  let currentDate = null;

  const IDLE_TIMEOUT = 5000;
  const MOTION_STOP_DELAY = 200;
  const TOOLTIP_DELAY_AFTER_FILL = 300;

  let loadingComplete = false;

  function calculateBestFit() {
    const styles = getComputedStyle(document.body);
    const cssGap = parseFloat(styles.getPropertyValue('--gap')) || 0;
    const cssFrame = parseFloat(styles.getPropertyValue('--frame')) || 0;
    const availableW = window.innerWidth - cssFrame * 2;
    const availableH = window.innerHeight - cssFrame * 2;
    const now = new Date();
    const year = now.getFullYear();
    const totalDays = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;

    let bestDiff = Infinity;
    let bestCols = 5;

    for (let c = 3; c <= 80; c++) {
      const r = Math.ceil(totalDays / c);
      const totalGapW = cssGap * (c - 1);
      const totalGapH = cssGap * (r - 1);

      if (totalGapW >= availableW || totalGapH >= availableH) break;

      const cellW = (availableW - totalGapW) / c;
      const cellH = (availableH - totalGapH) / r;

      if (cellW < 2 || cellH < 2) break;

      const ratio = Math.max(cellW, cellH) / Math.min(cellW, cellH);
      const diff = ratio - 1;

      if (diff < bestDiff) {
        bestDiff = diff;
        bestCols = c;
      }
    }

    return {
      cols: bestCols,
      rows: Math.ceil(totalDays / bestCols),
      totalDays,
      year,
      now: now.setHours(0, 0, 0, 0),
    };
  }

  function render() {
    DOM.grid.classList.add('locked');
    loadingComplete = false;

    const fit = calculateBestFit();
    const { cols, rows, totalDays, year, now } = fit;

    currentCols = cols;
    cellCount = cols * rows;

    const padStart = Math.floor((cellCount - totalDays) / 2);
    const date = new Date(year, 0, 1);
    date.setDate(date.getDate() - padStart);

    DOM.grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    DOM.grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const frag = document.createDocumentFragment();
    gridData = new Array(cellCount);
    todayIdx = -1;

    for (let i = 0; i < cellCount; i++) {
      const el = document.createElement('div');
      let cls = 'day';
      const iterY = date.getFullYear();
      const iterT = date.getTime();

      if (iterY !== year) cls += ' out';
      else if (iterT === now) {
        cls += ' today';
        todayIdx = i;
      } else if (iterT < now) cls += ' past';

      el.className = cls;
      el._i = i;
      el.setAttribute('tabindex', '-1');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', fmt.format(date));
      el.style.animationDelay = `${i * 1.2}ms`;

      gridData[i] = fmt.format(date);

      frag.appendChild(el);
      date.setDate(date.getDate() + 1);
    }

    DOM.grid.replaceChildren(frag);

    const initialFocus = todayIdx !== -1 ? todayIdx : 0;
    if (DOM.grid.children[initialFocus]) {
      DOM.grid.children[initialFocus].setAttribute('tabindex', '0');
    }

    // Simpan tanggal hari ini setelah render
    currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    setTimeout(
      () => {
        DOM.grid.classList.remove('locked');
        loadingComplete = true;
      },
      cellCount * 1.2 + 600
    );
  }

  function updateTabIndex(element) {
    const prev = DOM.grid.querySelector('[tabindex="0"]');
    if (prev) prev.setAttribute('tabindex', '-1');
    element.setAttribute('tabindex', '0');
  }

  function hideActiveState() {
    clearTimeout(tooltipTimer);
    DOM.tooltip.classList.remove('on');
    DOM.toast.classList.remove('on');
    DOM.spotlight.classList.remove('absorbed');
    DOM.spotlight.style.opacity = '0';

    DOM.grid.querySelectorAll('.day.active').forEach((el) => el.classList.remove('active'));
    if (selectedEl) selectedEl.classList.remove('selected');
    selectedEl = null;
    lastHoveredEl = null;

    const todayEl = DOM.grid.children[todayIdx];
    if (todayEl) updateTabIndex(todayEl);

    setTimeout(() => (DOM.spotlight.style.display = 'none'), 400);
  }

  function setText(text) {
    DOM.txt.innerText = text;
    DOM.toastTxt.innerText = text;
  }

  function updateTooltipPosition(element) {
    if (window.innerWidth > 768) {
      const elRect = element.getBoundingClientRect();
      const ttRect = DOM.tooltip.getBoundingClientRect();
      let tx = elRect.left + elRect.width / 2 - ttRect.width / 2;
      let ty = elRect.top - ttRect.height - 12;

      if (ty < 10) ty = elRect.bottom + 12;
      if (tx < 10) tx = 10;
      if (tx + ttRect.width > window.innerWidth - 10) tx = window.innerWidth - ttRect.width - 10;

      DOM.tooltip.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
  }

  function showNotification(element) {
    const text = gridData[element._i];

    if (selectedEl) selectedEl.classList.remove('selected');
    element.classList.add('selected');
    selectedEl = element;

    DOM.spotlight.classList.add('absorbed');

    setText(text);

    updateTooltipPosition(element);

    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      if (window.innerWidth > 768) {
        DOM.tooltip.classList.add('on');
      } else {
        DOM.toast.classList.add('on');
      }
    }, TOOLTIP_DELAY_AFTER_FILL);
  }

  function showTodayNotification(element) {
    DOM.spotlight.style.opacity = '0';
    setTimeout(() => {
      if (!DOM.tooltip.classList.contains('on') && !DOM.toast.classList.contains('on')) {
        DOM.spotlight.style.display = 'none';
      }
    }, 400);

    setText(gridData[element._i]);
    updateTooltipPosition(element);

    if (window.innerWidth > 768) {
      DOM.tooltip.classList.add('on');
    } else {
      DOM.toast.classList.add('on');
    }
  }

  function tryShowNotification(target) {
    clearTimeout(motionTimer);
    motionTimer = setTimeout(() => {
      showNotification(target);
    }, MOTION_STOP_DELAY);
  }

  function setActiveCell(target) {
    if (lastHoveredEl && lastHoveredEl !== target) {
      lastHoveredEl.classList.remove('active');
    }
    target.classList.add('active');
    lastHoveredEl = target;
    updateTabIndex(target);
    target.focus();
  }

  let mouseTicking = false;
  window.addEventListener(
    'mousemove',
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      clearTimeout(idleTimer);
      idleTimer = setTimeout(hideActiveState, IDLE_TIMEOUT);

      if (loadingComplete && window.innerWidth > 768) {
        DOM.spotlight.style.display = 'block';
        DOM.spotlight.style.opacity = '1';
        DOM.spotlight.classList.remove('absorbed');
      }

      if (!mouseTicking) {
        requestAnimationFrame(() => {
          if (window.innerWidth > 768 && loadingComplete) {
            DOM.spotlight.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;

            const target = document.elementFromPoint(mouse.x, mouse.y);

            if (target && target.classList.contains('day')) {
              setActiveCell(target);

              if (target.classList.contains('today')) {
                clearTimeout(motionTimer);
                clearTimeout(tooltipTimer);
                DOM.tooltip.classList.remove('on');
                DOM.toast.classList.remove('on');
                showTodayNotification(target);
              } else {
                clearTimeout(motionTimer);
                clearTimeout(tooltipTimer);
                DOM.tooltip.classList.remove('on');
                DOM.toast.classList.remove('on');
                if (Math.abs(mouse.x - lastMouse.x) < 3 && Math.abs(mouse.y - lastMouse.y) < 3) {
                  tryShowNotification(target);
                }
              }

              lastMouse.x = mouse.x;
              lastMouse.y = mouse.y;
            } else {
              clearTimeout(motionTimer);
              clearTimeout(tooltipTimer);
              DOM.tooltip.classList.remove('on');
              DOM.toast.classList.remove('on');
              if (selectedEl) {
                selectedEl.classList.remove('selected');
                selectedEl = null;
              }
            }
          }
          mouseTicking = false;
        });
        mouseTicking = true;
      }
    },
    { passive: true }
  );

  DOM.grid.addEventListener('mouseleave', () => {
    clearTimeout(idleTimer);
    clearTimeout(motionTimer);
    clearTimeout(tooltipTimer);
    hideActiveState();
  });

  DOM.grid.addEventListener('click', (e) => {
    if (e.target.classList.contains('day')) {
      updateTabIndex(e.target);
      e.target.focus();
      showNotification(e.target);
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      hideActiveState();

      const todayEl = DOM.grid.children[todayIdx];
      if (todayEl) {
        updateTabIndex(todayEl);
        todayEl.focus();
      }
      return;
    }

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      DOM.tooltip.classList.remove('on');
      DOM.toast.classList.remove('on');
      clearTimeout(motionTimer);
      clearTimeout(tooltipTimer);
    }

    if (!DOM.grid.contains(document.activeElement) && e.key !== 'Tab') return;
    if (!e.target.classList.contains('day')) return;

    const currentIndex = e.target._i;
    let nextIndex = null;

    document.body.classList.replace('mouse-mode', 'keyboard-mode');

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = currentIndex + 1;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = currentIndex - 1;
        break;
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = currentIndex + currentCols;
        break;
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = currentIndex - currentCols;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        showNotification(e.target);
        return;
    }

    if (nextIndex !== null && nextIndex >= 0 && nextIndex < cellCount) {
      const nextEl = DOM.grid.children[nextIndex];
      if (nextEl) {
        updateTabIndex(nextEl);
        nextEl.focus();
      }
    }
  });

  // Real-time date change detection
  function startDateWatcher() {
    setInterval(() => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (currentDate && now.getTime() !== currentDate.getTime()) {
        render();
      }
    }, 60000);
  }

  render();
  startDateWatcher();
  new ResizeObserver(() => render()).observe(document.body);
})();
