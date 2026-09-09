// Wait for the page to fully load before running any code
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
    const resultsPlaceholder = document.getElementById("resultsPlaceholder");
    const resultsContent = document.getElementById("resultsContent");
    const riskLevelResult = document.getElementById("riskLevelResult");
    const confidenceResult = document.getElementById("confidenceResult");
    const depthResult = document.getElementById("depthResult");
    const probabilityBreakdown = document.getElementById("probabilityBreakdown");

    // ============================================================
    // Sync sliders and numeric inputs (both directions)
    // ============================================================

    // Rainfall: slider -> input, and input -> slider
    rainfallSlider.addEventListener("input", function () {
        rainfallInput.value = rainfallSlider.value;
    });

    rainfallInput.addEventListener("input", function () {
        let val = parseFloat(rainfallInput.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 60) val = 60;
        rainfallSlider.value = val;
    });

    // River Level: slider -> input, and input -> slider
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

    // Soil Moisture: slider -> input, and input -> slider
    soilSlider.addEventListener("input", function () {
        soilInput.value = soilSlider.value;
    });

    soilInput.addEventListener("input", function () {
        let val = parseFloat(soilInput.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 70) val = 70;
        soilSlider.value = val;
    });

    // Simulate button click handler
    simulateBtn.addEventListener("click", async function () {

        // Gather current values
        const payload = {
            rainfall: parseFloat(rainfallInput.value),
            river_level: parseFloat(riverInput.value),
            soil_moisture: parseFloat(soilInput.value),
            city: citySelect.value
        };

        // Disable button and show loading state
        simulateBtn.disabled = true;
        simulateBtn.textContent = "Running...";

        try {
            // Send request to the API
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

            // Update results
            riskLevelResult.textContent = data.risk_level;
            confidenceResult.textContent = data.confidence_pct + "%";
            depthResult.textContent = data.estimated_depth_m + " m";

            // Build probability breakdown
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

            // Show results, hide placeholder
            resultsPlaceholder.style.display = "none";
            resultsContent.style.display = "block";

        } catch (error) {
            alert("Error running simulation: " + error.message);
        } finally {
            // Re-enable button
            simulateBtn.disabled = false;
            simulateBtn.textContent = "Simulate";
        }
    });
});