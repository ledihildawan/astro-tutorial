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
  let lastHoveredEl = null,
    selectedEl = null;
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
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDaysInYear = isLeap ? 366 : 365;

    let bestDiff = Infinity;
    let bestCols = 52; // default sekitar 52 minggu

    for (let c = 20; c <= 80; c++) {
      const r = Math.ceil(totalDaysInYear / c);
      const totalGapW = cssGap * (c - 1);
      const totalGapH = cssGap * (r - 1);
      if (totalGapW >= availableW || totalGapH >= availableH) break;

      const cellW = (availableW - totalGapW) / c;
      const cellH = (availableH - totalGapH) / r;
      if (cellW < 3 || cellH < 3) continue;

      const ratio = Math.max(cellW, cellH) / Math.min(cellW, cellH);
      const diff = Math.abs(ratio - 1);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestCols = c;
      }
    }

    const rows = Math.ceil(totalDaysInYear / bestCols);
    const totalCells = bestCols * rows;
    const extraCells = totalCells - totalDaysInYear;
    const padLeft = Math.floor(extraCells / 2);
    const padRight = extraCells - padLeft;

    return {
      cols: bestCols,
      rows,
      totalCells,
      totalDaysInYear,
      year,
      now: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      padLeft,
      padRight,
    };
  }

  function render() {
    DOM.grid.classList.add('locked');
    loadingComplete = false;

    const fit = calculateBestFit();
    const { cols, rows, totalCells, year, now, padLeft } = fit;

    currentCols = cols;
    cellCount = totalCells;
    todayIdx = -1;

    DOM.grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    DOM.grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    // Mulai dari tahun sebelumnya agar padding kiri terisi
    const startDate = new Date(year, 0, 1);
    startDate.setDate(startDate.getDate() - padLeft);

    const frag = document.createDocumentFragment();
    gridData = new Array(totalCells);

    for (let i = 0; i < totalCells; i++) {
      const el = document.createElement('div');
      let cls = 'day';

      const current = new Date(startDate);
      const currentYear = current.getFullYear();
      const currentTime = current.getTime();

      if (currentYear !== year) {
        cls += ' out';
      } else if (currentTime === now.getTime()) {
        cls += ' today';
        todayIdx = i;
      } else if (currentTime < now.getTime()) {
        cls += ' past';
      }

      el.className = cls;
      el._i = i;
      el.setAttribute('tabindex', '-1');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', fmt.format(current));
      el.style.animationDelay = `${i * 1.2}ms`;

      gridData[i] = fmt.format(current);
      frag.appendChild(el);

      startDate.setDate(startDate.getDate() + 1);
    }

    DOM.grid.replaceChildren(frag);

    const initialFocus = todayIdx !== -1 ? todayIdx : Math.floor(totalCells / 2);
    if (DOM.grid.children[initialFocus]) {
      DOM.grid.children[initialFocus].setAttribute('tabindex', '0');
    }

    currentDate = new Date(now);
    currentDate.setHours(0, 0, 0, 0);

    setTimeout(
      () => {
        DOM.grid.classList.remove('locked');
        loadingComplete = true;
      },
      totalCells * 1.2 + 600
    );
  }

  function updateTabIndex(el) {
    const prev = DOM.grid.querySelector('[tabindex="0"]');
    if (prev) prev.setAttribute('tabindex', '-1');
    el.setAttribute('tabindex', '0');
  }

  function hideActiveState() {
    clearTimeout(tooltipTimer);
    DOM.tooltip.classList.remove('on');
    DOM.toast.classList.remove('on');
    DOM.spotlight.classList.remove('absorbed');
    DOM.spotlight.style.opacity = '0';
    DOM.grid.querySelectorAll('.day.active').forEach((e) => e.classList.remove('active'));
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

  function updateTooltipPosition(el) {
    if (window.innerWidth > 768) {
      const elRect = el.getBoundingClientRect();
      const ttRect = DOM.tooltip.getBoundingClientRect();
      let tx = elRect.left + elRect.width / 2 - ttRect.width / 2;
      let ty = elRect.top - ttRect.height - 12;
      if (ty < 10) ty = elRect.bottom + 12;
      tx = Math.max(10, Math.min(tx, window.innerWidth - ttRect.width - 10));
      DOM.tooltip.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
  }

  function showNotification(el) {
    const text = gridData[el._i];
    if (selectedEl) selectedEl.classList.remove('selected');
    el.classList.add('selected');
    selectedEl = el;
    DOM.spotlight.classList.add('absorbed');
    setText(text);
    updateTooltipPosition(el);
    clearTimeout(tooltipTimer);
    tooltipTimer = setTimeout(() => {
      if (window.innerWidth > 768) DOM.tooltip.classList.add('on');
      else DOM.toast.classList.add('on');
    }, TOOLTIP_DELAY_AFTER_FILL);
  }

  function showTodayNotification(el) {
    DOM.spotlight.style.opacity = '0';
    setTimeout(() => {
      if (!DOM.tooltip.classList.contains('on') && !DOM.toast.classList.contains('on')) {
        DOM.spotlight.style.display = 'none';
      }
    }, 400);
    setText(gridData[el._i]);
    updateTooltipPosition(el);
    if (window.innerWidth > 768) DOM.tooltip.classList.add('on');
    else DOM.toast.classList.add('on');
  }

  function tryShowNotification(target) {
    clearTimeout(motionTimer);
    motionTimer = setTimeout(() => showNotification(target), MOTION_STOP_DELAY);
  }

  function setActiveCell(target) {
    if (lastHoveredEl && lastHoveredEl !== target) lastHoveredEl.classList.remove('active');
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

  DOM.grid.addEventListener('mouseleave', hideActiveState);
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
    if (!DOM.grid.contains(document.activeElement)) return;
    if (!e.target.classList.contains('day')) return;

    const currentIndex = e.target._i;
    let nextIndex = null;
    document.body.classList.replace('mouse-mode', 'keyboard-mode');

    switch (e.key) {
      case 'ArrowRight':
        nextIndex = currentIndex + 1;
        break;
      case 'ArrowLeft':
        nextIndex = currentIndex - 1;
        break;
      case 'ArrowDown':
        nextIndex = currentIndex + currentCols;
        break;
      case 'ArrowUp':
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
