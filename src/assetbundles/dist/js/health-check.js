// Health Check specific JavaScript functionality

document.addEventListener("DOMContentLoaded", function () {
    registerBrokenLinksJs();
    registerDomainCheckJs();
    registerLighthouseJs();
    registerMixedContentJs();
    registerReachabilityJs();
    registerSecurityCertificatesJs();
});


/**
 * Display Craft CP notification
 * @param {'success' | 'error' } type - Type of notification
 * @param {string} message - Message to display
 */
function showCraftMessage(type, message) {
    if (!message) message = 'Something went wrong';

    switch (type) {
        case 'success':
            Craft.cp.displayNotice(message);
            break;
        case 'error':
            Craft.cp.displayError(message);
            break;
        case 'notice':
        default:
            Craft.cp.displayNotice(message);
            break;
    }
}

function registerBrokenLinksJs() {
    const refreshBtn = document.getElementById("refresh-btn");
    const statusContainerWrapper = document.getElementById("status-container-wrapper");

    if (refreshBtn) refreshBtn.disabled = true;

    // Only run on security certificates page - check for unique element
    if (!statusContainerWrapper || !document.querySelector('[data-page="broken-links"]')) {
        return;
    }

    const contentContainer = document.querySelector("#broken-links-section");
    contentContainer.style.display = "grid";
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadBrokenLinks(true);
            showSkeletons(statusContainerWrapper, contentContainer)
            refreshBtn.disabled = true;
        });
    }

    loadBrokenLinks();
    let brokenLinksData = {};

    function loadBrokenLinks(forceFetch = false) {
        Craft.sendActionRequest('POST', 'upsnap/health-check/broken-links', {
            data: {
				force_fetch: forceFetch
			}
        })
            .then(response => {
                brokenLinksData = response?.data?.data || {};
                if (response?.data?.success) {
                    renderStatusContainer(brokenLinksData);
                    renderDetailsContainerForBrokenLinks(brokenLinksData);

                    if (brokenLinksData && brokenLinksData.brokenLinks && brokenLinksData.brokenLinks.length > 0) {
                        renderBrokenLinksUI(brokenLinksData);
                        attachExpandListeners();
                        attachFilterListeners();
                    }
                } else {
                    const errorMessage = response?.data?.error || 'Failed to fetch broken links data';
                    throw new Error(errorMessage);
                }
            })
            .catch(error => {
                console.error("Failed to fetch broken links data:", error);

                // Render error in status container
                const errorData = {
                    status: 'error',
                    message: 'Error loading domain data',
                    error: error.message || 'Unknown error occurred'
                };
                showCraftMessage('error', errorData.error)
                renderStatusContainer(errorData);
            }).finally(() => {
                refreshBtn.disabled = false;
            });
    }

    function renderDetailsContainerForBrokenLinks(metaData) {
        const detailsContainer = document.getElementById("details-container-wrapper");
        if (!detailsContainer || !metaData) return;

        // Fallbacks for missing values
        const totalPagesChecked = metaData?.details?.totalPagesChecked ?? 0;
        const totalLinksScanned = metaData?.details?.totalLinksScanned ?? 0;
        const errorsCount = metaData?.details?.errorsCount ?? 0;

        detailsContainer.innerHTML = `
            <div class="pane">
                <div class="meta read-only">
                    <div class="data fullwidth">
                        <div class="field">
                            <div class="heading">Pages Checked</div>
                            <div>${totalPagesChecked}</div>
                        </div>
                        <div class="field">
                            <div class="heading">Links Scanned</div>
                            <div>${totalLinksScanned}</div>
                        </div>
                        <div class="field">
                            <div class="heading">Broken Links</div>
                            <div>${errorsCount}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // === Render Table + Filters ===
    function renderBrokenLinksUI(data) {
        contentContainer.style.display = "grid";
        contentContainer.innerHTML = `
            <div class="filter-controls">
                <div class="filter-row">
                    <div class="filter-group">
                        <label class="filter-label">Filter by Type</label>
                        <select class="filter-select" id="type-filter">
                            <option value="all">All Types</option>
                            <option value="internal">Internal Links</option>
                            <option value="external">External Links</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Filter by Status</label>
                        <select class="filter-select" id="status-filter">
                            <option value="all">All Status</option>
                            <option value="404">404 Not Found</option>
                            <option value="500">500 Server Error</option>
                            <option value="timeout">Timeout</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="broken-links-table">
                <div class="table-header">
                    Broken Links Details (${data.brokenLinks.length} items)
                </div>
                <table class="table" id="broken-links-table">
                    <thead>
                        <tr>
                            <th>Broken URL</th>
                            <th>Found on Page</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.brokenLinks.map((link, i) => `
                            <tr class="main-row" data-type="${link.type || 'N/A'}" data-status="${link.statusCode || 'N/A'}">
                                <td>
                                    <div class="url-display" title="${link.url || 'N/A'}">
                                        ${link.anchorText ? `<strong>${link.anchorText}</strong><br>` : ""}
                                        ${link.url ? `<a href="${link.url}" target="_blank">${link.url}</a>` : "<span>N/A</span>"}
                                    </div>
                                </td>
                                <td>
                                    <div class="url-display" title="${link.pageUrl || 'N/A'}">
                                        ${link.pageUrl ? `<a href="${link.pageUrl}" target="_blank">${link.pageUrl}</a>` : "<span>N/A</span>"}
                                    </div>
                                </td>
                                <td><span class="link-type">${link.type || 'N/A'}</span></td>
                                <td class="broken-links-col">
                                    <span class="status-code ${(link.statusCode && (link.statusCode.startsWith('4') || link.statusCode.startsWith('5'))) ? 'error' : 'warning'}">
                                        ${link.statusCode || 'N/A'}
                                    </span>
                                </td>
                                <td class="broken-links-col">
                                    <button class="expand-btn" data-index="${i}"><span class="btn-text">View More</span></button>
                                </td>
                            </tr>
                            <tr class="expandable-row hidden" id="row-${i}">
                                <td colspan="6">
                                    <div class="expandable-content">
                                        <div class="detail-grid">
                                            <div class="detail-item"><span class="detail-label">Title</span><span class="detail-value">${link.title || 'N/A'}</span></div>
                                            <div class="detail-item"><span class="detail-label">Issue Description</span><span class="detail-value">${link.culprit || 'N/A'}</span></div>
                                            <div class="detail-item"><span class="detail-label">Classification</span><span class="detail-value">${link.classification ? link.classification.charAt(0).toUpperCase() + link.classification.slice(1) : 'N/A'}</span></div>
                                            <div class="detail-item"><span class="detail-label">Resolved</span><span class="detail-value">${link.resolved ? 'Yes' : 'No'}</span></div>
                                            ${link.refUrl ? `<div class="detail-item"><span class="detail-label">Reference URL</span><span class="detail-value"><a href="${link.refUrl}" target="_blank">${link.refUrl}</a></span></div>` : ""}
                                            ${link.rid ? `<div class="detail-item"><span class="detail-label">Report ID</span><span class="detail-value">${link.rid}</span></div>` : ""}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // === Expand / Collapse logic ===
    function attachExpandListeners() {
        document.querySelectorAll(".expand-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const index = btn.dataset.index;
                const row = document.getElementById(`row-${index}`);
                const btnText = btn.querySelector(".btn-text");
                if (row.classList.contains("hidden")) {
                    row.classList.remove("hidden");
                    row.classList.add("show");
                    btnText.textContent = "View Less";
                } else {
                    row.classList.add("hidden");
                    row.classList.remove("show");
                    btnText.textContent = "View More";
                }
            });
        });
    }

    // === Filters logic ===
    function attachFilterListeners() {
        const typeFilter = document.getElementById("type-filter");
        const statusFilter = document.getElementById("status-filter");

        function applyFilters() {
            const typeValue = typeFilter.value;
            const statusValue = statusFilter.value;
            let filteredRowsCount = 0;

            document.querySelectorAll(".main-row").forEach(row => {
                const rowType = row.dataset.type;
                const rowStatus = row.dataset.status;
                const expandableRow = row.nextElementSibling;

                let show = true;
                if (typeValue !== 'all' && rowType !== typeValue) show = false;
                if (statusValue !== 'all' && !rowStatus.includes(statusValue)) show = false;

                row.style.display = show ? '' : 'none';
                if (expandableRow && expandableRow.classList.contains('expandable-row')) {
                    expandableRow.style.display = show ? (expandableRow.classList.contains('show') ? 'table-row' : 'none') : 'none';
                }

                if (show) filteredRowsCount++;
            });

            const tbody = document.querySelector("#broken-links-table tbody");
            const noRow = tbody.querySelector(".no-results");
            if (filteredRowsCount === 0) {
                if (!noRow) {
                    const tr = document.createElement("tr");
                    tr.classList.add("no-results");
                    tr.innerHTML = `<td colspan="6">No data found for selected filters</td>`;
                    tbody.appendChild(tr);
                }
            } else if (noRow) noRow.remove();
        }

        typeFilter?.addEventListener("change", applyFilters);
        statusFilter?.addEventListener("change", applyFilters);
    }
}

function registerDomainCheckJs() {
    const refreshBtn = document.getElementById("refresh-btn");
    const statusContainerWrapper = document.getElementById("status-container-wrapper");
    const domainDetailsSection = document.getElementById("domain-details-section");

    if (refreshBtn) refreshBtn.disabled = true;

    // Only run on domain check page - check for unique element
    if (!statusContainerWrapper || !domainDetailsSection || !document.querySelector('[data-page="domain-check"]')) {
        return;
    }

    let domainData = {};

    // Function to fetch domain check data
    function fetchDomainData(forceFetch = false) {
        return Craft.sendActionRequest('POST', 'upsnap/health-check/domain-check', {
            data: {
				force_fetch: forceFetch
			}
        })
            .then(response => {
                if (response?.data?.success === 'ok') {
                    domainData = response.data.data;

                    // Render status and details containers
                    renderStatusContainer(domainData);

                    // Render general info / more details
                    renderDomainDetails(domainData.details || {});

                    // Show containers
                    statusContainerWrapper.style.display = "block";
                    domainDetailsSection.style.display = "block";
                } else {
                    const errorMessage = response?.data?.error || 'Failed to fetch domain data';
                    throw new Error(errorMessage);
                }
            })
            .catch(error => {
                // Render error in status container
                const errorData = {
                    status: 'error',
                    message: 'Error loading domain data',
                    error: error.message || 'Unknown error occurred'
                };
                showCraftMessage('error', errorData.error)
                renderStatusContainer(errorData);

                // Hide domain details section
                if (domainDetailsSection) {
                    domainDetailsSection.style.display = 'none';
                }
            }).finally(() => {
                refreshBtn.disabled = false;
            });
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            fetchDomainData(true);
            showSkeletons(statusContainerWrapper, domainDetailsSection)
            refreshBtn.disabled = true;
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

                <div id="more-details">
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

                <a href="#" class="show-less">Show less</a>
                <a href="#" class="show-details hidden">Show more</a>
            </div>
        `;

        domainDetailsSection.innerHTML = html;

        // Bind show more / less
        toggleShowDetails(domainDetailsSection);
    }

    // Initial fetch on page load (progressive loading with skeletons)
    fetchDomainData();
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
    const refreshBtn = document.getElementById("refresh-button");
    let currentDevice = deviceSelector?.value || 'desktop';

    if (refreshBtn) refreshBtn.disabled = true;

    const scoresContainer = document.getElementById("scores-container");
    const performanceContainer = document.getElementById("performance-container");
    const lighthouseDataElement = document.getElementById("lighthouse-data");

    // Only run on lighthouse page - check for unique element
    if (!lighthouseDataElement || !scoresContainer || !performanceContainer || !document.querySelector('[data-page="lighthouse"]')) {
        return;
    }

    let lighthouseData = {};

    // Function to fetch lighthouse data
    function fetchLighthouseData(device = 'desktop', forceFetch = false) {
        return Craft.sendActionRequest('POST', 'upsnap/health-check/lighthouse', {
            data: { device: device, force_fetch: forceFetch }
        })
            .then(response => {
                if (response?.data?.success === 'ok') {
                    lighthouseData = response.data.data;

                    // Update the hidden data element
                    lighthouseDataElement.textContent = JSON.stringify(lighthouseData);
                    renderStatusContainer(lighthouseData);

                    renderLighthouseData();

                    // Show containers after data is loaded
                    scoresContainer.style.display = "grid";
                    performanceContainer.style.display = "block";
                } else {
                    const errorMessage = response?.data?.error || 'Failed to fetch lighthouse data';
                    throw new Error(errorMessage);
                }
            })
            .catch(error => {
                console.error("Failed to fetch Lighthouse data:", error);

                // Render error in status container
                const errorData = {
                    status: 'error',
                    message: 'Error loading Lighthouse data',
                    error: error.message || 'Unknown error occurred'
                };
                showCraftMessage('error', errorData.error);
                renderStatusContainer(errorData);

                // Hide scores and performance containers
                scoresContainer.style.display = 'none';
                performanceContainer.style.display = 'none';
            }).finally(() => {
                refreshBtn.disabled = false;
            });
    }

    // Device tab switching
    if (deviceSelector) {
        deviceSelector.addEventListener('change', function () {
            currentDevice = this.value;

            // Show skeletons while fetching
            showLoaderSkeleton();
            fetchLighthouseData(currentDevice);
        });
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            fetchLighthouseData(currentDevice, true);
            showLoaderSkeleton()
            refreshBtn.disabled = true;
        });
    }

    function showLoaderSkeleton() {
        const statusWrapper = document.getElementById("status-container-wrapper");
        const detailsWrapper = document.getElementById("details-container-wrapper");

        if (statusWrapper && detailsWrapper) {
            statusWrapper.innerHTML = `
            <div class="skeleton-card">
				<div class="skeleton-card-body">
					<div>
						<h3>
							Fetching your scores. Please hang tight as it takes around 30 seconds
							<span class="loading-dots"></span>
						</h3>
					</div>
				</div>
			</div>
            <div class="skeleton-card">
                <div class="skeleton-card-header">
                    <div class="skeleton-line skeleton-line-medium"></div>
                </div>
                <div class="skeleton-card-body">
                    <div class="skeleton-line skeleton-line-long"></div>
                    <div class="skeleton-line skeleton-line-short"></div>
                </div>
            </div>
        `;
            detailsWrapper.innerHTML = `
            <div class="skeleton-card">
                <div class="skeleton-card-header">
                    <div class="skeleton-line skeleton-line-short"></div>
                </div>
                <div class="skeleton-card-body">
                    <div class="skeleton-field">
                        <div class="skeleton-line skeleton-line-short"></div>
                        <div class="skeleton-line skeleton-line-medium"></div>
                    </div>
                    <div class="skeleton-field">
                        <div class="skeleton-line skeleton-line-short"></div>
                        <div class="skeleton-line skeleton-line-long"></div>
                    </div>
                    <div class="skeleton-field">
                        <div class="skeleton-line skeleton-line-short"></div>
                        <div class="skeleton-line skeleton-line-medium"></div>
                    </div>
                    <div class="skeleton-field">
                        <div class="skeleton-line skeleton-line-short"></div>
                        <div class="skeleton-line skeleton-line-long"></div>
                    </div>
                </div>
            </div>
        `;
        }

        // Hide previous results
        scoresContainer.style.display = 'none';
        performanceContainer.style.display = 'none';
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

    // Initial fetch on page load (progressive loading with skeletons)
    fetchLighthouseData(currentDevice);
}

function registerMixedContentJs() {
    const refreshBtn = document.getElementById("refresh-btn");
    const statusContainerWrapper = document.getElementById("status-container-wrapper");
    const mixedContentSection = document.getElementById("mixed-content-section");

    if (refreshBtn) refreshBtn.disabled = true;

    // Only run on mixed content page - check for unique element
    if (!statusContainerWrapper || !mixedContentSection || !document.querySelector('[data-page="mixed-content"]')) {
        return;
    }

    let mixedContentData = {};

    // Function to fetch mixed content data
    function fetchMixedContentData(forceFetch = false) {
        return Craft.sendActionRequest('POST', 'upsnap/health-check/mixed-content', {
            data: {
				force_fetch: forceFetch
			}
        })
            .then(response => {
                if (response?.data?.success === 'ok') {
                    mixedContentData = response.data.data;

                    // Render status
                    renderStatusContainer(mixedContentData);

                    // Render mixed content list
                    renderMixedContentItems(mixedContentData.details || {});
                } else {
                    const errorMessage = response?.data?.error || 'Failed to fetch mixed content data';
                    throw new Error(errorMessage);
                }
            })
            .catch(error => {
                console.error("Failed to fetch mixed content data:", error);

                // Render error in status container
                const errorData = {
                    status: 'error',
                    message: 'Error loading Mixed Content data',
                    error: error.message || 'Unknown error occurred'
                };
                showCraftMessage('error', errorData.error);
                renderStatusContainer(errorData);

                // Hide mixed content section
                if (mixedContentSection) {
                    mixedContentSection.style.display = 'none';
                }
            }).finally(() => {
                refreshBtn.disabled = false;
            });
    }

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            fetchMixedContentData(true);
            showSkeletons(statusContainerWrapper,mixedContentSection)
            refreshBtn.disabled = true;
        });
    }

    // Render Mixed Content items
    function renderMixedContentItems(details) {
        if (!details || !details.mixedContentItems || details.mixedContentItems.length === 0) {
            if (mixedContentSection) {
                mixedContentSection.innerHTML = '';
                mixedContentSection.style.display = 'none';
            }
            return;
        }

        let html = `
            <div class="pane" id="mixed-content-section">
                <div class="data fullwidth">
                    <div class="field">
                        <div class="heading">Mixed Contents</div>
                        <ul class="error-list margin-top">
                            ${details.mixedContentItems.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;

        if (mixedContentSection) {
            mixedContentSection.innerHTML = html;
            mixedContentSection.style.display = 'block';
        }
    }

    // Initial fetch on page load (no loader, skeleton is already visible)
    fetchMixedContentData();
}
function showSkeletons(statusContainerWrapper, dataContainer) {
	if (statusContainerWrapper) {
		statusContainerWrapper.innerHTML = `
			<div class="skeleton-card">
				<div class="skeleton-card-header">
					<div class="skeleton-line skeleton-line-medium"></div>
				</div>
				<div class="skeleton-card-body">
					<div class="skeleton-line skeleton-line-long"></div>
					<div class="skeleton-line skeleton-line-short"></div>
				</div>
			</div>
		`;
	}

	if (dataContainer) {
		dataContainer.style.display = 'none';
		dataContainer.innerHTML = '';
	}
}

function registerReachabilityJs() {
    const refreshBtn = document.getElementById("refresh-btn");
    const statusContainerWrapper = document.getElementById("status-container-wrapper");
    const reachabilitySection = document.getElementById("reachability-section");

    if (refreshBtn) refreshBtn.disabled = true;

    // Only run on reachability page - check for unique element
    if (!statusContainerWrapper || !reachabilitySection || !document.querySelector('[data-page="reachability"]')) {
        return;
    }

    let reachabilityData = {};

    // Function to fetch reachability data
    function fetchReachabilityData(forceFetch = false) {
        return Craft.sendActionRequest('POST', 'upsnap/health-check/reachability', {			
            data: {
				force_fetch: forceFetch
			}})
                .then(response => {
                    if (response?.data?.success === 'ok') {
                        reachabilityData = response.data.data;

                        // Render containers
                        renderStatusContainer(reachabilityData);
                        renderReachabilityDetails(reachabilityData.details || {});
                    } else {
                        const errorMessage = response?.data?.error || 'Failed to fetch reachability data';
                        throw new Error(errorMessage);
                    }
            })
            .catch(error => {
                console.error("Failed to fetch reachability data:", error);

                // Render error in status container
                const errorData = {
                    status: 'error',
                    message: 'Error loading Reachability data',
                    error: error.message || 'Unknown error occurred'
                };
                showCraftMessage('error', errorData.error);
                renderStatusContainer(errorData);

                // Hide reachability section
                if (reachabilitySection) {
                    reachabilitySection.style.display = 'none';
                } 
            }).finally(() => {
                refreshBtn.disabled = false;
            });
    }


    // Render Reachability details
    function renderReachabilityDetails(details) {
        if (!details) {
            if (reachabilitySection) {
                reachabilitySection.innerHTML = '';
                reachabilitySection.style.display = 'none';
            }
            return;
        }

        let html = `
            <div class="details-section">
                <h3 class="details-title">Check details</h3>

                <table class="details-table">
                    ${details?.monitoredFrom ? `
                    <tr>
                        <td class="details-label">Monitored from</td>
                        <td class="details-value">
                            ${details?.monitoredFrom?.location ?? 'Unknown'}
                        </td>
                    </tr>
                    ` : ''}
                </table>

                <div id="more-details">
                    <h3 class="pt-2rem details-title">HTTP Details</h3>
                    <table class="details-table">
                        <tr>
                            <td class="details-label">HTTP Status</td>
                            <td class="details-value">${details?.httpStatus ?? '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Final URL</td>
                            <td class="details-value">${details?.finalURL ?? '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Redirect Paths</td>
                            <td class="details-value">${details?.redirects?.length ? details.redirects.join(' → ') : '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Resolved IPs</td>
                            <td class="details-value">${details?.resolvedIPs?.length ? details.resolvedIPs.join(', ') : '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Server Technology</td>
                            <td class="details-value">${details?.server ?? '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Content Type</td>
                            <td class="details-value">${details?.contentType ?? '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Content Length</td>
                            <td class="details-value">${details?.contentLength ? details.contentLength + ' bytes' : '–'}</td>
                        </tr>
                    </table>

                    <h2 class="pt-2rem details-title">Page Info</h2>
                    <table class="details-table">
                        <tr>
                            <td class="details-label">Page Title</td>
                            <td class="details-value">${details?.pageTitle ?? '–'}</td>
                        </tr>
                    </table>

                    ${details?.tls ? `
                    <h2 class="pt-2rem">TLS / Security</h2>
                    <table class="details-table">
                        <tr>
                            <td class="details-label">TLS Version</td>
                            <td class="details-value">${details?.tls?.version ?? '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Protocol (ALPN)</td>
                            <td class="details-value">${details?.tls?.alpn ?? '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Encryption Method</td>
                            <td class="details-value">${details?.tls?.cipherSuite ?? '–'}</td>
                        </tr>
                        <tr>
                            <td class="details-label">Certificate Host</td>
                            <td class="details-value">${details?.tls?.serverName ?? '–'}</td>
                        </tr>
                    </table>
                    ` : ''}
                </div>

                <a href="#" class="show-less">Show less</a>
                <a href="#" class="show-details hidden">Show more</a>
            </div>
        `;

        if (reachabilitySection) {
            reachabilitySection.innerHTML = html;
            reachabilitySection.style.display = 'block';

            // Bind show more / less
            toggleShowDetails(reachabilitySection);
        }
    }

    // Helper function for HTTP status class
    function getHttpStatusClass(status) {
        if (status >= 100 && status < 200) return 'info';
        if (status >= 200 && status < 300) return 'success';
        if (status >= 300 && status < 400) return 'redirect';
        if (status >= 400 && status < 500) return 'warning';
        if (status >= 500) return 'error';
        return 'unknown';
    }

    // Initial fetch on page load (no loader, skeleton is already visible)
    fetchReachabilityData();

    // Add event listener for refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            fetchReachabilityData(true);
            showSkeletons(statusContainerWrapper, reachabilitySection)
            refreshBtn.disabled = true;
        });
    }
}

function registerSecurityCertificatesJs() {
    const refreshBtn = document.getElementById("refresh-btn");
    const statusContainerWrapper = document.getElementById("status-container-wrapper");
    const dataContainer = document.getElementById("security-certificates-section");

    if (refreshBtn) refreshBtn.disabled = true;

    // Only run on security certificates page - check for unique element
    if (!statusContainerWrapper || !document.querySelector('[data-page="security-certificates"]')) {
        return;
    }

    let securityCertificatesData = {};

    // Function to fetch security certificates data
    function fetchSecurityCertificatesData(forceFetch = false) {
        return Craft.sendActionRequest('POST', 'upsnap/health-check/security-certificates', {
            data: {
				force_fetch: forceFetch
			}
        })
            .then(response => {
                if (response?.data?.success === 'ok') {
                    securityCertificatesData = response.data.data;

                    // Render status
                    renderStatusContainer(securityCertificatesData);

                    // Render security certificates details
                    renderSecurityCertificatesDetails(securityCertificatesData.details || {});
                } else {
                    const errorMessage = response?.data?.error || 'Failed to fetch security certificates data';
                    throw new Error(errorMessage);
                }
            })
            .catch(error => {
                console.error("Failed to fetch security certificates data:", error);

                // Render error in status container
                const errorData = {
                    status: 'error',
                    message: 'Error loading Security Certificates data',
                    error: error.message || 'Unknown error occurred'
                };
                showCraftMessage('error', errorData.error);
                renderStatusContainer(errorData);
            }).finally(() => {
                refreshBtn.disabled = false;
            });
    }

    // Render Security Certificates details
    function renderSecurityCertificatesDetails(details) {
        if (!details) {
            return;
        }

        let html = `
            <div class="details-section">
                <h3 class="details-title">Certificate details</h3>

                <table class="details-table">
                    <tr>
                        <td class="details-label">Issuer</td>
                        <td class="details-value">
                            ${details.leafCertificate?.issuer?.commonName || 'Unknown'}
                        </td>
                    </tr>
                    <tr>
                        <td class="details-label">Not before</td>
                        <td class="details-value">
                            ${details.leafCertificate?.notBefore ? formatDate(details.leafCertificate.notBefore) : 'Unknown'}
                        </td>
                    </tr>
                    <tr>
                        <td class="details-label">Not after</td>
                        <td class="details-value">
                            ${details.leafCertificate?.notAfter ? formatDate(details.leafCertificate.notAfter) : 'Unknown'}
                        </td>
                    </tr>
                    <tr>
                        <td class="details-label">Expiry in days</td>
                        <td class="details-value">
                            ${details.leafCertificate?.daysUntilExpiry || 'Unknown'}
                        </td>
                    </tr>
                    <tr>
                        <td class="details-label">Serial number</td>
                        <td class="details-value">
                            ${details.leafCertificate?.serialNumber || 'Unknown'}
                        </td>
                    </tr>
                    <tr>
                        <td class="details-label">Signature algorithm</td>
                        <td class="details-value">
                            ${details.leafCertificate?.signatureAlgorithm || 'Unknown'}
                        </td>
                    </tr>
                    <tr>
                        <td class="details-label">Public key algorithm</td>
                        <td class="details-value">
                            ${renderPublicKeyInfo(details.leafCertificate?.publicKey)}
                        </td>
                    </tr>
                </table>

                <div id="more-details" class="hidden">
                    <h3 class="pt-2rem details-title">Domain Coverage</h3>
                    <table class="details-table">
                        <tr>
                            <td class="details-label">Domains Covered</td>
                            <td class="details-value">
                            <div class="domain-coverage">
                                ${details.domainCoverage?.sans?.join(', ') || '–'}
                            </div>
                            </td>
                        </tr>
                        <tr>
                            <td class="details-label">Wildcard</td>
                            <td class="details-value">
                                ${details.domainCoverage?.wildcard ? 'Yes' : 'No'}
                            </td>
                        </tr>
                    </table>

                    ${details.chain ? `
                    <h3 class="pt-2rem details-title">Certificate Chain</h3>
                    <div class="certificate-chain">
                        ${details.chain.map((cert, index) => `
                            <div class="certificate-card">
                                <div class="certificate-header">
                                    <div>
                                        <h4 class="certificate-title">
                                            ${cert.info?.subject?.commonName || cert.info?.subject?.organizationName || 'Unknown Certificate'}
                                        </h4>
                                        <div class="certificate-type">
                                            ${cert.type === 'leaf' ? 'End Entity Certificate' :
                cert.type === 'intermediate' ? 'Intermediate Certificate' : 'Root Certificate'}
                                        </div>
                                    </div>
                                    <div class="certificate-status">
                                        ${renderCertificateStatus(cert.info)}
                                    </div>
                                </div>

                                <div class="certificate-body">
                                    <div class="certificate-grid">
                                        <div class="cert-field">
                                            <div class="cert-field-label">Signature Algorithm</div>
                                            <div class="cert-field-value">${cert.info?.signatureAlgorithm || 'Unknown'}</div>
                                        </div>

                                        <div class="cert-field">
                                            <div class="cert-field-label">Key Algorithm</div>
                                            <div class="cert-field-value">
                                                ${renderPublicKeyInfo(cert.info?.publicKey)}
                                            </div>
                                        </div>

                                        <div class="cert-field">
                                            <div class="cert-field-label">Not Before</div>
                                            <div class="cert-field-value">${cert.info?.notBefore ? formatDate(cert.info.notBefore) : 'Unknown'}</div>
                                        </div>

                                        <div class="cert-field">
                                            <div class="cert-field-label">Not After</div>
                                            <div class="cert-field-value">${cert.info?.notAfter ? formatDate(cert.info.notAfter) : 'Unknown'}</div>
                                        </div>

                                        ${cert.info?.issuer?.organizationName ? `
                                        <div class="cert-field">
                                            <div class="cert-field-label">Organization</div>
                                            <div class="cert-field-value">${cert.info.issuer.organizationName}</div>
                                        </div>
                                        ` : ''}

                                        ${cert.info?.issuer?.commonName ? `
                                        <div class="cert-field">
                                            <div class="cert-field-label">Issued By</div>
                                            <div class="cert-field-value">${cert.info.issuer.commonName}</div>
                                        </div>
                                        ` : ''}

                                        <div class="cert-field">
                                            <div class="cert-field-label">Serial Number</div>
                                            <div class="cert-field-value mono">${cert.info?.serialNumber || 'Unknown'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ${index < details.chain.length - 1 ? '<div class="chain-connector"><div class="chain-arrow"></div></div>' : ''}
                        `).join('')}
                    </div>
                    ` : ''}
                </div>

                <a href="#" class="show-less hidden">Show less</a>
                <a href="#" class="show-details">Show more</a>
            </div>
        `;

        // Insert after details container
        if (dataContainer) {
            dataContainer.style.display = 'block';
            dataContainer.innerHTML = html;
            toggleShowDetails(dataContainer);
        }
    }

    // Helper function to render public key info
    function renderPublicKeyInfo(publicKey) {
        if (!publicKey) return 'Unknown';
        if (publicKey.algorithm === 'ECC') {
            return `${publicKey.algorithm} (${publicKey.curve})`;
        } else if (publicKey.algorithm === 'RSA') {
            return `${publicKey.algorithm} (${publicKey.bits} bits)`;
        } else {
            return publicKey.algorithm;
        }
    }

    // Helper function to render certificate status
    function renderCertificateStatus(certInfo) {
        if (!certInfo) return '';

        if (certInfo.isExpired) {
            return `<div class="status-pill status-expired">
                <span class="status-icon expired"></span>
                Expired
            </div>`;
        } else if (certInfo.daysUntilExpiry <= 30) {
            return `<div class="status-pill status-warning">
                <span class="status-icon warning"></span>
                Expires in ${certInfo.daysUntilExpiry} days
            </div>`;
        } else {
            return `<div class="status-pill status-valid">
                <span class="status-icon"></span>
                Valid for ${certInfo.daysUntilExpiry} days
            </div>`;
        }
    }

    // Initial fetch on page load (no loader, skeleton is already visible)
    fetchSecurityCertificatesData();

    // Add event listener for refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            fetchSecurityCertificatesData(true);
            showSkeletons(statusContainerWrapper, dataContainer)
            refreshBtn.disabled = true;
        });
    }
}


function renderStatusContainer(data) {
    const statusContainerWrapper = document.getElementById("status-container-wrapper");
    const status = data.status || 'warning';
    const message = data.message || '';
    const error = data.error || '';
    const checkedAt = data.checkedAt || '';

    let formattedDate = '';
    if (checkedAt) {
        const date = new Date(checkedAt);
        formattedDate = date.toLocaleString();
    }

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

    const html = `
        <div class="status-container ${containerClass}">
            <div class="status-header">
                <div class="status-left">
                    <div class="status-icon ${statusClass}">${icon}</div>
                    <h3 class="status-title">${title}</h3>
                </div>

                ${formattedDate ? `
                    <div class="status-checked-at">
                        Last checked: ${formattedDate}
                    </div>
                ` : ''}
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