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
    // Domain check specific functionality (refresh button handled globally)
    // Add any domain check specific JS here
}

function registerLighthouseJs() {
    const deviceSelector = document.getElementById("device-selector");
    let currentDevice = deviceSelector?.value || 'desktop';

    const scoresContainer = document.getElementById("scores-container");
    const performanceContainer = document.getElementById("performance-container");
    const lighthouseDataElement = document.getElementById("lighthouse-data");

    if (!lighthouseDataElement || !scoresContainer || !performanceContainer) {
        return;
    }

    let lighthouseData = {};

    // Parse lighthouse data
    try {
        lighthouseData = JSON.parse(lighthouseDataElement.textContent);
    } catch (e) {
        console.error('Failed to parse lighthouse data:', e);
        lighthouseData = {
            result: {
                details: {
                    lighthouse: {
                        pages: []
                    }
                }
            }
        };
    }

    // Device tab switching
    if (deviceSelector) {
        deviceSelector.addEventListener('change', function () {
            currentDevice = this.value;

            document.getElementById("loading-overlay").style.display = "flex";

            Craft.sendActionRequest('POST', 'upsnap/health-check/lighthouse', {
                data: { device: currentDevice }
            })
            .then(response => {
                lighthouseData = response?.data?.data;
                renderLighthouseData();
            })
            .catch(error => {
                console.error("Failed to fetch Lighthouse data:", error);
            })
            .finally(() => {
                document.getElementById("loading-overlay").style.display = "none";
            });
        });
    }
    function getScoreColor(score) {
        if (score >= 90)
            return '#009967';

        // success green
        if (score >= 50)
            return '#fc9105';

        // warning yellow
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
        const pages = lighthouseData?.result?.details.lighthouse?.meta || [];
        if (pages.length === 0) {
            scoresContainer.innerHTML = '<p>No lighthouse data available</p>';
            performanceContainer.innerHTML = '';
            performanceContainer.style.display = 'none';
            return;
        }

        // Render core scores
        const meta = lighthouseData?.result?.details.lighthouse?.meta || {};
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
            {
                key: 'firstContentfulPaint',
                name: 'First Contentful Paint'
            },
            {
                key: 'largestContentfulPaint',
                name: 'Largest Contentful Paint'
            },
            {
                key: 'totalBlockingTime',
                name: 'Total Blocking Time'
            },
            {
                key: 'cumulativeLayoutShift',
                name: 'Cumulative Layout Shift'
            }, {
                key: 'speedIndex',
                name: 'Speed Index'
            }
        ];

        metrics.forEach(metric => {
            const metricData = performance[metric.key];
            if (metricData) {
                metricsHTML += createMetricItem(metric.name, metricData.displayValue || metricData.value, metricData.status || 'warning');
            }
        });

        metricsHTML += '</div>';
        performanceContainer.innerHTML = metricsHTML;
    }

    // Initial render
    renderLighthouseData();
}

function registerMixedContentJs() {
    // Mixed content specific functionality (refresh button handled globally)
    // Add any mixed content specific JS here
}

function registerReachabilityJs() {
    // Reachability specific functionality (refresh button handled globally)
    // Add any reachability specific JS here
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