const waitingScreen = document.getElementById("waiting-screen");
const adhanScreen = document.getElementById("adhan-screen");

function showWaitingScreen() {
  waitingScreen.classList.remove("hidden");
  adhanScreen.classList.add("hidden");
}

function showAdhanScreen() {
  adhanScreen.classList.remove("hidden");
  waitingScreen.classList.add("hidden");
}

function showError(message) {
  showWaitingScreen();
  document.getElementById("next-prayer-name").textContent = "—";
  document.getElementById("next-prayer-time").textContent = message;
  document.getElementById("countdown").textContent = "";
}

function formatCountdown(nextPrayerTime) {
  const [hour, minute] = nextPrayerTime.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1); // next prayer rolls into tomorrow
  }

  const diffMs = target - now;
  const diffMinutes = Math.floor(diffMs / 60000);
  const hrs = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hrs > 0) {
    return `in ${hrs}h ${mins}m`;
  }
  return `in ${mins}m`;
}

let countdownTimer = null;

function startCountdown(nextPrayerTime) {
  if (countdownTimer) clearInterval(countdownTimer);

  const update = () => {
    document.getElementById("countdown").textContent = formatCountdown(nextPrayerTime);
  };

  update();
  countdownTimer = setInterval(update, 1000);
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function updateNotifyButton(enabled) {
  const btn = document.getElementById("notify-btn");
  btn.textContent = enabled ? "Notifications: ON" : "Notify Me";
  btn.classList.toggle("active", enabled);
}

async function render() {
  const state = await chrome.storage.local.get([
    "isAdhanTime",
    "currentPrayer",
    "currentPrayerTime",
    "nextPrayer",
    "nextPrayerTime",
    "lastError",
    "timingsStale",
    "notificationsEnabled",
    "locationCity",
    "locationCountry",
    "calcMethod",
  ]);

  updateNotifyButton(Boolean(state.notificationsEnabled));

  const locationEl = document.getElementById("location-display");
  if (state.locationCity) {
    locationEl.textContent = `${state.locationCity}, ${state.locationCountry} (method ${state.calcMethod ?? 19})`;
  } else {
    locationEl.textContent = "Algiers, Algeria (method 19)";
  }

  if (state.lastError && !state.nextPrayerTime && !state.currentPrayerTime) {
    stopCountdown();
    showError("Couldn't load prayer times");
    return;
  }

  if (state.isAdhanTime) {
    stopCountdown();
    showAdhanScreen();
    document.getElementById("current-prayer").textContent = state.currentPrayer;
    document.getElementById("current-prayer-time").textContent = state.currentPrayerTime;
  } else {
    showWaitingScreen();
    document.getElementById("next-prayer-name").textContent = state.nextPrayer ?? "—";
    document.getElementById("next-prayer-time").textContent = state.nextPrayerTime ?? "";
    if (state.nextPrayerTime) {
      startCountdown(state.nextPrayerTime);
    }
    if (state.timingsStale) {
      document.getElementById("countdown").textContent +=
        " (offline, using last known times)";
    }
  }
}

document.getElementById("notify-btn").addEventListener("click", async () => {
  const { notificationsEnabled } = await chrome.storage.local.get(
    "notificationsEnabled"
  );
  await chrome.storage.local.set({ notificationsEnabled: !notificationsEnabled });
});

document.getElementById("pray-btn").addEventListener("click", () => {
  chrome.storage.local.set({ isAdhanTime: false });
  render();
});

const settingsToggle = document.getElementById("settings-toggle");
const settingsPanel  = document.getElementById("settings-panel");
const settingsCity   = document.getElementById("settings-city");
const settingsCountry = document.getElementById("settings-country");
const settingsMethod = document.getElementById("settings-method");
const settingsSave   = document.getElementById("settings-save");
const settingsCancel = document.getElementById("settings-cancel");
const settingsStatus = document.getElementById("settings-status");

async function renderSettings() {
  const { locationCity, locationCountry, calcMethod } =
    await chrome.storage.local.get(["locationCity", "locationCountry", "calcMethod"]);
  settingsCity.value    = locationCity    || "Algiers";
  settingsCountry.value = locationCountry || "Algeria";
  settingsMethod.value  = String(calcMethod ?? 19);
}

settingsToggle.addEventListener("click", async () => {
  const hidden = settingsPanel.classList.contains("hidden");
  if (hidden) {
    await renderSettings();
    settingsStatus.textContent = "";
  }
  settingsPanel.classList.toggle("hidden");
});

settingsCancel.addEventListener("click", () => {
  settingsPanel.classList.add("hidden");
});

settingsSave.addEventListener("click", () => {
  const city    = settingsCity.value.trim();
  const country = settingsCountry.value.trim();
  const method  = Number(settingsMethod.value);

  if (!city || !country) {
    settingsStatus.textContent = "City and country are required";
    settingsStatus.style.color = "#f87171";
    return;
  }

  settingsStatus.textContent = "Updating...";
  settingsStatus.style.color = "#fbbf24";

  chrome.runtime.sendMessage(
    { type: "updateSettings", city, country, method },
    (res) => {
      if (res && res.success) {
        settingsStatus.textContent = "Saved";
        settingsStatus.style.color = "#22c55e";
        setTimeout(() => settingsPanel.classList.add("hidden"), 800);
      } else {
        settingsStatus.textContent = "Could not update";
        settingsStatus.style.color = "#f87171";
      }
    }
  );
});

// Keep the popup live if it's left open while storage changes (e.g. the
// minute-tick alarm fires while the user is looking at it).
const PRAYER_STORAGE_KEYS = new Set([
  "isAdhanTime", "currentPrayer", "currentPrayerTime",
  "nextPrayer", "nextPrayerTime", "lastError",
  "timingsStale", "notificationsEnabled",
]);

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    for (const key of Object.keys(changes)) {
      if (PRAYER_STORAGE_KEYS.has(key)) {
        render();
        return;
      }
    }
  }
});

render();
