const PHASES = [
  {
    name: "新月",
    emoji: "🌑",
    detail: "月が太陽と同じ方向にあり、ほとんど見えません。",
  },
  {
    name: "三日月",
    emoji: "🌒",
    detail: "細い弧の光が見え始める時期です。",
  },
  {
    name: "上弦の月",
    emoji: "🌓",
    detail: "半分ほどが光り、満月に向かっています。",
  },
  {
    name: "十三夜",
    emoji: "🌔",
    detail: "光っている部分がふくらみ、満月直前です。",
  },
  {
    name: "満月",
    emoji: "🌕",
    detail: "月全体が明るく輝くタイミングです。",
  },
  {
    name: "十六夜",
    emoji: "🌖",
    detail: "満月を過ぎ、少しずつ欠け始めます。",
  },
  {
    name: "下弦の月",
    emoji: "🌗",
    detail: "半分ほどが光り、新月に向かう途中です。",
  },
  {
    name: "二十六夜",
    emoji: "🌘",
    detail: "細い弧が残るのみで、新月に近づきます。",
  },
];

const SYNODIC_MONTH = 29.530588853;
const BASE_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);

const getMoonPhaseFraction = (date) => {
  const daysSinceBase = (date.getTime() - BASE_NEW_MOON_UTC) / (1000 * 60 * 60 * 24);
  const normalized = ((daysSinceBase % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  return normalized / SYNODIC_MONTH;
};

const getPhaseIndex = (fraction) => {
  const index = Math.floor((fraction * PHASES.length) + 0.5) % PHASES.length;
  return index;
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);

const updateMoonPhase = () => {
  const now = new Date();
  const fraction = getMoonPhaseFraction(now);
  const index = getPhaseIndex(fraction);
  const phase = PHASES[index];
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * fraction)) / 2 * 100);

  document.getElementById("today").textContent = formatDate(now);
  document.getElementById("moon-icon").textContent = phase.emoji;
  document.getElementById("moon-name").textContent = phase.name;
  document.getElementById("moon-detail").textContent = phase.detail;
  document.getElementById("moon-illumination").textContent = `照度の目安: ${illumination}%`;
};

updateMoonPhase();
