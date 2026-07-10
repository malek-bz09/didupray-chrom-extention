async function getPrayerTimes() {

    const response = await fetch(
        "https://api.aladhan.com/v1/timingsByCity?city=Algiers&country=Algeria"
    );

    const data = await response.json();

    return data.data.timings;
}
