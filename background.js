const PRAYER_NAMES = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function timeToMinutes(time) {
  const [hour, minute] = time.split(":");
  return Number(hour) * 60 + Number(minute);
}

function toPrayerList(timings) {
  return PRAYER_NAMES.map((name) => ({ name, time: timings[name] }));
}

function getCurrentPrayer(timings) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const prayer of toPrayerList(timings)) {
    if (currentMinutes === timeToMinutes(prayer.time)) {
      return prayer;
    }
  }
  return null;
}

function getNextPrayer(timings) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (const prayer of toPrayerList(timings)) {
    if (currentMinutes < timeToMinutes(prayer.time)) {
      return prayer;
    }
  }
  // Nothing left today, next one is tomorrow's Fajr
  return toPrayerList(timings)[0];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPrayerTimes() {
  const url =
    "https://api.aladhan.com/v1/timingsByCity?city=Algiers&country=Algeria";

  const maxAttempts = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        // 5xx = API-side issue, worth retrying. 4xx = our request is
        // wrong, retrying won't help.
        if (response.status >= 500 && attempt < maxAttempts) {
          await sleep(attempt * 1000); // 1s, then 2s
          continue;
        }
        throw new Error(`Aladhan API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data.timings;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await sleep(attempt * 1000);
      }
    }
  }

  throw lastError;
}

// Fetch fresh timings from the API, but only once per calendar day.
// Returns the cached (or newly fetched) timings. If the API is down,
// falls back to whatever timings we last had (even if stale) rather
// than leaving the user with nothing.
async function getTodaysTimings() {
  const today = new Date().toDateString();
  const stored = await chrome.storage.local.get(["timings", "timingsDate"]);

  if (stored.timings && stored.timingsDate === today) {
    return { timings: stored.timings, stale: false };
  }

  try {
    const timings = await fetchPrayerTimes();
    await chrome.storage.local.set({ timings, timingsDate: today });
    return { timings, stale: false };
  } catch (err) {
    if (stored.timings) {
      // API is down but we have yesterday's (or older) timings cached.
      // Better to show slightly-off times than nothing at all.
      console.warn("Using stale cached timings due to fetch failure:", err);
      return { timings: stored.timings, stale: true };
    }
    throw err;
  }
}

// ---- Site blocking ----
// Sites to block while it's adhan time and blocking is enabled.
// Edit this list to whatever you want blocked.
const BLOCKED_SITES = [
  "youtube.com",
  "instagram.com",
  "tiktok.com",
  "facebook.com",
  "x.com",
  "twitter.com",
];

const BLOCK_RULE_ID_START = 1000;

function buildBlockRules() {
  return BLOCKED_SITES.map((site, i) => ({
    id: BLOCK_RULE_ID_START + i,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { extensionPath: "/blocked.html" },
    },
    condition: {
      urlFilter: `||${site}`,
      resourceTypes: ["main_frame"],
    },
  }));
}

async function enableBlocking() {
  const rules = buildBlockRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map((r) => r.id),
    addRules: rules,
  });
}

async function disableBlocking() {
  const ruleIds = BLOCKED_SITES.map((_, i) => BLOCK_RULE_ID_START + i);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ruleIds,
    addRules: [],
  });
}

// Reconciles the declarativeNetRequest rules with current state:
// block sites only when it's adhan time AND the user has notifications on.
async function syncBlocking() {
  const { isAdhanTime, notificationsEnabled } = await chrome.storage.local.get(
    ["isAdhanTime", "notificationsEnabled"]
  );

  if (isAdhanTime && notificationsEnabled) {
    await enableBlocking();
  } else {
    await disableBlocking();
  }
}

// ---- Prayer time checking ----

async function checkPrayerTime() {
  try {
    const { timings, stale } = await getTodaysTimings();
    const currentPrayer = getCurrentPrayer(timings);

    if (currentPrayer) {
      await chrome.storage.local.set({
        isAdhanTime: true,
        currentPrayer: currentPrayer.name,
        currentPrayerTime: currentPrayer.time,
        lastError: null,
        timingsStale: stale,
      });
    } else {
      const nextPrayer = getNextPrayer(timings);
      await chrome.storage.local.set({
        isAdhanTime: false,
        nextPrayer: nextPrayer.name,
        nextPrayerTime: nextPrayer.time,
        lastError: null,
        timingsStale: stale,
      });
    }
    await syncBlocking();
  } catch (err) {
    console.error("checkPrayerTime failed:", err);
    await chrome.storage.local.set({ lastError: err.message });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  checkPrayerTime(); // run immediately, don't wait for the first alarm tick
  chrome.alarms.create("checkPrayerTime", { periodInMinutes: 1 });
});

// In case the service worker was restarted and the alarm already exists,
// make sure we still have data on startup.
chrome.runtime.onStartup.addListener(() => {
  checkPrayerTime();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkPrayerTime") {
    checkPrayerTime();
  }
});

// React instantly (don't wait for the next minute-tick) when the popup
// toggles Notify Me, or clicks "Wlh I Prayed" (which sets isAdhanTime: false).
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.notificationsEnabled || changes.isAdhanTime) {
    syncBlocking();
  }
});
