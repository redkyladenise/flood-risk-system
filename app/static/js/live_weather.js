document.addEventListener("DOMContentLoaded", function () {
    const cityMenu = document.getElementById("weatherCityDropdownMenu");
    const cityLabel = document.getElementById("weatherCityLabel");

    const loading = document.getElementById("weatherLoading");
    const errorBox = document.getElementById("weatherError");
    const content = document.getElementById("weatherContent");

    const weatherDate = document.getElementById("weatherDate");
    const weatherIcon = document.getElementById("weatherIcon");
    const weatherTemp = document.getElementById("weatherTemp");
    const weatherLabel = document.getElementById("weatherLabel");

    const weatherWind = document.getElementById("weatherWind");
    const weatherHumidity = document.getElementById("weatherHumidity");
    const weatherRain = document.getElementById("weatherRain");
    const weatherPressure = document.getElementById("weatherPressure");

    const forecastRow = document.getElementById("forecastRow");

    // helpers
    function degToCardinal(deg) {
        if (deg === null || deg === undefined) return "";
        const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
                      "S","SSW","SW","WSW","W","WNW","NW","NNW"];
        const idx = Math.round(deg / 22.5) % 16;
        return dirs[idx];
    }

    function formatHeaderDate(isoTime) {
        const d = isoTime ? new Date(isoTime) : new Date();
        return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    }

    function shortDayLabel(isoDate, index) {
        if (index === 0) return "Today";
        const d = new Date(isoDate + "T00:00:00");
        return d.toLocaleDateString("en-US", { weekday: "short" });
    }

    function shortDateLabel(isoDate) {
        const d = new Date(isoDate + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    function buildCityMenu(cities, onSelect) {
        if (!cityMenu) return;
        cityMenu.innerHTML = "";

        cities.forEach(city => {
            const li = document.createElement("li");
            li.innerHTML = `<a class="dropdown-item" href="#" data-city="${city.name}">${city.name}</a>`;
            li.querySelector("a").addEventListener("click", function (e) {
                e.preventDefault();
                onSelect(city.name);
            });
            cityMenu.appendChild(li);
        });
    }

    async function loadWeather(cityName) {
        loading.style.display = "block";
        errorBox.classList.add("d-none");
        content.style.display = "none";

        try {
            const res = await fetch(`/api/live-weather?city=${encodeURIComponent(cityName)}`);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();

            const cur = data.current;

            // header
            cityLabel.textContent = data.city;
            weatherDate.textContent = formatHeaderDate(cur.time);

            // temperature
            if (cur.weather_icon_png) {
                weatherIcon.src = cur.weather_icon_png;
                weatherIcon.style.display = "block";
            } else {
                weatherIcon.style.display = "none";
            }

            weatherTemp.textContent = `${cur.temperature_c.toFixed(0)}°C`;
            weatherLabel.textContent = cur.weather_label || "—";

            // deets
            weatherWind.textContent =
                `${cur.wind_speed_kmh.toFixed(1)} km/h ${degToCardinal(cur.wind_direction_deg)}`.trim();
            weatherHumidity.textContent = `${cur.humidity_pct}%`;
            weatherRain.textContent = `${cur.rain_mm.toFixed(1)} mm`;
            weatherPressure.textContent = `${cur.pressure_hpa.toFixed(0)} hPa`;

            // 7 day forecast
            forecastRow.innerHTML = "";

            data.forecast.forEach((day, i) => {
                const col = document.createElement("div");
                col.className = "forecast-day";

                const iconHtml = day.weather_icon_png
                    ? `<img src="${day.weather_icon_png}" alt="${day.weather_label}" class="forecast-icon">`
                    : `<div class="forecast-icon" style="font-size:2rem;line-height:56px;">${day.weather_icon}</div>`;

                col.innerHTML = `
                    <div class="forecast-day-name">${shortDayLabel(day.date, i)}</div>
                    <div class="forecast-date">${shortDateLabel(day.date)}</div>
                    ${iconHtml}
                    <div class="forecast-condition">${day.weather_label}</div>
                    <div class="forecast-temp">${Math.round(day.temp_max_c)}°</div>
                    <div class="forecast-rain">
                        <svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentCOlor"><path d="M558-84q-15 8-30.5 2.5T504-102l-60-120q-8-15-2.5-30.5T462-276q15-8 30.5-2.5T516-258l60 120q8 15 2.5 30.5T558-84Zm240 0q-15 8-30.5 2.5T744-102l-60-120q-8-15-2.5-30.5T702-276q15-8 30.5-2.5T756-258l60 120q8 15 2.5 30.5T798-84Zm-480 0q-15 8-30.5 2.5T264-102l-60-120q-8-15-2.5-30.5T222-276q15-8 30.5-2.5T276-258l60 120q8 15 2.5 30.5T318-84Zm-18-236q-91 0-155.5-64.5T80-540q0-83 55-145t136-73q32-57 87.5-89.5T480-880q90 0 156.5 57.5T717-679q69 6 116 57t47 122q0 75-52.5 127.5T700-320H300Zm0-80h400q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-40q0-66-47-113t-113-47q-48 0-87.5 26T333-704l-10 24h-25q-57 2-97.5 42.5T160-540q0 58 41 99t99 41Zm180-200Z"/></svg>
                        ${day.precip_prob_pct}% · ${day.rain_sum_mm.toFixed(1)} mm
                    </div>
                `;

                forecastRow.appendChild(col);
            });

            loading.style.display = "none";
            content.style.display = "block";

        } catch (err) {
            console.error("Failed to load weather:", err);
            loading.style.display = "none";
            errorBox.classList.remove("d-none");
        }
    }

    const cities = window.LIVE_WEATHER_CITIES || [];

    buildCityMenu(cities, function (cityName) {
        loadWeather(cityName);
    });

    const initialCity = cities.length > 0 ? cities[0].name : "Manila";
    loadWeather(initialCity);
});