import UniversalMarquee from './universal-marquee';

const customItemRenderer = (item) => {
  const el = document.createElement('a');
  el.href = '#';
  el.textContent = String(item);

  Object.assign(el.style, {
    color: 'var(--um-color-separator)',
    textDecoration: 'none',
    padding: '0 5px',
    fontWeight: 'normal',
    transition: 'color 0.3s ease',
  });

  el.onmouseover = () => (el.style.color = 'var(--um-color-accent)');
  el.onmouseout = () => (el.style.color = 'var(--um-color-separator)');

  return el;
};

const initApp = () => {
  if (document.getElementById('breaking-news-marquee')) {
    new UniversalMarquee('#breaking-news-marquee', {
      // Konfigurasi Perilaku
      duration: '25s',
      gap: '3rem',
      direction: 'left',

      // A11y Configuration
      a11yLabel: 'Berita utama minggu ini, tekan tab untuk menghentikan guliran dan membaca.',

      // Konten Berita
      items: [
        'Foto-foto baru dari estate Jeffrey Epstein bocor, tunjukkan Trump, Clinton, dan tokoh lain',
        'Rusia serang Ukraina dengan 450 drone dan 30 rudal, jutaan rumah gelap gulita',
        'Dua tentara AS tewas dibunuh penembak ISIS di Suriah',
        'Belarus bebaskan 123 tahanan politik setelah AS cabut sanksi',
        'Israel bunuh komandan senior Hamas dalam serangan Gaza',
        'Bentrok perbatasan Thailand-Kamboja berlanjut meski Trump klaim kesepakatan gencatan senjata',
        'Banjir dahsyat di Asia Bunuh 1.750 orang',
        'Netflix beli Warner Bros. dalam kesepakatan miliaran dolar',
        'Uni Eropa denda X (Twitter) atas pelanggaran privasi',
        'Gempa 7,6 SR guncang Jepang, peringatan tsunami dikeluarkan',
      ],
      separator: ' • ',
      renderItem: customItemRenderer,
    });
  }
};

document.addEventListener('DOMContentLoaded', initApp);
