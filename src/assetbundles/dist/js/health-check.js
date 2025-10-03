// Health Check specific JavaScript functionality

document.addEventListener("DOMContentLoaded", function () {
    registerBrokenLinksJs();
    registerDomainCheckJs();
    registerLighthouseJs();
    registerMixedContentJs();
    registerReachabilityJs();
});

function registerBrokenLinksJs() {
    const typeFilter = document.getElementById("type-filter");
    const statusFilter = document.getElementById("status-filter");

    // Filter functionality
    function applyFilters() {
        const typeValue = typeFilter ? typeFilter.value : 'all';
        const statusValue = statusFilter ? statusFilter.value : 'all';
        const rows = document.querySelectorAll('.main-row');
        let filteredRowsCount = 0;

        rows.forEach(row => {
            const rowType = row.dataset.type;
            const rowStatus = row.dataset.status;
            const expandableRow = row.nextElementSibling;

            let show = true;

            // Type filter
            if (typeValue !== 'all' && rowType !== typeValue) {
                show = false;
            }

            // Status filter
            if (statusValue !== 'all' && !rowStatus.includes(statusValue)) {
                show = false;
            }

            // Show/hide row and its expandable content
            row.style.display = show ? '' : 'none';
            if (expandableRow && expandableRow.classList.contains('expandable-row')) {
                expandableRow.style.display = show ? (expandableRow.classList.contains('show') ? 'table-row' : 'none') : 'none';
            }

            if (show) filteredRowsCount++;
        });
        // Handle "No data" row
        const tbody = document.querySelector('#broken-links-table tbody');
        let noRow = tbody.querySelector('.no-results');

        if (filteredRowsCount === 0) {
            if (!noRow) {
                noRow = document.createElement('tr');
                noRow.classList.add('no-results');
                noRow.innerHTML = `<td colspan="6">No data found for selected filters</td>`;
                tbody.appendChild(noRow);
            }
        } else {
            if (noRow) {
                noRow.remove();
            }
        }
    }

    // Add filter event listeners
    if (typeFilter) {
        typeFilter.addEventListener('change', applyFilters);
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
}

function registerDomainCheckJs() {
    const refreshBtn = document.getElementById("refresh-btn");
    const statusContainerWrapper = document.getElementById("status-container-wrapper");
    const detailsContainerWrapper = document.getElementById("details-container-wrapper");
    const domainDetailsSection = document.getElementById("domain-details-section");
    const loadingOverlay = document.getElementById("loading-container");

    if (!statusContainerWrapper || !detailsContainerWrapper || !domainDetailsSection) {
        return;
    }

    let domainData = {};

    // Function to fetch domain check data
    function fetchDomainData(showLoader = true) {
        if (showLoader) {
            loadingOverlay.style.display = "flex";
            loadingOverlay.classList.add("active");
            statusContainerWrapper.style.display = "none";
            detailsContainerWrapper.style.display = "none";
            domainDetailsSection.style.display = "none";
        }

        return Craft.sendActionRequest('POST', 'upsnap/health-check/domain-check', {})
            .then(response => {
                if (response?.data?.success) {
                    domainData = response.data.data;

                    // Render status and details containers
                    renderStatusContainer(domainData);
                    renderDetailsContainer(domainData);

                    // Render general info / more details
                    renderDomainDetails(domainData.details || {});

                    // Show containers
                    statusContainerWrapper.style.display = "block";
                    detailsContainerWrapper.style.display = "block";
                    domainDetailsSection.style.display = "block";
                } else {
                    throw new Error(response?.data?.error || 'Failed to fetch domain data');
                }
            })
            .catch(error => {
                console.error("Failed to fetch domain data:", error);

                // Display error message
                domainDetailsSection.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: #cf1124;">
                        <p><strong>Error loading domain data</strong></p>
                        <p style="margin-top: 0.5rem;">${error.message || 'Unknown error occurred'}</p>
                    </div>
                `;
                domainDetailsSection.style.display = "block";
            })
            .finally(() => {
                loadingOverlay.style.display = "none";
                loadingOverlay.classList.remove("active");
            });
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            fetchDomainData(true);
        });
    }

    // Function to render the general info / more details section
    function renderDomainDetails(details) {
        if (!details || Object.keys(details).length === 0) {
            domainDetailsSection.innerHTML = '';
            return;
        }

        let html = `
            <div class="details-section">
                <h3 class="details-title">General Info</h3>
                <table class="details-table">
                    <tr><td class="details-label">CNAME</td><td class="details-value">${details.cname ?? '–'}</td></tr>
                    <tr><td class="details-label">Host</td><td class="details-value">${details.host ?? '–'}</td></tr>
                    <tr><td class="details-label">Supported</td><td class="details-value">${details.supported ? 'Yes' : 'No'}</td></tr>
                </table>

                <div id="more-details" class="hidden">
                    <h3 class="pt-2rem details-title">DNS Records</h3>
                    <table class="details-table">
                        <tr><td class="details-label">IPv4</td><td class="details-value">${details.ipv4?.length ? details.ipv4.join(", ") : '–'}</td></tr>
                        <tr><td class="details-label">IPv6</td><td class="details-value">${details.ipv6 ?? '–'}</td></tr>
                        <tr><td class="details-label">MX Records</td><td class="details-value">${details.mxCount ?? '–'}</td></tr>
                        <tr><td class="details-label">NS Records</td><td class="details-value">${details.nsCount ?? '–'}</td></tr>
                        <tr><td class="details-label">TXT Records</td><td class="details-value">${details.txtCount ?? '–'}</td></tr>
                    </table>

                    <h3 class="pt-2rem details-title">Domain Lifecycle</h3>
                    <table class="details-table">
                        <tr><td class="details-label">Registered On</td><td class="details-value">${formatDate(details.domainRegistered)}</td></tr>
                        <tr><td class="details-label">Expiration Date</td><td class="details-value">${formatDate(details.domainExpirationDate)}</td></tr>
                        <tr><td class="details-label">Days Until Expiration</td><td class="details-value">${details.domainDays ?? '–'}</td></tr>
                        <tr><td class="details-label">Expired</td><td class="details-value">${details.domainExpired ? 'Yes' : 'No'}</td></tr>
                        <tr><td class="details-label">Expiring Soon</td><td class="details-value">${details.domainExpiring ? 'Yes' : 'No'}</td></tr>
                        <tr><td class="details-label">Last Changed</td><td class="details-value">${formatDate(details.lastChanged)}</td></tr>
                        <tr><td class="details-label">Last Updated in RDAP DB</td><td class="details-value">${formatDate(details.lastUpdatedInRdapDb)}</td></tr>
                    </table>

                    <h3 class="pt-2rem details-title">Domain Status Codes</h3>
                    <table class="details-table">
                        ${details.domainStatusCodes?.length
                            ? details.domainStatusCodes.map(s => `<tr><td class="details-label">${s.eppStatusCode}</td><td class="details-value">${s.status}</td></tr>`).join('')
                            : `<tr><td colspan="2" class="details-value">–</td></tr>`}
                    </table>
                </div>

                <a href="#" class="show-less hidden">Show less</a>
                <a href="#" class="show-details">Show more</a>
            </div>
        `;

        domainDetailsSection.innerHTML = html;

        // Bind show more / less
        toggleShowDetails(domainDetailsSection);
    }

    // Initial fetch on page load
    fetchDomainData(true);
}


function toggleShowDetails(domainDetailsSection) {
    const showBtn = domainDetailsSection.querySelector(".show-details");
    const lessBtn = domainDetailsSection.querySelector(".show-less");
    const moreDetails = domainDetailsSection.querySelector("#more-details");

    if (showBtn && lessBtn && moreDetails) {
        showBtn.addEventListener("click", (e) => {
            e.preventDefault();
            moreDetails.classList.remove("hidden");
            showBtn.classList.add("hidden");
            lessBtn.classList.remove("hidden");
        });

        lessBtn.addEventListener("click", (e) => {
            e.preventDefault();
            moreDetails.classList.add("hidden");
            lessBtn.classList.add("hidden");
            showBtn.classList.remove("hidden");
        });
    }
}

function registerLighthouseJs() {
    const deviceSelector = document.getElementById("device-selector");
    const refreshBtn = document.getElementById("refresh-btn");
    let currentDevice = deviceSelector?.value || 'desktop';

    const scoresContainer = document.getElementById("scores-container");
    const performanceContainer = document.getElementById("performance-container");
    const lighthouseDataElement = document.getElementById("lighthouse-data");
    const loadingOverlay = document.getElementById("loading-container");

    const statusContainerWrapper = document.getElementById("status-container-wrapper");
    const detailsContainerWrapper = document.getElementById("details-container-wrapper");

    if (!lighthouseDataElement || !scoresContainer || !performanceContainer) {
        return;
    }

    let lighthouseData = {};

    // Function to fetch lighthouse data
    function fetchLighthouseData(device = 'desktop', showLoader = true) {
        if (showLoader) {
            loadingOverlay.style.display = "flex";
            loadingOverlay.classList.add("active");
            scoresContainer.style.display = "none";
            performanceContainer.style.display = "none";
            statusContainerWrapper.style.display = "none";
            detailsContainerWrapper.style.display = "none";
        }

        return Craft.sendActionRequest('POST', 'upsnap/health-check/lighthouse', {
            data: { device: device }
        })
            .then(response => {
                if (response?.data?.success) {
                    lighthouseData = response.data.data;

                    // Update the hidden data element
                    lighthouseDataElement.textContent = JSON.stringify(lighthouseData);
                    renderStatusContainer(lighthouseData);
                    renderDetailsContainer(lighthouseData);

                    renderLighthouseData();

                    // Show containers after data is loaded
                    scoresContainer.style.display = "grid";
                    performanceContainer.style.display = "block";
                } else {
                    throw new Error(response?.data?.error || 'Failed to fetch data');
                }
            })
            .catch(error => {
                console.error("Failed to fetch Lighthouse data:", error);

                // Show error message
                scoresContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #cf1124;">
                    <p><strong>Error loading Lighthouse data</strong></p>
                    <p style="margin-top: 0.5rem;">${error.message || 'Unknown error occurred'}</p>
                </div>
            `;
                scoresContainer.style.display = "block";
                performanceContainer.style.display = "none";
            })
            .finally(() => {
                loadingOverlay.style.display = "none";
                loadingOverlay.classList.remove("active");
                statusContainerWrapper.style.display = "block";
                detailsContainerWrapper.style.display = "block";
            });
    }

    // Device tab switching
    if (deviceSelector) {
        deviceSelector.addEventListener('change', function () {
            currentDevice = this.value;
            fetchLighthouseData(currentDevice);
        });
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            fetchLighthouseData(currentDevice);
        });
    }

    function getScoreColor(score) {
        if (score >= 90) return '#009967'; // success green
        if (score >= 50) return '#fc9105'; // warning yellow
        return '#fb2c36'; // error red
    }

    function createScoreCircle(score = 0, title) {
        const color = getScoreColor(score);
        const circumference = 2 * Math.PI * 37; // radius = 37
        const progress = (score / 100) * circumference;

        return `
            <div class="score-card">
                <div class="score-circle">
                    <svg viewBox="0 0 80 80">
                        <circle class="background" cx="40" cy="40" r="37"></circle>
                        <circle class="progress" cx="40" cy="40" r="37"
                                stroke="${color}"
                                stroke-dasharray="${progress} ${circumference}">
                        </circle>
                    </svg>
                    <div class="score-text">${score}</div>
                </div>
                <h3 class="score-title">${title}</h3>
            </div>
        `;
    }

    function createMetricItem(name, value, status) {
        return `
            <div class="metric-item">
                <div class="metric-status ${status}"></div>
                <div class="metric-content">
                    <h4 class="metric-name">${name}</h4>
                    <p class="metric-value ${status}">${value ?? 'N/A'}</p>
                </div>
            </div>
        `;
    }

    function renderLighthouseData() {
        const meta = lighthouseData?.result?.details?.lighthouse?.meta;

        if (!meta) {
            scoresContainer.innerHTML = '<p style="padding: 2rem; text-align: center;">No lighthouse data available</p>';
            performanceContainer.innerHTML = '';
            performanceContainer.style.display = 'none';
            return;
        }

        // Render core scores
        const performance = meta.performance || {};
        const performanceScore = performance.score ?? 0;

        let scoresHTML = '';
        scoresHTML += createScoreCircle(performanceScore, 'Performance');

        if (meta.accessibility) {
            scoresHTML += createScoreCircle(meta.accessibility.score, 'Accessibility');
        }
        if (meta.bestPractices) {
            scoresHTML += createScoreCircle(meta.bestPractices.score, 'Best Practices');
        }
        if (meta.seo) {
            scoresHTML += createScoreCircle(meta.seo.score, 'SEO');
        }

        scoresContainer.innerHTML = scoresHTML;

        // Render performance metrics
        let metricsHTML = `
            <h2 class="section-title">Performance Metrics</h2>
            <div class="metrics-grid">
        `;

        const metrics = [
            { key: 'firstContentfulPaint', name: 'First Contentful Paint' },
            { key: 'largestContentfulPaint', name: 'Largest Contentful Paint' },
            { key: 'totalBlockingTime', name: 'Total Blocking Time' },
            { key: 'cumulativeLayoutShift', name: 'Cumulative Layout Shift' },
            { key: 'speedIndex', name: 'Speed Index' }
        ];

        metrics.forEach(metric => {
            const metricData = performance[metric.key];
            if (metricData) {
                metricsHTML += createMetricItem(
                    metric.name,
                    metricData.displayValue || metricData.value,
                    metricData.status || 'warning'
                );
            }
        });

        metricsHTML += '</div>';
        performanceContainer.innerHTML = metricsHTML;
    }

    // Initial fetch on page load
    fetchLighthouseData(currentDevice, true);
}

function registerMixedContentJs() {
    // Mixed content specific functionality (refresh button handled globally)
    // Add any mixed content specific JS here
}

function registerReachabilityJs() {
    // Reachability specific functionality (refresh button handled globally)
    // Add any reachability specific JS here
}


function renderStatusContainer(data) {
    const statusContainerWrapper = document.getElementById("status-container-wrapper");
    const status = data.status || 'warning';
    const message = data.message || '';
    const error = data.error || '';

    let statusClass = 'warning';
    let containerClass = 'warning';
    let icon = '!';
    let title = message || 'There are some issues!';

    if (status === 'ok') {
        statusClass = 'success';
        containerClass = '';
        icon = '✓';
        title = message || 'Everything is running smoothly!';
    } else if (status === 'error') {
        statusClass = 'error';
        containerClass = 'error';
        icon = '✗';
        title = message || 'Server is experiencing issues!';
    }

    let html = `
            <div class="status-container ${containerClass}">
                <div class="status-header">
                    <div class="status-icon ${statusClass}">${icon}</div>
                    <h3 class="status-title">${title}</h3>
                </div>
                ${error ? `<p class="status-message">${error}</p>` : ''}
            </div>
        `;

    statusContainerWrapper.innerHTML = html;
}

// Function to render details container
function renderDetailsContainer(data) {
    const detailsContainerWrapper = document.getElementById("details-container-wrapper");

    if (data.status !== 'ok') {
        detailsContainerWrapper.innerHTML = '';
        return;
    }

    const url = data.url || '';
    const checkedAt = data.checkedAt || '';
    const duration = data.result?.durationMs
        ? `${data.result.durationMs}ms`
        : (data.duration || '–');

    // Format date - simple format matching Twig's date filter
    let formattedDate = '–';
    if (checkedAt) {
        try {
            const date = new Date(checkedAt);
            const day = String(date.getDate()).padStart(2, '0');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            formattedDate = `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
        } catch (e) {
            formattedDate = checkedAt;
        }
    }

    const html = `
            <div class="pane">
                <div class="meta read-only">
                    <div class="data fullwidth">
                        <div class="field">
                            <div class="heading">Monitored URL</div>
                            <div>
                                <a href="${url}" target="_blank">${url}</a>
                            </div>
                        </div>

                        <div class="field">
                            <div class="heading">Last Checked</div>
                            <div>${formattedDate}</div>
                        </div>

                        <div class="field">
                            <div class="heading">Response Time</div>
                            <div>${duration}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

    detailsContainerWrapper.innerHTML = html;
}

// Toggle row expansion
function toggleRow(index) {
    const expandableRow = document.getElementById('row-' + index);
    const btn = document.querySelector('[onclick="toggleRow(' + index + ')"]');
    const btnText = btn.querySelector('.btn-text');

    if (expandableRow.classList.contains('show')) {
        expandableRow.classList.remove('show');
        expandableRow.style.display = 'none';
        btn.classList.remove('expanded');
        btnText.textContent = 'View More';
    } else {
        expandableRow.classList.add('show');
        expandableRow.style.display = 'table-row';
        btn.classList.add('expanded');
        btnText.textContent = 'View Less';
    }
}

// Function for history page details toggle
function toggleDetails(recordId) {
    const detailsRow = document.getElementById('details-' + recordId);
    const toggleIcon = event.currentTarget.querySelector('.toggle-icon');

    if (detailsRow.style.display === 'none' || !detailsRow.style.display) {
        detailsRow.style.display = 'table-row';
        toggleIcon.textContent = '▲';
    } else {
        detailsRow.style.display = 'none';
        toggleIcon.textContent = '▼';
    }
}


function formatDate(dateStr) {
    if (!dateStr) return '–';
    try {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
    } catch {
        return dateStr;
    }
}