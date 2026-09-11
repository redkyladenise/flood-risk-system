// wait for the page to fully load before running any code
document.addEventListener("DOMContentLoaded", function () {

    // Get references to all the elements we need
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

    // -- sync sliders and numeric inputs (both directions) ---

    rainfallSlider.addEventListener("input", function () {
        rainfallInput.value = rainfallSlider.value;
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

            // update results
            riskLevelResult.textContent = data.risk_level;
            confidenceResult.textContent = data.confidence_pct + "%";
            depthResult.textContent = data.estimated_depth_m + " m";

            probabilityBreakdown.innerHTML = "";
            const sortedProbs = Object.entries(data.probabilities).sort((a, b) => b[1] - a[1]);

            sortedProbs.forEach(([label, prob]) => {
                const row = document.createElement("div");
                row.className = "d-flex justify-content-between mb-1";
                row.innerHTML = `
                    <span>${label}</span>
                    <span>${prob.toFixed(1)}%</span>
                `;
                probabilityBreakdown.appendChild(row);
            });

            // show results
            resultsPanel.style.display = "block";
            simulatorRow.classList.remove("justify-content-center");
            

        } catch (error) {
            alert("Error running simulation: " + error.message);
        } finally {
            // re-enable button
            simulateBtn.disabled = false;
            simulateBtn.textContent = "Simulate";
        }
    });
});