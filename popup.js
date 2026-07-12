async function init() {
  const state = await chrome.storage.local.get([
    "isAdhanTime", "currentPrayer", "currentPrayerTime",
    "nextPrayer", "nextPrayerTime"
  ]);

  if (state.isAdhanTime) {
    showAdhanScreen();
    document.getElementById("current-prayer").textContent = state.currentPrayer;
    document.getElementById("current-prayer-time").textContent = state.currentPrayerTime;
  } else {
    showWaitingScreen();
    document.getElementById("prayer-name").textContent = state.nextPrayer;
    document.getElementById("prayer-time").textContent = state.nextPrayerTime;
  }
}

init();
const waitingScreen =
    document.getElementById("waiting-screen");

const adhanScreen =
    document.getElementById("adhan-screen");


document.getElementById("notify-btn").addEventListener("click", () => {
  chrome.storage.local.set({ notificationsEnabled: true });
});

function showWaitingScreen() {

    waitingScreen.classList.remove("hidden");
    adhanScreen.classList.add("hidden");

}

function showAdhanScreen() {

    adhanScreen.classList.remove("hidden");
    waitingScreen.classList.add("hidden");

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