async function getPrayerTimes() {

    const response = await fetch(
        "https://api.aladhan.com/v1/timingsByCity?city=Algiers&country=Algeria"
    );

    const data = await response.json();

    return data.data.timings;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("checkPrayerTime", {
    periodInMinutes: 1
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkPrayerTime") {
    console.log("Alarm fired, checking prayer time...");
  }
});