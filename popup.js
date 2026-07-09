const currentPrayer = {
    name: "Maghrib",
    time: "19:42"
};

document.getElementById("prayer-name").textContent =
    currentPrayer.name;

document.getElementById("prayer-time").textContent =
    currentPrayer.time;

const button = document.getElementById("pray-btn");

button.addEventListener("click", function () {

    document.getElementById("status").textContent =
        "Prayer acknowledged";

});