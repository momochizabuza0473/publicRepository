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
const SLACK_WEBHOOK_KEY = "moonPhaseSlackWebhook";
const SLACK_ENABLED_KEY = "moonPhaseSlackEnabled";
const DAILY_NOTIFICATION_HOUR = 6;
let lastSlackSentAt = 0;
let scheduledTimeoutId = null;

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

  maybeSendSlackNotification({ now, phase, illumination });
};

updateMoonPhase();
scheduleNextUpdate();

const getSlackSettings = () => ({
  webhookUrl: localStorage.getItem(SLACK_WEBHOOK_KEY) ?? "",
  enabled: localStorage.getItem(SLACK_ENABLED_KEY) === "true",
});

const setSlackSettings = ({ webhookUrl, enabled }) => {
  localStorage.setItem(SLACK_WEBHOOK_KEY, webhookUrl);
  localStorage.setItem(SLACK_ENABLED_KEY, String(enabled));
};

const updateSlackStatus = (message) => {
  const status = document.getElementById("slack-status");
  if (status) {
    status.textContent = message;
  }
};

const maybeSendSlackNotification = async ({ now, phase, illumination }) => {
  const { webhookUrl, enabled } = getSlackSettings();
  if (!enabled || !webhookUrl) {
    return;
  }

  const nowTimestamp = now.getTime();
  if (!shouldSendDailyNotification(now, nowTimestamp)) {
    return;
  }

  lastSlackSentAt = nowTimestamp;
  const payload = {
    text: `🌙 ${formatDate(now)}の月の満ち欠け: ${phase.emoji} ${phase.name} / 照度の目安 ${illumination}%`,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack送信に失敗しました (${response.status})`);
    }
  } catch (error) {
    updateSlackStatus(`Slack送信エラー: ${error.message}`);
  }
};

const shouldSendDailyNotification = (now, nowTimestamp) => {
  if (now.getHours() !== DAILY_NOTIFICATION_HOUR) {
    return false;
  }

  const lastDate = lastSlackSentAt ? new Date(lastSlackSentAt) : null;
  const isSameDay =
    lastDate &&
    lastDate.getFullYear() === now.getFullYear() &&
    lastDate.getMonth() === now.getMonth() &&
    lastDate.getDate() === now.getDate();

  if (isSameDay) {
    return false;
  }

  return nowTimestamp - lastSlackSentAt > 60 * 60 * 1000;
};

const scheduleNextUpdate = () => {
  if (scheduledTimeoutId) {
    clearTimeout(scheduledTimeoutId);
  }

  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(DAILY_NOTIFICATION_HOUR, 0, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delay = nextRun.getTime() - now.getTime();
  scheduledTimeoutId = setTimeout(() => {
    updateMoonPhase();
    scheduleNextUpdate();
  }, delay);
};

const initSlackSettings = () => {
  const form = document.getElementById("slack-settings");
  const webhookInput = document.getElementById("slack-webhook");
  const enabledInput = document.getElementById("slack-enabled");
  if (!form || !webhookInput || !enabledInput) {
    return;
  }

  const settings = getSlackSettings();
  webhookInput.value = settings.webhookUrl;
  enabledInput.checked = settings.enabled;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const webhookUrl = webhookInput.value.trim();
    const enabled = enabledInput.checked;
    setSlackSettings({ webhookUrl, enabled });
    updateSlackStatus("保存しました。");

    if (enabled) {
      updateMoonPhase();
      updateSlackStatus("保存しました。通知を送信しました。");
    }
  });
};

initSlackSettings();
