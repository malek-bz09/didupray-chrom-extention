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
  ]);

  updateNotifyButton(Boolean(state.notificationsEnabled));

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

// Keep the popup live if it's left open while storage changes (e.g. the
// minute-tick alarm fires while the user is looking at it).
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    render();
  }
});

render();
