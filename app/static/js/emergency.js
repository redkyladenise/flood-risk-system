document.addEventListener("DOMContentLoaded", function () {

    const citySelect = document.getElementById("emergencyCitySelect");
    const evacTable = document.querySelector("#evacTable tbody");
    const hotlineTable = document.querySelector("#hotlineTable tbody");
    const evacCityLabel = document.getElementById("evacCityLabel");
    const hotlineCityLabel = document.getElementById("hotlineCityLabel");
    const data = window.EMERGENCY_DATA || {};

    function renderCity(cityName) {
        const info = data[cityName] || { centers: [], hotlines: [] };

        evacCityLabel.textContent = cityName;
        hotlineCityLabel.textContent = cityName;

        // evacuation centers
        evacTable.innerHTML = "";
        if (info.centers.length === 0) {
            evacTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No data available.</td></tr>`;
        } else {
            info.centers.forEach(c => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${c.name || "—"}</td>
                    <td>${c.district || "—"}</td>
                    <td>${c.barangay || "—"}</td>
                    <td>${c.address || "—"}</td>
                    <td class="text-end">${c.capacity || "—"}</td>
                `;
                evacTable.appendChild(row);
            });
        }

        // local hotlines
        hotlineTable.innerHTML = "";
        if (info.hotlines.length === 0) {
            hotlineTable.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No data available.</td></tr>`;
        } else {
            info.hotlines.forEach(h => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${h.agency || "—"}</td>
                    <td>${h.type || "—"}</td>
                    <td>${h.service || "—"}</td>
                    <td><strong>${h.number || "—"}</strong></td>
                `;
                hotlineTable.appendChild(row);
            });
        }
    }

    renderCity(citySelect.value);

    citySelect.addEventListener("change", function () {
        renderCity(citySelect.value);
    });
});