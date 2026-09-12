document.addEventListener("DOMContentLoaded", function () {

    const citySelect = document.getElementById("weatherCitySelect");
    const loading = document.getElementById("weatherLoading");
    const errorBox = document.getElementById("weatherError");
    const content = document.getElementById("weatherContent");

    const cityLabel = document.getElementById("weatherCityLabel");
    const lastUpdated = document.getElementById("weatherLastUpdated");

    const weatherIcon = document.getElementById("weatherIcon");
    const weatherTemp = document.getElementById("weatherTemp");
    const weatherLabel = document.getElementById("weatherLabel");
    const weatherFeelsLike = document.getElementById("weatherFeelsLike");
    const weatherRain = document.getElementById("weatherRain");
    const weatherHumidity = document.getElementById("weatherHumidity");
    const weatherWind = document.getElementById("weatherWind");
    const weatherPressure = document.getElementById("weatherPressure");

    const forecastRow = document.getElementById("forecastRow");

    //  -- helpers --
    function degToCardinal(deg) {
        if (deg === null || deg === undefined) return "";
        const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE",
                      "S","SSW","SW","WSW","W","WNW","NW","NNW"];
        const idx = Math.round(deg / 22.5) % 16;
        return dirs[idx];
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

    async function loadWeather(cityName) {
        loading.style.display = "block";
        errorBox.classList.add("d-none");
        content.style.display = "none";

        try {
            const res = await fetch(`/api/live-weather?city=${encodeURIComponent(cityName)}`);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();

            // -- current conditions --
            const cur = data.current;
            cityLabel.textContent = data.city;
            lastUpdated.textContent = "Last updated: " + new Date().toLocaleTimeString();

            weatherIcon.textContent = cur.weather_icon || "❓";
            weatherTemp.textContent = `${cur.temperature_c.toFixed(1)}°C`;
            weatherLabel.textContent = cur.weather_label || "—";
            weatherFeelsLike.textContent = `${cur.apparent_temperature_c.toFixed(1)}°C`;

            weatherRain.textContent = `${cur.rain_mm.toFixed(1)} mm`;
            weatherHumidity.textContent = `${cur.humidity_pct}%`;
            weatherWind.textContent =
                `${cur.wind_speed_kmh.toFixed(1)} km/h ${degToCardinal(cur.wind_direction_deg)}`;
            weatherPressure.textContent = `${cur.pressure_hpa.toFixed(0)} hPa`;

            // ----- 7-day forecast -----
            forecastRow.innerHTML = "";
            data.forecast.forEach((day, i) => {
                const col = document.createElement("div");
                col.className = "col-6 col-md-4 col-lg-3 col-xl";
                col.innerHTML = `
                    <div class="card h-100 text-center">
                        <div class="card-body p-2">
                            <div class="fw-bold">${shortDayLabel(day.date, i)}</div>
                            <small class="text-muted">${shortDateLabel(day.date)}</small>
                            <div style="font-size: 2rem; line-height: 1.2;" class="my-1">
                                ${day.weather_icon}
                            </div>
                            <div class="small">${day.weather_label}</div>
                            <div class="mt-2">
                                <strong>${Math.round(day.temp_max_c)}°</strong>
                                <span class="text-muted">/ ${Math.round(day.temp_min_c)}°</span>
                            </div>
                            <div class="small text-muted mt-1">
                                💧 ${day.precip_prob_pct}% · ${day.rain_sum_mm.toFixed(1)} mm
                            </div>
                        </div>
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

    loadWeather(citySelect.value);

    citySelect.addEventListener("change", function () {
        loadWeather(citySelect.value);
    });
});