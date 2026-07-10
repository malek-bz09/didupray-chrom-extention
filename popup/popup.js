async function getPrayerTimes() {
    try {
        const response = await fetch(
            "https://api.aladhan.com/v1/timingsByCity?city=Algiers&country=Algeria"
        );

        const data = await response.json();

        const timings = data.data.timings;

        updateUI(timings);

    } catch (error) {
        console.error(error);
    }
}

const waitingScreen =
    document.getElementById("waiting-screen");

const adhanScreen =
    document.getElementById("adhan-screen");

function showWaitingScreen() {

    waitingScreen.classList.remove("hidden");
    adhanScreen.classList.add("hidden");

}

function showAdhanScreen() {

    adhanScreen.classList.remove("hidden");
    waitingScreen.classList.add("hidden");

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

function timeToMinutes(time) {

    const [hour, minute] = time.split(":");

    return Number(hour) * 60 + Number(minute);
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

function updateUI(timings) {

    const currentPrayer =
        getCurrentPrayer(timings);

    if (currentPrayer) {

        showAdhanScreen();

        document.getElementById(
            "current-prayer"
        ).textContent =
            currentPrayer.name;

        document.getElementById(
            "current-prayer-time"
        ).textContent =
            currentPrayer.time;

        return;
    }

    showWaitingScreen();

    const nextPrayer =
        getNextPrayer(timings);

    document.getElementById(
        "prayer-name"
    ).textContent =
        nextPrayer.name;

    document.getElementById(
        "prayer-time"
    ).textContent =
        nextPrayer.time;
}

async function init() {
    await getPrayerTimes();
}

init();