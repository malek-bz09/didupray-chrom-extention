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
  const { locationCity, locationCountry, calcMethod } =
    await chrome.storage.local.get([
      "locationCity",
      "locationCountry",
      "calcMethod",
    ]);

  const city = locationCity || "Algiers";
  const country = locationCountry || "Algeria";
  const method = calcMethod ?? 19;

  const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;

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
      await chrome.storage.local.set({
        locationCity: city,
        locationCountry: country,
        calcMethod: method,
      });
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


async function getTodaysTimings() {
  const today = new Date().toDateString();
  const stored = await chrome.storage.local.get([
    "timings", "timingsDate",
    "locationCity", "locationCountry", "calcMethod",
  ]);

  const cacheKey = `${stored.locationCity || "Algiers"}|${stored.locationCountry || "Algeria"}|${stored.calcMethod ?? 19}`;

  if (stored.timings && stored.timingsDate === today && stored.timingsCacheKey === cacheKey) {
    return { timings: stored.timings, stale: false };
  }

  try {
    const timings = await fetchPrayerTimes();
    await chrome.storage.local.set({ timings, timingsDate: today, timingsCacheKey: cacheKey });
    return { timings, stale: false };
  } catch (err) {
    if (stored.timings) {

      console.warn("Using stale cached timings due to fetch failure:", err);
      return { timings: stored.timings, stale: true };
    }
    throw err;
  }
}


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


chrome.runtime.onStartup.addListener(() => {
  checkPrayerTime();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkPrayerTime") {
    checkPrayerTime();
  }
});


chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (changes.notificationsEnabled || changes.isAdhanTime) {
    syncBlocking();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "updateSettings") {
    chrome.storage.local
      .set({
        locationCity: msg.city,
        locationCountry: msg.country,
        calcMethod: msg.method,
      })
      .then(() => checkPrayerTime())
      .then((ok) => sendResponse({ success: ok }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});
