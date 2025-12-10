// Dashboard-specific JavaScript functionality

document.addEventListener("DOMContentLoaded", function () {
    const refreshBtn = document.getElementById("refresh-btn");

    // Initial dashboard load
    initializeDashboard();

    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            runWithRefreshButton(refreshBtn, initializeDashboard);
        });
    }
});


function renderCard({ cardId, title, status, message, checkedAt, detailUrl }) {
    const card = document.getElementById(cardId);
    if (!card) return;

    card.classList.remove('skeleton');

    let statusClass = status === 'ok' ? 'success' : (status === 'error' ? 'error' : 'warning');
    let icon = status === 'ok' ? '✓' : (status === 'error' ? '✗' : '!');
    let formattedCheckedAt = '';
    if (checkedAt) {
        formattedCheckedAt = new Date(checkedAt).toLocaleString();
    } else {
        formattedCheckedAt = 'N/A';
    }
    card.innerHTML = `
        <div class="card-header">
            <h3>${title}</h3>
            <hr>
        </div>
        <div class="card-body">
            <p class="status-message"><span class="status-icon ${statusClass}">${icon}</span> ${message ?? 'Something Went Wrong!'}</p>
            <p><strong>Last checked at:</strong> ${formattedCheckedAt}</p>
        </div>
        <div class="card-footer">
            <a href="${detailUrl}" class="detail-link" target="_blank" rel="noopener">View Details →</a>
        </div>
    `;
}

function renderErrorCard({ cardId, title, errorMsg }) {
    const card = document.getElementById(cardId);
    if (!card) return;

    card.classList.remove('skeleton');
    card.innerHTML = `
        <div class="card-header">
            <h3>${title}</h3>
            <hr>
        </div>
        <div class="card-body">
            <p class="error">✗ Failed to load ${title.toLowerCase()}: ${errorMsg}</p>
        </div>
    `;
}

function fetchAndRenderCard({ action, cardId, getMessage, getStatus }) {
    return Craft.sendActionRequest('POST', action)
        .then((response) => {
            response = response?.data;
            const data = response?.data;

            renderCard({
                cardId,
                title: response?.title,
                status: getStatus ? getStatus(data) : data.status,
                message: getMessage ? getMessage(data) : (data.status === 'ok' ? data.message : data.error),
                checkedAt: data.checkedAt,
                detailUrl: response?.url
            });
        })
        .catch((error) => {
            const msg = error.response && error.response.data
                ? error.response.data.error || 'Unknown error'
                : error.message;
            renderErrorCard({ cardId, title: action, errorMsg: msg });
        });
}


function initializeDashboard() {
    const calls = [
        fetchAndRenderCard({
            action: 'upsnap/health-check/reachability',
            cardId: 'reachability-card',
        }),
        fetchAndRenderCard({
            action: 'upsnap/health-check/security-certificates',
            cardId: 'ssl-card',
        }),
        fetchAndRenderCard({
            action: 'upsnap/health-check/broken-links',
            cardId: 'broken-links-card',
            getMessage: (data) => data.status === 'false' ? data.error : data.message
        }),
        fetchAndRenderCard({
            action: 'upsnap/health-check/domain-check',
            cardId: 'domain-check-card',
        }),
        fetchAndRenderCard({
            action: 'upsnap/health-check/mixed-content',
            cardId: 'mixed-content-card',
        }),
        fetchAndRenderCard({
            action: 'upsnap/health-check/lighthouse',
            cardId: 'lighthouse-card',
        }),
    ];

    // Return a promise that resolves when all requests finish
    return Promise.allSettled(calls);
}

function runWithRefreshButton(button, fetchFn) {
    if (!button || typeof fetchFn !== 'function') return;

    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.classList.add('disabled');

    return Promise.resolve()
        .then(fetchFn)
        .catch(err => {
            console.error("Dashboard refresh error:", err);
        })
        .finally(() => {
            button.disabled = false;
            button.classList.remove('disabled');
            button.innerHTML = originalHtml;
        });
}
