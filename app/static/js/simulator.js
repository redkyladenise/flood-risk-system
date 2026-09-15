document.addEventListener("DOMContentLoaded", function () {
    const citySelect = document.getElementById("citySelect");
    const rainfallSlider = document.getElementById("rainfallSlider");
    const riverSlider = document.getElementById("riverSlider");
    const soilSlider = document.getElementById("soilSlider");
    const rainfallInput = document.getElementById("rainfallInput");
    const riverInput = document.getElementById("riverInput");
    const soilInput = document.getElementById("soilInput");
    const simulateBtn = document.getElementById("simulateBtn");

    const resultsPanel = document.getElementById("resultsPanel");
    const simulatorRow = document.getElementById("simulatorRow");
    const riskLevelResult = document.getElementById("riskLevelResult");
    const confidenceResult = document.getElementById("confidenceResult");
    const depthResult = document.getElementById("depthResult");
    const probabilityBreakdown = document.getElementById("probabilityBreakdown");

    function updateSliderFill(slider) {
        const min = parseFloat(slider.min) || 0;
        const max = parseFloat(slider.max) || 100;
        const val = parseFloat(slider.value) || 0;
        const pct = ((val - min) / (max - min)) * 100;
        slider.style.setProperty("--fill", pct + "%");
    }

    // -- sync sliders and numeric inputs (both drections) ---
    rainfallSlider.addEventListener("input", function () {
        rainfallInput.value = rainfallSlider.value;
        updateSliderFill(rainfallSlider);
    });

    rainfallInput.addEventListener("input", function () {
        let val = parseFloat(rainfallInput.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        rainfallSlider.value = val;
    });

    rainfallInput.addEventListener("blur", function () {
        let val = parseFloat(rainfallInput.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 60) val = 60;
        rainfallInput.value = val;
        rainfallSlider.value = val;
    });

    riverSlider.addEventListener("input", function () {
        riverInput.value = riverSlider.value;
        updateSliderFill(riverSlider);
    });

    riverInput.addEventListener("input", function () {
        let val = parseFloat(riverInput.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 8) val = 8;
        riverSlider.value = val;
    });

    riverInput.addEventListener("blur", function () {
        let val = parseFloat(riverInput.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 8) val = 8;
        riverInput.value = val;
        riverSlider.value = val;
    });

    soilSlider.addEventListener("input", function () {
        soilInput.value = soilSlider.value;
        updateSliderFill(soilSlider);
    });

    soilInput.addEventListener("input", function () {
        let val = parseFloat(soilInput.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        soilSlider.value = val;
    });

    soilInput.addEventListener("blur", function () {
        let val = parseFloat(soilInput.value);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 100) val = 100;
        soilInput.value = val;
        soilSlider.value = val;
    });

    // scale/meter 
    function updateRiskGauge(riskLevel) {
        const pointer = document.getElementById("gaugePointer");
        if (!pointer) return;
        let angle = -60;
        if (riskLevel === "Moderate") angle = 0;
        else if (riskLevel === "High") angle = 60;

        pointer.setAttribute("transform", `rotate(${angle}, 100, 100)`);
    }

    function updateConfidenceGauge(pct) {
        const arc = document.getElementById("confidenceArc");
        if (!arc) return;

        const arcLength = 251.3;
        const offset = arcLength * (1 - pct / 100);
        arc.setAttribute("stroke-dashoffset", offset);
    }

    // -- simulate button click handler ---
    simulateBtn.addEventListener("click", async function () {
        const payload = {
            rainfall: parseFloat(rainfallInput.value),
            river_level: parseFloat(riverInput.value),
            soil_moisture: parseFloat(soilInput.value),
            city: citySelect.value
        };

        simulateBtn.disabled = true;
        simulateBtn.textContent = "Running...";

        try {
            const response = await fetch("/api/simulate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Server responded with " + response.status);
            }

            const data = await response.json();

            riskLevelResult.textContent = data.risk_level;
            riskLevelResult.style.color =
                data.risk_level === "High" ? "#dc3545" :
                data.risk_level === "Moderate" ? "#d39e00" :
                "#198754";
            updateRiskGauge(data.risk_level);

            confidenceResult.textContent = data.confidence_pct + "%";
            updateConfidenceGauge(data.confidence_pct);

            depthResult.textContent = data.estimated_depth_m + " m";

            probabilityBreakdown.innerHTML = "";
            const tierOrder = { "High": 0, "Moderate": 1, "Low": 2 };
            const sortedProbs = Object.entries(data.probabilities).sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1];
                return (tierOrder[a[0]] ?? 99) - (tierOrder[b[0]] ?? 99);
            });

            const barColors = {
                Low: "#198754",
                Moderate: "#ffc107",
                High: "#dc3545"
            };

            sortedProbs.forEach(([label, prob]) => {
                const color = barColors[label] || "#6c757d";

                const row = document.createElement("div");
                row.className = "d-flex align-items-center mb-2";
                row.innerHTML = `
                    <span class="me-2 fw-bold" style="min-width: 75px;">${label}</span>
                    <div class="prob-bar" style="background: ${color}; width: ${prob}%;"></div>
                    <span class="ms-2 small fw-bold">${prob.toFixed(1)}%</span>
                `;
                probabilityBreakdown.appendChild(row);
            });
            resultsPanel.style.display = "block";
            simulatorRow.classList.remove("justify-content-center");
            

        } catch (error) {
            alert("Error running simulation: " + error.message);
        } finally {
            simulateBtn.disabled = false;
            simulateBtn.textContent = "Simulate";
        }
    });

    updateSliderFill(rainfallSlider);
    updateSliderFill(riverSlider);
    updateSliderFill(soilSlider);
});