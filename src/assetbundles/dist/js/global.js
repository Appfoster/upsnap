// Global JavaScript functionality used across multiple pages

// ----------------------------------------
// Global Utility Functions (UpsnapUtils namespace)
// ----------------------------------------
window.UpsnapUtils = window.UpsnapUtils || {};

/**
 * Aggregates response time data based on the selected time range
 * to reduce the number of data points and improve performance
 *
 * Aggregation strategy:
 * - last_hour: No aggregation (raw data)
 * - last_24_hours: Hourly aggregation (1 hour intervals)
 * - last_7_days: 6-hour aggregation
 * - last_30_days: Daily aggregation
 * - last_90_days: Weekly aggregation
 *
 * @param {Array} data - Array of response time data points {timestamp, response_time}
 * @param {string} timeRange - The selected time range filter
 * @returns {Array} Aggregated data points
 */
window.UpsnapUtils.aggregateResponseTimeData = function(data, timeRange) {
    if (!data || data.length === 0) return [];

    // Filter out points with null timestamps
    const validData = data.filter(point => point.timestamp !== null);

    if (validData.length === 0) return [];

    let intervalSeconds = 0;

    // Determine the interval based on time range
    switch (timeRange) {
        case 'last_hour':
            return validData; // No aggregation needed for hourly view
        case 'last_24_hours':
            intervalSeconds = 60 * 60; // 1 hour
            break;
        case 'last_7_days':
            intervalSeconds = 60 * 60 * 6; // 6 hours
            break;
        case 'last_30_days':
            intervalSeconds = 60 * 60 * 24; // 1 day
            break;
        case 'last_90_days':
        case 'last_year':
            intervalSeconds = 60 * 60 * 24 * 7; // 1 week
            break;
        default:
            return validData;
    }

    // Group data points into intervals
    const groups = {};

    validData.forEach(point => {
        const intervalStart = Math.floor(point.timestamp / intervalSeconds) * intervalSeconds;
        if (!groups[intervalStart]) {
            groups[intervalStart] = [];
        }
        groups[intervalStart].push(point);
    });

    // Calculate average response time for each interval
    const aggregated = Object.entries(groups)
        .map(([time, points]) => {
            // Filter out null values before calculating average
            const validPoints = points.filter(p => p.response_time !== null);

            if (validPoints.length === 0) {
                return {
                    timestamp: parseInt(time),
                    response_time: null,
                };
            }

            const average = Math.round(
                validPoints.reduce((sum, p) => sum + (p.response_time || 0), 0) /
                    validPoints.length
            );

            return {
                timestamp: parseInt(time),
                response_time: average,
            };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

    return aggregated;
};

document.addEventListener("DOMContentLoaded", function () {
    // Global show-details functionality
    const moreDetails = document.getElementById('more-details');
    const showDetailsBtn = document.querySelector('.show-details');
    const showLessBtn = document.querySelector('.show-less');

    if (showDetailsBtn && showLessBtn && moreDetails) {
        showDetailsBtn.addEventListener('click', function (e) {
            e.preventDefault();
            moreDetails.classList.remove('hidden');
            showDetailsBtn.classList.add('hidden');
            showLessBtn.classList.remove('hidden');
        });

        showLessBtn.addEventListener('click', function (e) {
            e.preventDefault();
            moreDetails.classList.add('hidden');
            showDetailsBtn.classList.remove('hidden');
            showLessBtn.classList.add('hidden');
        });
    }

    // ----------------------------------------
    // Global Craft CP Page Title Enhancer
    // ----------------------------------------
    if (window.CraftPageData && window.CraftPageData.title && window.CraftPageData.monitorUrl) {
        const { title, monitorUrl } = window.CraftPageData;
        const heading = document.querySelector('#page-title h1, #page-heading');
        if (heading) {
            // Clean the display URL (remove protocol, www, and path)
            const displayUrl = monitorUrl
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split('/')[0];

            // Update the page title dynamically
            heading.innerHTML = `
                ${title}
                <a href="${monitorUrl}" target="_blank" rel="noopener" class="monitor-url">
                    (${displayUrl})
                </a>
            `;
        }
    }
});