async function getPrayerTimes() {

    const response = await fetch(
        "https://api.aladhan.com/v1/timingsByCity?city=Algiers&country=Algeria"
    );

    const data = await response.json();

    return data.data.timings;
}

function timeToMinutes(time) {

    const [hour, minute] = time.split(":");

    return Number(hour) * 60 + Number(minute);
}


function getCurrentPrayer(timings) {

    const now = new Date();

    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

    const prayers = [
        { name: "Fajr", time: timings.Fajr },
        { name: "Dhuhr", time: timings.Dhuhr },
        { name: "Asr", time: timings.Asr },
        { name: "Maghrib", time: timings.Maghrib },
        { name: "Isha", time: timings.Isha }
    ];

    for (const prayer of prayers) {

        const prayerMinutes =
            timeToMinutes(prayer.time);

        if (currentMinutes === prayerMinutes) {

            return prayer;

        }
    }

    return null;
}


function getNextPrayer(timings) {

    const now = new Date();

    const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

    const prayers = [
        { name: "Fajr", time: timings.Fajr },
        { name: "Dhuhr", time: timings.Dhuhr },
        { name: "Asr", time: timings.Asr },
        { name: "Maghrib", time: timings.Maghrib },
        { name: "Isha", time: timings.Isha }
    ];

    for (const prayer of prayers) {

        const prayerMinutes =
            timeToMinutes(prayer.time);

        if (currentMinutes < prayerMinutes) {
            return prayer;
        }
    }

    return prayers[0];
}

async function checkPrayerTime() {
  const timings = await getPrayerTimes(); 

  const currentPrayer = getCurrentPrayer(timings);

  if (currentPrayer) {
    await chrome.storage.local.set({
      isAdhanTime: true,
      currentPrayer: currentPrayer.name,
      currentPrayerTime: currentPrayer.time
    });
  } else {
    const nextPrayer = getNextPrayer(timings);

    await chrome.storage.local.set({
      isAdhanTime: false,
      nextPrayer: nextPrayer.name,
      nextPrayerTime: nextPrayer.time
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("checkPrayerTime", {
    periodInMinutes: 1
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkPrayerTime") {
    checkPrayerTime();
  }
});