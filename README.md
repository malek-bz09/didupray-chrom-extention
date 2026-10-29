DIDUPRAY

DIDUPRAY is a Chrome extension that blocks distracting websites when it is time to pray. This is my first real project, and I built it to solve a problem I run into almost every day: getting pulled into a website and losing track of prayer time.

The Problem

It is easy to open a site "for two minutes" and still be there when adhan comes in. DIDUPRAY removes that excuse by locking certain sites the moment a prayer time starts, and only unlocking them once I confirm I have prayed.

How It Works


The extension fetches daily prayer times from the Aladhan API for the city, country and calculation method set in the popup's settings (Algiers, Algeria, method 19 by default). Times are cached once per day.
A background script checks the current time against those prayer times every minute using the Chrome Alarms API.
When a prayer time starts, the extension blocks a configured list of websites (YouTube, Instagram, TikTok, Facebook, X/Twitter). Any attempt to visit them, and any tab that is already open on them, is redirected to a "Time to Pray" page.
Blocking stays on until you confirm you have prayed, or until the next prayer starts. A late or missed alarm tick can't skip a prayer.
Opening the extension popup shows either:

The next prayer and a countdown to it, or
The current prayer, if it is adhan time right now.



A "Notify Me" button lets me turn website blocking on or off.
A "Wlh I Prayed" button unlocks the sites again once I am done praying. That prayer is remembered as done for the rest of the day.


Features


Live countdown to the next prayer
Automatic daily prayer time refresh, cached so the extension does not call the API every minute
Website blocking during adhan time, using Chrome's declarativeNetRequest API
A toggle to enable or disable blocking without uninstalling the extension
Basic error handling: if the prayer times API is temporarily down, the extension falls back to the last known times instead of showing nothing


Project Structure

manifest.json   Extension config and permissions
background.js   Service worker: fetches and caches prayer times, tracks the current prayer, manages blocking rules
popup.html/js/css   The popup UI: countdown, Notify Me toggle, Wlh I Prayed button, settings panel
blocked.html    The page blocked sites redirect to


Installing for development

1. Open chrome://extensions and enable Developer mode.
2. Click "Load unpacked" and select this folder.
3. After changing code, click the reload icon on the extension's card.


Testing manually

To trigger a prayer without waiting for one, pretend it is prayer time by editing the cached timings. Open the service worker console (chrome://extensions, then "service worker" under DIDUPRAY) and run:

  const d = new Date(); d.setMinutes(d.getMinutes() - 1);
  const t = `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  const { timings } = await chrome.storage.local.get("timings");
  await chrome.storage.local.set({ timings: { ...timings, Dhuhr: t, Asr: "23:58", Maghrib: "23:59", Isha: "23:59" }, acknowledged: null });
  await checkPrayerTime();

This sets Dhuhr to one minute ago. Then check:

- With "Notify Me" ON, open youtube.com: it redirects to the "Time to Pray" page. An already-open YouTube tab is redirected too.
- Wait 2-3 minutes: sites stay blocked. Blocking no longer ends after one minute.
- A site whose name only starts the same, e.g. x.company.com, is not blocked.
- Click "Wlh I Prayed": sites unlock, the popup switches to the next-prayer countdown right away, and blocking doesn't come back on the next tick.
- With "Notify Me" OFF, nothing is blocked even during prayer time.

To check that the cache works, keep the service worker DevTools Network tab open for a few minutes. You should see only one request to api.aladhan.com per day (or one per settings change), not one per minute.

To reset everything: await chrome.storage.local.clear(); await checkPrayerTime();

