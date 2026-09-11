document.addEventListener("DOMContentLoaded", function () {
   const DEMO_MODE = new URLSearchParams(window.location.search).get("demo") === "1";

    const DEMO_DATA = {
        "Manila":      { risk_level: "High",     depth_m: 1.20, rainfall_mm: 45.0, water_level_m: 6.5, soil_moisture_pct: 35.0, confidence_pct: 82.0 },
        "Marikina":    { risk_level: "Moderate", depth_m: 0.75, rainfall_mm: 30.0, water_level_m: 5.2, soil_moisture_pct: 28.0, confidence_pct: 75.0 },
        "Pasig":       { risk_level: "Low",      depth_m: 0.20, rainfall_mm: 12.0, water_level_m: 3.1, soil_moisture_pct: 18.0, confidence_pct: 88.0 },
        "Quezon City": { risk_level: "Moderate", depth_m: 0.60, rainfall_mm: 25.0, water_level_m: 4.5, soil_moisture_pct: 22.0, confidence_pct: 71.0 },
    };

    const DEMO_HOTSPOTS = [
        { name: "España Boulevard", description: "Flood-prone area", latitude: 14.6020, longitude: 120.9850, city: "Manila" },
        { name: "Provident Village", description: "Flood-prone residential area", latitude: 14.6500, longitude: 121.1000, city: "Marikina" },
        { name: "Barangay Pinagbuhatan", description: "Flood-prone area near Pasig River", latitude: 14.5800, longitude: 121.0800, city: "Pasig" },
        { name: "Barangay Bagong Silangan", description: "Flood-prone area near Marikina River", latitude: 14.6800, longitude: 121.1000, city: "Quezon City" },
    ];


    const citySelect = document.getElementById("homeCitySelect");

    // assessment card
    const assessmentLoading = document.getElementById("assessmentLoading");
    const assessmentContent = document.getElementById("assessmentContent");
    const homeRiskLevel = document.getElementById("homeRiskLevel");
    const homeConfidence = document.getElementById("homeConfidence");
    const homeDepth = document.getElementById("homeDepth");
    const homeRainfall = document.getElementById("homeRainfall");
    const homeRiverLevel = document.getElementById("homeRiverLevel");
    const homeSoilMoisture = document.getElementById("homeSoilMoisture");
    const homeAdvisory = document.getElementById("homeAdvisory");
    const riskBox = document.getElementById("riskBox");

    // forecast summary
    const forecastLoading = document.getElementById("forecastLoading");
    const forecastContent = document.getElementById("forecastContent");
    const forecastTrend = document.getElementById("forecastTrend");
    const forecastCards = document.getElementById("forecastCards");

    // alert banner
    const alertBanner = document.getElementById("alertBanner");
    const alertBannerText = document.getElementById("alertBannerText");

    // --helpers--
    function riskColorClass(risk) {
        if (risk === "High") return "bg-danger text-white";
        if (risk === "Moderate") return "bg-warning text-dark";
        return "bg-success text-white";
    }

    function advisoryFor(risk, depthM) {
        if (!depthM || depthM <= 0) {
            return "Conditions are normal — no immediate action needed.";
        }

        if (risk === "High") {
            return "Chest-level flooding. Roads are not passable to all types of vehicles (NPATV). Prepare to evacuate and monitor local announcements.";
        }
        if (risk === "Moderate") {
            return "Tire- to waist-level flooding. Roads are not passable to all types of vehicles (NPATV). Avoid flooded roads and monitor updates.";
        }
        // low risk, but depth > 0
        return "Gutter- to knee-level flooding. Road access ranges from passable to all vehicles (PATV) to not passable to light vehicles (NPLV). Exercise caution.";
    }

    // ---leaflet map---
    let homeMap = null;

    function initMap() {
        const mapEl = document.getElementById("homeMap");
        if (!mapEl) return;

        const metroManilaBounds = L.latLngBounds(
            L.latLng(14.45, 120.90), 
            L.latLng(14.80, 121.20) 
        );

        homeMap = L.map("homeMap", {
            center: [14.60, 121.03],       
            zoom: 11,
            minZoom: 10,         
            maxZoom: 18,  
            maxBounds: metroManilaBounds,
            maxBoundsViscosity: 1.0,
            scrollWheelZoom: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
        }).addTo(homeMap);

    }

    // choropleth polygons
    let cityPolygons = {};
    let riskData = {};

    let hotspotData = [];

    async function loadMapData() {
        if (DEMO_MODE) {
            riskData = {};
            Object.keys(DEMO_DATA).forEach(name => {
                const d = DEMO_DATA[name];
                riskData[name] = {
                    risk_level: d.risk_level,
                    rainfall_mm: d.rainfall_mm,
                    depth_m: d.depth_m,
                    confidence_pct: d.confidence_pct,
                };
            });
            hotspotData = DEMO_HOTSPOTS;
            return { cities: riskData, hotspots: DEMO_HOTSPOTS };
        }


        try {
            const res = await fetch("/api/map-data");
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            riskData = data.cities || {};
            hotspotData = data.hotspots || [];
            return data;
        } catch (err) {
            console.error("Failed to load map data:", err);
            return { cities: {}, hotspots: [] };
        }
    }

    async function drawCityPolygons() {
        if (!homeMap) return;

        try {
            const res = await fetch("/static/geojson/metro_manila_cities.geojson");
            if (!res.ok) throw new Error("GeoJSON not found");
            const geojson = await res.json();

            L.geoJSON(geojson, {
                filter: function (feature) {
                    return feature.geometry.type === "Polygon" ||
                        feature.geometry.type === "MultiPolygon";
                },

                style: function (feature) {
                    const name = feature.properties.name;
                    const info = riskData[name];
                    const risk = info ? info.risk_level : "Low";
                    return {
                        color: riskColorOutline(risk),
                        weight: 2,
                        fillColor: riskColorFill(risk),
                        fillOpacity: 0.45,
                    };
                },
                onEachFeature: function (feature, layer) {
                    const name = feature.properties.name;
                    const info = riskData[name] || {};

                    layer.bindTooltip(`
                        <strong>${name}</strong><br>
                        Risk: ${info.risk_level || "—"}<br>
                        Est. Depth: ${info.depth_m !== undefined ? info.depth_m.toFixed(2) + " m" : "—"}<br>
                        Rainfall: ${info.rainfall_mm !== undefined ? info.rainfall_mm.toFixed(1) + " mm" : "—"}
                    `, { sticky: true });

                    cityPolygons[name] = layer;
                },
            }).addTo(homeMap);

        } catch (err) {
            console.error("Failed to load polygons:", err);
        }
    }

    function riskColorFill(risk) {
        if (risk === "High") return "#dc3545";
        if (risk === "Moderate") return "#ffc107";
        return "#198754";  
    }

    function riskColorOutline(risk) {
        if (risk === "High") return "#70101a";
        if (risk === "Moderate") return "#8c6900";
        return "#0c3e27";  
    }

    function updatePolygonColors() {
        Object.keys(cityPolygons).forEach(name => {
            const info = riskData[name];
            if (!info) return;
            cityPolygons[name].setStyle({
                fillColor: riskColorHex(info.risk_level),
            });
        });
    }

    // hotspot pins
    let hotspotLayer = null;

    function ensureHotspotPane() {
        if (!homeMap.getPane("hotspotPane")) {
            const pane = homeMap.createPane("hotspotPane");
            pane.style.zIndex = 500; 
        }
    }

    function drawHotspots(hotspotList) {
        if (!homeMap || !hotspotList || hotspotList.length === 0) return;

        ensureHotspotPane();

        if (hotspotLayer) {
            homeMap.removeLayer(hotspotLayer);
        }

        hotspotLayer = L.layerGroup().addTo(homeMap);

        hotspotList.forEach(h => {
            if (!h.latitude || !h.longitude) return;

            const marker = L.circleMarker([h.latitude, h.longitude], {
                pane: "hotspotPane",
                radius: 7,
                fillColor: "#fd7e14",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
            }).addTo(hotspotLayer);

            marker.bindPopup(`
                <strong>${h.name}</strong><br>
                <small class="text-muted">${h.city || ""}</small><br>
                <small>${h.description || ""}</small>
            `);

            marker.bindTooltip(h.name, {
                direction: "top",
                offset: [0, -8],
            });
        });
    }

    async function initializeHomePage() {
        const initialCity = citySelect.value;

        loadMapData().then(() => {
            initMap();
            drawCityPolygons();
            drawHotspots(hotspotData);
            checkAlertBanner();
        });

        loadAssessment(initialCity);
        loadForecast(initialCity);
    }

    function focusCity(cityName) {
        if (!homeMap) return;
        const cities = window.APP_CITIES || [];
        const city = cities.find(c => c.name === cityName);
        if (!city || !city.latitude || !city.longitude) return;

        homeMap.flyTo([city.latitude, city.longitude], 13, {
            duration: 1.2
        });
    }

    // --nowcast--
    async function loadAssessment(cityName) {
        if (DEMO_MODE) {
            const d = DEMO_DATA[cityName];
            if (!d) return;

            homeRiskLevel.textContent = d.risk_level;
            homeConfidence.textContent = d.confidence_pct.toFixed(0) + "%";
            homeDepth.textContent = d.depth_m.toFixed(2) + " m";
            homeRainfall.textContent = d.rainfall_mm.toFixed(1) + " mm";
            homeRiverLevel.textContent = d.water_level_m.toFixed(2) + " m";
            homeSoilMoisture.textContent = d.soil_moisture_pct.toFixed(1) + " %";
            homeAdvisory.textContent = advisoryFor(d.risk_level, d.depth_m);

            riskBox.className = "text-center mb-3 p-3 border rounded " + riskColorClass(d.risk_level);

            assessmentLoading.style.display = "none";
            assessmentContent.style.display = "block";
            return;
        }


        assessmentLoading.style.display = "block";
        assessmentContent.style.display = "none";

        try {
            const response = await fetch(`/api/nowcast?city=${encodeURIComponent(cityName)}`);
            if (!response.ok) throw new Error("HTTP " + response.status);

            const data = await response.json();

            homeRiskLevel.textContent = data.risk_level;
            homeConfidence.textContent = data.confidence_pct + "%";
            homeDepth.textContent = data.estimated_depth_m.toFixed(2) + " m";
            homeRainfall.textContent = data.rainfall_mm.toFixed(1) + " mm";
            homeRiverLevel.textContent = data.water_level_m.toFixed(2) + " m";
            homeSoilMoisture.textContent = data.soil_moisture_pct.toFixed(1) + " %";
            homeAdvisory.textContent = advisoryFor(data.risk_level, data.estimated_depth_m);
            // color the risk box
            riskBox.className = "text-center mb-3 p-3 border rounded " + riskColorClass(data.risk_level);

            assessmentLoading.style.display = "none";
            assessmentContent.style.display = "block";
        } catch (error) {
            assessmentLoading.innerHTML = `<span class="text-danger">Failed to load assessment: ${error.message}</span>`;
        }
    }

    // forecast stummary
    async function loadForecast(cityName) {
        if (DEMO_MODE) {
            const d = DEMO_DATA[cityName];
            if (!d) return;

            // Simple trend: pretend it's increasing
            const trend = "Increasing";
            forecastTrend.innerHTML = "↑ " + trend;
            forecastTrend.className = "badge bg-danger";

            forecastCards.innerHTML = "";
            const labelMap = {
                today:    { name: "Today",     sub: "Nowcast" },
                tomorrow: { name: "Tomorrow",  sub: "24-hour" },
                plus48h:  { name: "+48 Hours", sub: "2-day" },
            };

            const fakeDays = [
                { label: "today",    risk_level: d.risk_level,               estimated_depth_m: d.depth_m,               rainfall_mm: d.rainfall_mm,               confidence_pct: d.confidence_pct },
                { label: "tomorrow", risk_level: d.risk_level === "Low" ? "Moderate" : d.risk_level, estimated_depth_m: d.depth_m * 1.2, rainfall_mm: d.rainfall_mm * 1.3, confidence_pct: 70 },
                { label: "plus48h",  risk_level: d.risk_level,               estimated_depth_m: d.depth_m * 0.9,          rainfall_mm: d.rainfall_mm * 0.8,          confidence_pct: 78 },
            ];

            fakeDays.forEach(p => {
                const meta = labelMap[p.label];
                let borderClass = "border-secondary";
                if (p.risk_level === "High") borderClass = "border-danger border-2";
                else if (p.risk_level === "Moderate") borderClass = "border-warning border-2";
                else if (p.risk_level === "Low") borderClass = "border-success border-2";

                const col = document.createElement("div");
                col.className = "col-md-4";
                col.innerHTML = `
                    <div class="card h-100 ${borderClass}">
                        <div class="card-header text-center bg-light">
                            <strong>${meta.name}</strong>
                            <div class="small text-muted">${meta.sub}</div>
                        </div>
                        <div class="card-body text-center">
                            <div class="badge ${riskColorClass(p.risk_level)} mb-3" style="font-size: 1.1rem; padding: 0.5rem 1rem;">
                                ${p.risk_level}
                            </div>
                            <div class="small text-start">
                                <div class="d-flex justify-content-between mb-1">
                                    <span class="text-muted">Est. Depth:</span>
                                    <strong>${p.estimated_depth_m.toFixed(2)} m</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-1">
                                    <span class="text-muted">Rainfall:</span>
                                    <strong>${p.rainfall_mm.toFixed(1)} mm</strong>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span class="text-muted">Confidence:</span>
                                    <strong>${p.confidence_pct.toFixed(0)}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                forecastCards.appendChild(col);
            });

            forecastLoading.style.display = "none";
            forecastContent.style.display = "block";
            return;
        }


        forecastLoading.style.display = "block";
        forecastContent.style.display = "none";

        try {
            const response = await fetch(`/api/forecast?city=${encodeURIComponent(cityName)}`);
            if (!response.ok) throw new Error("HTTP " + response.status);

            const data = await response.json();

            const trendIcons = {
                "Increasing": "↑",
                "Decreasing": "↓",
                "Steady": "→"
            };
            forecastTrend.innerHTML =
                `${trendIcons[data.trend] || "→"} ${data.trend}`;
            forecastTrend.className = "badge";
            if (data.trend === "Increasing") forecastTrend.classList.add("bg-danger");
            else if (data.trend === "Decreasing") forecastTrend.classList.add("bg-success");
            else forecastTrend.classList.add("bg-secondary");

            forecastCards.innerHTML = "";
            const labelMap = {
                today:    { name: "Today",     sub: "Nowcast" },
                tomorrow: { name: "Tomorrow",  sub: "24-hour" },
                plus48h:  { name: "+48 Hours", sub: "2-day" }
            };

            data.predictions.forEach(p => {
                const meta = labelMap[p.label] || { name: p.label, sub: "" };

                let borderClass = "border-secondary";
                if (p.risk_level === "High") borderClass = "border-danger border-2";
                else if (p.risk_level === "Moderate") borderClass = "border-warning border-2";
                else if (p.risk_level === "Low") borderClass = "border-success border-2";

                const col = document.createElement("div");
                col.className = "col-md-4";
                col.innerHTML = `
                    <div class="card h-100 ${borderClass}">
                        <div class="card-header text-center bg-light">
                            <strong>${meta.name}</strong>
                            <div class="small text-muted">${meta.sub}</div>
                        </div>
                        <div class="card-body text-center">
                            <div class="badge ${riskColorClass(p.risk_level)} mb-3" style="font-size: 1.1rem; padding: 0.5rem 1rem;">
                                ${p.risk_level}
                            </div>
                            <div class="small text-start">
                                <div class="d-flex justify-content-between mb-1">
                                    <span class="text-muted">Est. Depth:</span>
                                    <strong>${p.estimated_depth_m.toFixed(2)} m</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-1">
                                    <span class="text-muted">Rainfall:</span>
                                    <strong>${p.rainfall_mm.toFixed(1)} mm</strong>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <span class="text-muted">Confidence:</span>
                                    <strong>${p.confidence_pct.toFixed(0)}%</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                forecastCards.appendChild(col);
            });

            forecastLoading.style.display = "none";
            forecastContent.style.display = "block";
        } catch (error) {
            forecastLoading.innerHTML = `<span class="text-danger">Failed to load forecast: ${error.message}</span>`;
        }
    }

    // alert banner
    async function checkAlertBanner() {
        if (DEMO_MODE) {
            const highRisk = Object.entries(DEMO_DATA)
                .filter(([name, d]) => d.risk_level === "High" && d.depth_m > 0)
                .map(([name, d]) => `${name} (est. ${d.depth_m.toFixed(2)} m)`);

            if (highRisk.length > 0) {
                alertBannerText.innerHTML = `High risk detected in: <strong>${highRisk.join(", ")}</strong>. Monitor local announcements.`;
                alertBanner.classList.remove("d-none");
            } else {
                alertBanner.classList.add("d-none");
            }
            return;
        }



        const cities = window.APP_CITIES || [];
        const highRiskCities = [];

        for (const city of cities) {
            try {
                const response = await fetch(`/api/nowcast?city=${encodeURIComponent(city.name)}`);
                if (!response.ok) continue;
                const data = await response.json();

                if (data.risk_level === "High" && data.estimated_depth_m > 0) {
                    highRiskCities.push({
                        name: city.name,
                        depth: data.estimated_depth_m,
                        confidence: data.confidence_pct,
                    });
                }
            } catch (e) {
            }
        }

        if (highRiskCities.length > 0) {
            const summary = highRiskCities
                .map(c => `${c.name} (est. ${c.depth.toFixed(2)} m)`)
                .join(", ");
            alertBannerText.innerHTML =
                `High risk detected in: <strong>${summary}</strong>. ` +
                `Monitor local announcements and prepare to evacuate if needed.`;
            alertBanner.classList.remove("d-none");
            const ts = document.getElementById("alertBannerTimestamp");
            if (ts) ts.textContent = "Last checked: " + new Date().toLocaleTimeString();
        } else {
            alertBanner.classList.add("d-none");
        }
    }

    // initial loads
    citySelect.addEventListener("change", function () {
        const city = citySelect.value;
        loadAssessment(city);
        loadForecast(city);
        focusCity(city);
    });

    initializeHomePage();

});