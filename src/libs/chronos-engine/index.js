// DAFTAR WARNA LENGKAP (59 warna unik dari semua request sebelumnya)
const PALETTE = [
  '#F5EBC8',
  '#D5D5D7',
  '#EBD8DC',
  '#F0EFEB',
  '#D4E4F1',
  '#F0D9CC',
  '#C9D3C0',
  '#DBD3DC',
  '#C7E4CA',
  '#79B6D8',
  '#D6CD95',
  '#A793AC',
  '#756F6A',
  '#4A6275',
  '#A47764',
  '#BB2649',
  '#6667AB',
  '#939597',
  '#F5DF4D',
  '#0F4C81',
  '#FF6F61',
  '#5F4B8B',
  '#88B04B',
  '#F7CAC9',
  '#91A8D0',
  '#964F4C',
  '#AD5E99',
  '#009473',
  '#DD4124',
  '#D94F70',
  '#45B5AA',
  '#F0C05A',
  '#5A5B9F',
  '#9B1B30',
  '#DECDBE',
  '#53B0AE',
  '#E2583E',
  '#7BC4C4',
  '#BF1932',
  '#C74375',
  '#98B2D1',
  '#9BB7D6',
  '#C94476',
  '#C02034',
  '#7AC5C5',
  '#E4583E',
  '#4FB0AE',
  '#595CA1',
  '#F0BF59',
  '#41B6AB',
  '#DA4F70',
  '#F05442',
  '#169C78',
  '#B565A7',
  '#955251',
  '#8CA4CF',
  '#FFBE98',
  '#F0EEE9',
];

class ChronosTheme {
  static getLuminance(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const a = [r, g, b].map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  static apply(hex) {
    const root = document.documentElement.style;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = this.getLuminance(hex);
    const isLight = lum > 0.6;

    root.setProperty('--c-primary', hex);

    if (isLight) {
      root.setProperty('--bg-system', '#D8D6D1');
      root.setProperty('--c-past', `rgba(${r * 0.6}, ${g * 0.6}, ${b * 0.6}, 1)`);
      root.setProperty('--c-future', 'rgba(255, 255, 255, 0.45)');
      root.setProperty('--c-glow', 'rgba(0,0,0,0.15)');
      document.getElementById('ghost-label').style.color = '#fff';
      document.getElementById('ghost-label').style.opacity = '0.04';
    } else {
      root.setProperty('--bg-system', '#F4F4F2');
      const pastR = Math.floor(r * 0.4 + 180 * 0.6);
      const pastG = Math.floor(g * 0.4 + 180 * 0.6);
      const pastB = Math.floor(b * 0.4 + 180 * 0.6);
      root.setProperty('--c-past', `rgb(${pastR}, ${pastG}, ${pastB})`);
      root.setProperty('--c-future', `rgba(${r}, ${g}, ${b}, 0.08)`);
      root.setProperty('--c-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
      document.getElementById('ghost-label').style.color = hex;
      document.getElementById('ghost-label').style.opacity = '0.03';
    }
  }
}

class ChronosCalendar {
  static getDayProperties(date, todayInfo, targetYear) {
    const year = date.getFullYear();
    if (year !== targetYear) return { class: 'day--filler', opacity: 0.15, text: '' };

    const timeDiff = todayInfo.time - date.getTime();
    const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    let stateClass = 'day';
    let opacity = 1;

    if (date.getDay() === 1) stateClass += ' day--monday';

    if (date.toDateString() === todayInfo.str) {
      stateClass += ' day--today';
    } else if (timeDiff > 0) {
      stateClass += ' day--past';
      if (dayDiff > 7) {
        opacity = Math.max(0.15, 1 - (dayDiff - 7) * 0.01);
      }
    } else {
      stateClass += ' day--future';
    }

    if (date.getMonth() % 2 !== 0) stateClass += ' day--even-month';

    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    const dateText = date.toLocaleDateString('id-ID', options);

    return { class: stateClass, opacity, text: dateText };
  }
}

class ChronosLayout {
  static getProperties(w, h, days, config) {
    const scale = Math.max(w, 240) / 1200;
    const gap = Math.max(1.5, config.gap * scale);
    const frame = Math.max(8, config.frame * scale);
    const availW = w - frame * 2;
    const availH = h - frame * 2;
    let bestS = 0;
    for (let c = 1; c <= days; c++) {
      const r = Math.ceil(days / c);
      const s = Math.min((availW - (c - 1) * gap) / c, (availH - (r - 1) * gap) / r);
      if (s > bestS) bestS = s;
    }
    const cellSize = Math.floor(bestS);
    return {
      cellSize,
      gap,
      cols: Math.floor((w + gap) / (cellSize + gap)),
      rows: Math.floor((h + gap) / (cellSize + gap)),
    };
  }
}

class ChronosEngine {
  constructor(viewportId, config) {
    this.viewport = document.getElementById(viewportId);
    this.ghostLabel = document.getElementById('ghost-label');
    this.config = config;
    this.year = 2026;
    this.monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
    this.paletteIndex = 0;
    this.init();
  }

  init() {
    ChronosTheme.apply(PALETTE[this.paletteIndex]);

    // Klik di mana saja → ganti warna + hari random
    document.body.addEventListener('click', () => {
      this.paletteIndex = (this.paletteIndex + 1) % PALETTE.length;
      ChronosTheme.apply(PALETTE[this.paletteIndex]);
      this.renderWithRandomToday();
    });

    window.addEventListener('resize', () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.renderWithCurrentToday(), 100);
    });

    this.renderWithRealToday();
  }

  renderWithRealToday() {
    const realToday = new Date();
    this.currentTodayInfo = {
      str: realToday.toDateString(),
      time: new Date(realToday.getFullYear(), realToday.getMonth(), realToday.getDate()).getTime(),
    };
    this._render(this.currentTodayInfo);
  }

  renderWithRandomToday() {
    const isLeap = (this.year % 4 === 0 && this.year % 100 !== 0) || this.year % 400 === 0;
    const days = isLeap ? 366 : 365;
    const randomDay = Math.floor(Math.random() * days) + 1;
    const randomDate = new Date(this.year, 0, randomDay);

    this.currentTodayInfo = {
      str: randomDate.toDateString(),
      time: new Date(randomDate.getFullYear(), randomDate.getMonth(), randomDate.getDate()).getTime(),
    };

    this._render(this.currentTodayInfo);
  }

  renderWithCurrentToday() {
    if (this.currentTodayInfo) {
      this._render(this.currentTodayInfo);
    }
  }

  _render(todayInfo) {
    const isLeap = (this.year % 4 === 0 && this.year % 100 !== 0) || this.year % 400 === 0;
    const days = isLeap ? 366 : 365;
    const layout = ChronosLayout.getProperties(window.innerWidth, window.innerHeight, days, this.config);
    const totalCells = layout.cols * layout.rows;

    const startOffset = Math.floor((totalCells - days) / 2);
    const startDate = new Date(this.year, 0, 1);
    startDate.setDate(startDate.getDate() - startOffset);

    this.viewport.style.cssText = `
            gap: ${layout.gap}px;
            grid-template-columns: repeat(${layout.cols}, ${layout.cellSize}px);
            grid-template-rows: repeat(${layout.rows}, ${layout.cellSize}px);
          `;

    this.ghostLabel.innerText =
      this.monthNames[todayInfo.time ? new Date(todayInfo.time).getMonth() : new Date().getMonth()];

    const fragment = document.createDocumentFragment();
    const cursor = new Date(startDate);

    for (let i = 0; i < totalCells; i++) {
      const el = document.createElement('div');
      const props = ChronosCalendar.getDayProperties(cursor, todayInfo, this.year);
      el.className = props.class;
      el.style.opacity = props.opacity;
      el.setAttribute('data-date', props.text);
      fragment.appendChild(el);
      cursor.setDate(cursor.getDate() + 1);
    }

    this.viewport.innerHTML = '';
    this.viewport.appendChild(fragment);
  }
}

new ChronosEngine('chronos-viewport', {
  gap: 12,
  frame: 24,
});
