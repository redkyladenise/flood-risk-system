document.addEventListener("DOMContentLoaded", function () {

    const cityMenu = document.getElementById("emergencyCityDropdownMenu");
    const cityLabel = document.getElementById("emergencyCityLabel");

    const evacCityLabel = document.getElementById("evacCityLabel");
    const evacCountLabel = document.getElementById("evacCountLabel");
    const hotlineSectionTitle = document.getElementById("hotlineSectionTitle");
    const evacList = document.getElementById("evacList");
    const hotlineList = document.getElementById("hotlineList");

    const searchInput = document.getElementById("evacSearchInput");
    const districtContainer = document.getElementById("districtPillContainer");
    const paginationList = document.getElementById("evacPagination");
    const paginationWrapper = document.getElementById("evacPaginationWrapper");

    const data = window.EMERGENCY_DATA || {};

    let currentCity = "";
    let currentDistrict = "All";
    let currentSearch = "";
    let currentPage = 1;
    const ITEMS_PER_PAGE = 12; 

    const TYPE_ICONS = {
        Hotline: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M672-216h72v-528h-72v528ZM325.5-417.29q10.5-10.29 10.5-25.5t-10.29-25.71q-10.29-10.5-25.5-10.5t-25.71 10.29q-10.5 10.29-10.5 25.5t10.29 25.71q10.29 10.5 25.5 10.5t25.71-10.29Zm0 95q10.5-10.29 10.5-25.5t-10.29-25.71q-10.29-10.5-25.5-10.5t-25.71 10.29q-10.5 10.29-10.5 25.5t10.29 25.71q10.29 10.5 25.5 10.5t25.71-10.29ZM264-528h288v-120H264v120Zm169.5 110.71q10.5-10.29 10.5-25.5t-10.29-25.71q-10.29-10.5-25.5-10.5t-25.71 10.29q-10.5 10.29-10.5 25.5t10.29 25.71q10.29 10.5 25.5 10.5t25.71-10.29Zm0 95q10.5-10.29 10.5-25.5t-10.29-25.71q-10.29-10.5-25.5-10.5t-25.71 10.29q-10.5 10.29-10.5 25.5t10.29 25.71q10.29 10.5 25.5 10.5t25.71-10.29Zm108-95q10.5-10.29 10.5-25.5t-10.29-25.71q-10.29-10.5-25.5-10.5t-25.71 10.29q-10.5 10.29-10.5 25.5t10.29 25.71q10.29 10.5 25.5 10.5t25.71-10.29Zm0 95q10.5-10.29 10.5-25.5t-10.29-25.71q-10.29-10.5-25.5-10.5t-25.71 10.29q-10.5 10.29-10.5 25.5t10.29 25.71q10.29 10.5 25.5 10.5t25.71-10.29ZM672-144q-23 0-41.5-13.5T604-192H216q-29.7 0-50.85-21.16Q144-234.32 144-264.04v-432.24Q144-726 165.15-747T216-768h388q8-21 26.5-34.5T672-816h72q29.7 0 50.85 21.15Q816-773.7 816-744v528q0 29.7-21.15 50.85Q773.7-144 744-144h-72Z"/></svg>`,
        Landline: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12Z"/></svg>`,
        Mobile: `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M288-48q-30 0-51-21t-21-51v-720q0-30 21-51t51-21h384q30 0 51 21t21 51v90L524-530v100l220 220v90q0 30-21 51t-51 21H288Zm217.5-682.5Q516-741 516-756t-10.5-25.5Q495-792 480-792t-25.5 10.5Q444-771 444-756t10.5 25.5Q465-720 480-720t25.5-10.5ZM678-378l-51-51q10-10 15.5-23t5.5-28q0-15-5.5-28T627-531l51-51q20 20 31 46t11 56q0 30-11 56t-31 46Zm102 102-51-51q29-29 46-68.5t17-84.5q0-45-17-84.5T729-633l51-51q39 39 61.5 91.5T864-480q0 60-22.5 112.5T780-276Z"/></svg>`,
    };

    function getFilteredCenters() {
        const cityData = data[currentCity] || { centers: [] };
        let list = cityData.centers || [];

        // filter by disrict
        if (currentDistrict !== "All") {
            list = list.filter(c => String(c.district) === String(currentDistrict));
        }

        // search
        if (currentSearch) {
            list = list.filter(c => {
                const name = (c.name || "").toLowerCase();
                const barangay = (c.barangay || "").toLowerCase();
                const address = (c.address || "").toLowerCase();
                return name.includes(currentSearch) || barangay.includes(currentSearch) || address.includes(currentSearch);
            });
        }

        // sort district -> baranga
        return list.sort((a, b) => {
            const distA = parseInt(a.district) || 0;
            const distB = parseInt(b.district) || 0;

            if (distA !== distB) {
                return distA - distB;
            }

            const brgyA = (a.barangay || "").trim();
            const brgyB = (b.barangay || "").trim();

            return brgyA.localeCompare(brgyB, undefined, {
                numeric: true,
                sensitivity: "base"
            });
        });

    }

    function toTitleCase(str) {
        if (!str) return "—";
        return str
            .toLowerCase()
            .split(" ")
            .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : "")
            .join(" ");
    }

    function renderEvacView() {
        const filtered = getFilteredCenters();
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        if (evacCountLabel) {
            evacCountLabel.textContent = totalItems === 0 
                ? "No centers found" 
                : `Showing ${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalItems)} - ${Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of ${totalItems}`;
        }

        evacList.innerHTML = "";

        if (totalItems === 0) {
            evacList.innerHTML = `
                <div class="col-12 py-4 text-center text-muted">
                    No evacuation centers match your search or filter criteria.
                </div>`;
            renderPagination(0, 1);
            return;
        }

        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        pageItems.forEach(c => {
            const col = document.createElement("div");
            col.className = "col-12 col-lg-6";

            const formattedName = toTitleCase(c.name);
            const addressParts = [c.barangay, c.address].filter(Boolean);
            const addressText = addressParts.length 
                ? toTitleCase(addressParts.join(", ")) 
                : "—";

            let districtLabel = "—";
            if (c.district) {
                const distStr = String(c.district).trim();
                districtLabel = distStr.toLowerCase().includes("baseco") 
                    ? "Baseco" 
                    : `District ${distStr}`;
            }

            col.innerHTML = `
                <div class="evac-card">
                    <div class="evac-left pe-2">
                        <div class="evac-name">${formattedName}</div>
                        <div class="evac-address d-flex align-items-center gap-1 text-muted small mt-1">
                            <svg xmlns="http://www.w3.org/2000/svg" height="15px" viewBox="0 -960 960 960" width="15px" fill="currentColor" class="flex-shrink-0">
                                <path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 286q113-102 176.5-200.5T720-566q0-108-76-181T480-820q-108 0-184 73t-76 181q0 73 63.5 171.5T480-194Zm0 114Q319-217 239.5-334.5T160-566q0-142 99-238t221-96q122 0 221 96t99 238q0 119-79.5 231.5T480-80Zm0-486Z"/>
                            </svg> 
                            <span>${addressText.toLowerCase().startsWith("brgy") ? addressText : `Brgy. ${addressText}`}</span>
                        </div>
                    </div>
                    <div class="evac-badges">
                        <span class="badge-district">${districtLabel}</span>
                    </div>
                </div>
            `;
            evacList.appendChild(col);
        });

        renderPagination(totalPages, currentPage);
    }

    function renderPagination(totalPages, current) {
        if (!paginationList || !paginationWrapper) return;
        paginationList.innerHTML = "";

        if (totalPages <= 1) {
            paginationWrapper.style.display = "none";
            return;
        }
        paginationWrapper.style.display = "flex";

        function createPageItem(label, pageNum, disabled = false, active = false) {
            const li = document.createElement("li");
            li.className = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
            const a = document.createElement("a");
            a.className = "page-link";
            a.href = "#";
            a.textContent = label;

            if (!disabled && !active) {
                a.addEventListener("click", function (e) {
                    e.preventDefault();
                    currentPage = pageNum;
                    renderEvacView();
                });
            }
            li.appendChild(a);
            return li;
        }

        paginationList.appendChild(createPageItem("‹", current - 1, current === 1));

        const delta = 1;
        const range = [];
        for (let i = Math.max(2, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
            range.push(i);
        }

        paginationList.appendChild(createPageItem("1", 1, false, current === 1));

        if (current - delta > 2) {
            paginationList.appendChild(createPageItem("...", null, true));
        }

        range.forEach(p => {
            paginationList.appendChild(createPageItem(String(p), p, false, current === p));
        });

        if (current + delta < totalPages - 1) {
            paginationList.appendChild(createPageItem("...", null, true));
        }

        if (totalPages > 1) {
            paginationList.appendChild(createPageItem(String(totalPages), totalPages, false, current === totalPages));
        }

        paginationList.appendChild(createPageItem("›", current + 1, current === totalPages));
    }

    function buildDistrictPills() {
        if (!districtContainer) return;
        districtContainer.innerHTML = "";

        const cityData = data[currentCity] || { centers: [] };
        const centers = cityData.centers || [];

        const districts = Array.from(new Set(centers.map(c => c.district).filter(Boolean)))
            .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

        if (districts.length <= 1) {
            return;
        }

        const pillValues = ["All", ...districts];

        pillValues.forEach(dist => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `district-pill ${dist === currentDistrict ? 'active' : ''}`;
            
            if (dist === "All") {
                btn.textContent = "All Districts";
            } else if (String(dist).toLowerCase().includes("baseco")) {
                btn.textContent = "Baseco";
            } else {
                btn.textContent = `District ${dist}`;
            }

            btn.addEventListener("click", () => {
                currentDistrict = dist;
                currentPage = 1;
                buildDistrictPills();
                renderEvacView();
            });

            districtContainer.appendChild(btn);
        });
    }

    function renderHotlines(agencies, isMultiAgency) {
        hotlineList.innerHTML = "";

        if (!agencies || agencies.length === 0) {
            hotlineList.innerHTML = `<div class="text-muted">No local hotlines listed for this city.</div>`;
            return;
        }

        const flatNumbers = [];
        agencies.forEach(ag => {
            ag.numbers.forEach(n => {
                flatNumbers.push({
                    agency: ag.agency,
                    type: n.type,
                    number: n.number,
                    sim: n.sim,
                });
            });
        });

        const isSingle = flatNumbers.length === 1;
        const row = document.createElement("div");
        row.className = "row g-3";

        flatNumbers.forEach(n => {
            const col = document.createElement("div");
            col.className = isSingle ? "col-12 single-card-wrap" : "col-md-4";

            const icon = TYPE_ICONS[n.type] || TYPE_ICONS.Landline;
            const typeText = (n.type === "Mobile" && n.sim)
                ? `Mobile (${n.sim})`
                : n.type;

            const agencyTag = isMultiAgency
                ? `<div class="hotline-agency-tag">${n.agency}</div>`
                : "";

            col.innerHTML = `
                <div class="hotline-card">
                    ${agencyTag}
                    <div class="hotline-type">
                        ${icon}
                        ${typeText}
                    </div>
                    <div class="hotline-number">${n.number}</div>
                </div>
            `;
            row.appendChild(col);
        });

        hotlineList.appendChild(row);
    }

    function renderCity(cityName) {
        currentCity = cityName;
        currentDistrict = "All";
        currentSearch = "";
        currentPage = 1;

        if (searchInput) searchInput.value = "";

        const info = data[cityName] || { centers: [], agencies: [], is_multi_agency: false };

        if (cityLabel) cityLabel.textContent = cityName;
        if (evacCityLabel) evacCityLabel.textContent = cityName;

        if (info.is_multi_agency) {
            hotlineSectionTitle.textContent = "Local Emergency Hotlines";
        } else if (info.agencies && info.agencies.length > 0) {
            hotlineSectionTitle.textContent = info.agencies[0].agency;
        } else {
            hotlineSectionTitle.textContent = "Local Emergency Hotlines";
        }

        buildDistrictPills();
        renderEvacView();
        renderHotlines(info.agencies, info.is_multi_agency);
    }

    function buildCityMenu(cities, onSelect) {
        cityMenu.innerHTML = "";
        cities.forEach(city => {
            const li = document.createElement("li");
            li.innerHTML = `<a class="dropdown-item" href="#" data-city="${city}">${city}</a>`;
            li.querySelector("a").addEventListener("click", function (e) {
                e.preventDefault();
                onSelect(city);
            });
            cityMenu.appendChild(li);
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", function (e) {
            currentSearch = e.target.value.toLowerCase().trim();
            currentPage = 1;
            renderEvacView();
        });
    }

    // initialize
    const cities = Object.keys(data);
    const initialCity = cities.length > 0 ? cities[0] : "Manila";

    buildCityMenu(cities, function (cityName) {
        renderCity(cityName);
    });

    renderCity(initialCity);
});