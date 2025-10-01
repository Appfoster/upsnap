// Dashboard-specific JavaScript functionality

document.addEventListener("DOMContentLoaded", function () {
    // Dashboard-specific initialization
    initializeDashboard();
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
    }  else {
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

function fetchAndRenderCard({ action, cardId, title, detailUrl, getMessage, getStatus }) {
    Craft.sendActionRequest('POST', action)
        .then((response) => {
            const data = response?.data?.data;
            renderCard({
                cardId,
                title,
                status: getStatus ? getStatus(data) : data.status,
                message: getMessage ? getMessage(data) : (data.status === 'ok' ? data.message : data.error),
                checkedAt: data.checkedAt,
                detailUrl
            });
        })
        .catch((error) => {
            let msg = error.response && error.response.data
                ? error.response.data.error || 'Unknown error'
                : error.message;
            renderErrorCard({ cardId, title, errorMsg: msg });
        });
}

function initializeDashboard() {
    fetchAndRenderCard({
        action: 'upsnap/health-check/reachability',
        cardId: 'reachability-card',
        title: 'Reachability',
        detailUrl: Craft.getCpUrl('upsnap/reachability')
    });

    fetchAndRenderCard({
        action: 'upsnap/health-check/security-certificates',
        cardId: 'ssl-card',
        title: 'Security Certificates',
        detailUrl: Craft.getCpUrl('upsnap/security-certificates')
    });

    fetchAndRenderCard({
        action: 'upsnap/health-check/broken-links',
        cardId: 'broken-links-card',
        title: 'Broken Links',
        detailUrl: Craft.getCpUrl('upsnap/broken-links'),
        getMessage: (data) => data.status === 'false' ? data.error : data.message
    });

    fetchAndRenderCard({
        action: 'upsnap/health-check/domain-check',
        cardId: 'domain-check-card',
        title: 'Domain Check',
        detailUrl: Craft.getCpUrl('upsnap/domain-check'),
    });

    fetchAndRenderCard({
        action: 'upsnap/health-check/mixed-content',
        cardId: 'mixed-content-card',
        title: 'Mixed Content Check',
        detailUrl: Craft.getCpUrl('upsnap/mixed-content'),
    });

    fetchAndRenderCard({
        action: 'upsnap/health-check/lighthouse',
        cardId: 'lighthouse-card',
        title: 'Lighthouse Scores',
        detailUrl: Craft.getCpUrl('upsnap/lighthouse'),
    });
}