// Global JavaScript functionality used across multiple pages

// ----------------------------------------
// Global Utility Functions (UpsnapUtils namespace)
// ----------------------------------------
window.UpsnapUtils = window.UpsnapUtils || {};

/**
 * Adaptive aggregation for response time data.
 * Produces ~30 buckets dynamically based on actual data span.
 */

window.UpsnapUtils.aggregateResponseTimeData = function (data, timeRange) {
    if (!data || data.length === 0) return [];

    // Filter valid timestamps
    const validData = data.filter(point => point.timestamp !== null);
    if (validData.length === 0) return [];

    const TARGET_POINTS = 30;

    const MIN_FLOOR_SECONDS = {
        last_hour:     60,              // 1 min
        last_24_hours: 60 * 5,          // 5 min
        last_7_days:   60 * 5,
        last_30_days:  60 * 10,
        last_90_days:  60 * 30,
        last_year:     60 * 30,
    };

    const MAX_CEIL_SECONDS = {
        last_hour:     60 * 5,              // 5 min
        last_24_hours: 60 * 60,             // 1 hr
        last_7_days:   60 * 60 * 6,
        last_30_days:  60 * 60 * 24,
        last_90_days:  60 * 60 * 24 * 7,
        last_year:     60 * 60 * 24 * 7,
    };

    // Fallback if unknown filter
    if (!Object.prototype.hasOwnProperty.call(MIN_FLOOR_SECONDS, timeRange)) {
        return validData;
    }

    // Find min/max timestamps (single pass)
    let minTs = validData[0].timestamp;
    let maxTs = validData[0].timestamp;

    for (let i = 1; i < validData.length; i++) {
        if (validData[i].timestamp < minTs) minTs = validData[i].timestamp;
        if (validData[i].timestamp > maxTs) maxTs = validData[i].timestamp;
    }

    const actualSpan = maxTs - minTs;

    // If all timestamps same → no aggregation needed
    if (actualSpan === 0) return validData;

    // Adaptive interval
    const candidateInterval = Math.ceil(actualSpan / TARGET_POINTS);

    const intervalSeconds = Math.min(
        Math.max(candidateInterval, MIN_FLOOR_SECONDS[timeRange]),
        MAX_CEIL_SECONDS[timeRange]
    );

    // Grouping
    const groups = {};

    validData.forEach(point => {
        const intervalStart =
            Math.floor(point.timestamp / intervalSeconds) * intervalSeconds;

        if (!groups[intervalStart]) {
            groups[intervalStart] = [];
        }

        groups[intervalStart].push(point);
    });

    // Aggregate (average)
    const aggregated = Object.entries(groups)
        .map(([time, points]) => {
            const validPoints = points.filter(p => p.response_time !== null);

            if (validPoints.length === 0) {
                return {
                    timestamp: parseInt(time),
                    response_time: null,
                };
            }

            const avg = Math.round(
                validPoints.reduce((sum, p) => sum + (p.response_time || 0), 0) /
                validPoints.length
            );

            return {
                timestamp: parseInt(time),
                response_time: avg,
            };
        })
        .sort((a, b) => a.timestamp - b.timestamp);

    return aggregated;
};

/**
 * Canonical integration types
 */
window.UpsnapUtils.INTEGRATIONS_TYPES = {
    webhook: { name: "webhook", label: "Webhook" },
    google_chat: { name: "google_chat", label: "Google Chat" },
    discord: { name: "discord", label: "Discord" },
    mail: { name: "mail", label: "Email" },
    email: { name: "mail", label: "Email" },
    slack: { name: "slack", label: "Slack" },
    telegram: { name: "telegram", label: "Telegram" },
    teams: { name: "teams", label: "Microsoft Teams" },
    pagerduty: { name: "pagerduty", label: "PagerDuty" },
    zapier: { name: "zapier", label: "Zapier" },
};

window.UpsnapUtils.humanizeToken = function (str) {
    if (!str) return "";
    return String(str)
        .replace(/[_-]+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
};

window.UpsnapUtils.formatDateDisplay = function (dateValue) {
    if (!dateValue) return "N/A";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "N/A";

    return date.toLocaleString();
};

window.UpsnapUtils.normalizeIntegrationType = function (type) {
    if (!type) return "";
    const raw = String(type).toLowerCase().trim().replace(/-/g, "_");

    const aliases = {
        email: "mail",
        googlechat: "google_chat",
        microsoft_teams: "teams",
        ms_teams: "teams",
    };

    if (aliases[raw]) return aliases[raw];
    if (raw.includes("google") && raw.includes("chat")) return "google_chat";
    return raw;
};

window.UpsnapUtils.getIntegrationMeta = function (type) {
    const normalized = window.UpsnapUtils.normalizeIntegrationType(type);
    const map = window.UpsnapUtils.INTEGRATIONS_TYPES || {};

    if (map[normalized]) {
        return map[normalized];
    }

    return {
        name: normalized || "integration",
        label: window.UpsnapUtils.humanizeToken(normalized || "Integration"),
    };
};

window.UpsnapUtils.getIntegrationIcon = function (type, options = {}) {
    const fallbackSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="M3 7l9 6 9-6"></path></svg>';

    const logoBaseUrl = options.logoBaseUrl || window?.Upsnap?.settings?.logoBaseUrl || "";
    const imgClass = options.imgClass || "integration-icon-img";
    const fallbackClass = options.fallbackClass || "integration-icon-fallback";

    const meta = window.UpsnapUtils.getIntegrationMeta(type);
    const iconName = meta?.name || window.UpsnapUtils.normalizeIntegrationType(type);

    if (!iconName || !logoBaseUrl) {
        return `<span class="${fallbackClass}">${fallbackSvg}</span>`;
    }

    const normalizedName = iconName.toLowerCase().replace(/_/g, "-");
    const humanName = meta?.label || window.UpsnapUtils.humanizeToken(iconName);

    return `<img
        src="${logoBaseUrl}/${normalizedName}.png"
        alt="${humanName} integration"
        class="${imgClass}"
        onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
    /><span class="${fallbackClass}" aria-hidden="true" style="display:none">${fallbackSvg}</span>`;
};

window.UpsnapUtils.getNotificationChannelDisplayInfo = function (channel, fallback = "Configured") {
    if (!channel || typeof channel !== "object") return fallback;

    const channelType = window.UpsnapUtils.normalizeIntegrationType(channel.channel_type);
    const cfg = channel.config || {};

    switch (channelType) {
        case "mail":
            return cfg?.recipients?.to || "No email configured";
        case "discord":
            if (cfg.webhook_url) {
                try {
                    const url = new URL(cfg.webhook_url);
                    const parts = url.pathname.split("/");
                    if (parts.length >= 4 && parts[3]) {
                        return `Discord Webhook (${parts[3]})`;
                    }
                } catch (e) {}
                return "Discord Webhook";
            }
            return "No webhook configured";
        case "google_chat":
            if (cfg.webhook_url) {
                try {
                    const url = new URL(cfg.webhook_url);
                    const match = url.pathname.match(/\/spaces\/([^/]+)/);
                    if (match?.[1]) {
                        return `Google Chat Space (${match[1]})`;
                    }
                } catch (e) {}
                return "Google Chat Webhook";
            }
            return "No webhook configured";
        case "telegram":
            if (cfg.chat_id && cfg.bot_token) {
                return `${cfg.chat_id} (${String(cfg.bot_token).substring(0, 4)}***)`;
            }
            return cfg.chat_id || "No bot configured";
        case "slack":
            if (cfg.webhook_url) {
                try {
                    const url = new URL(cfg.webhook_url);
                    const parts = url.pathname.split("/");
                    if (parts.length >= 4 && parts[3]) {
                        return `Slack Webhook (${parts[3]})`;
                    }
                } catch (e) {}
                return "Slack Webhook";
            }
            return "No webhook configured";
        case "webhook":
            return cfg.webhook_url || "No webhook configured";
        default:
            return fallback;
    }
};

window.UpsnapRefreshDashboardHeader = function () {
    if (!window.CraftPageData || !window.CraftPageData.title) return;

    const { title, monitorUrl, monitorData } = window.CraftPageData;
    const heading = document.querySelector('#page-title h1, #page-heading');
    if (!heading) return;

    const existingBanner = document.getElementById("keyword-filters-banner");
    if (existingBanner) {
        existingBanner.remove();
    }

    let monitorUrlHtml = "";
    if (monitorUrl) {
        const displayUrl = String(monitorUrl)
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0];

        monitorUrlHtml = `
            <a href="${monitorUrl}" target="_blank" rel="noopener" class="monitor-url">
                (${displayUrl})
            </a>
        `;
    }

    heading.innerHTML = `${title}${monitorUrlHtml}`;

    if (!monitorData || monitorData.service_type !== "keyword") return;

    const keywordService = monitorData?.config?.services?.keyword || {};
    const keywords = Array.isArray(keywordService.keywords)
        ? keywordService.keywords
        : [];

    const escapeHtml = (value) => String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const matchText = keywordService.match_all ? "All must match" : "Any must match";

    const keywordItemsHtml = keywords
        .map((kw) => {
            const isMustNotContain = kw?.type === "must_not_contain";
            const labelClass = isMustNotContain
                ? "kf-label--must-not-contain"
                : "kf-label--must-contain";
            const labelText = isMustNotContain
                ? "Must not contain"
                : "Must contain";
            const keywordText = escapeHtml(kw?.text || "");

            return `
                <div class="kf-banner__line">
                    <span class="kf-label ${labelClass}">${labelText}</span>
                    <span class="kf-colon">:</span>
                    <span class="kf-keyword-text">&quot;${keywordText}&quot;</span>
                </div>
            `;
        })
        .join("");

    const bannerHtml = `
        <div id="keyword-filters-banner" class="kf-banner kf-banner--title">
            <div class="kf-banner__header">
                <span class="kf-banner__heading">KEYWORD FILTERS</span>
                <span class="kf-match-pill">${matchText}</span>
            </div>
            <div class="kf-banner__body">
                ${keywordItemsHtml}
            </div>
        </div>
    `;

    const contentRoot = document.getElementById("content");
    if (contentRoot && contentRoot.parentNode) {
        contentRoot.insertAdjacentHTML("beforebegin", bannerHtml);
        return;
    }

    const statusWrapper = document.getElementById("status-container-wrapper");
    if (statusWrapper && statusWrapper.parentNode) {
        statusWrapper.insertAdjacentHTML("beforebegin", bannerHtml);
        return;
    }

    const titleContainer = heading.closest("#page-title") || heading.parentElement;
    if (titleContainer && titleContainer.parentNode) {
        titleContainer.insertAdjacentHTML("afterend", bannerHtml);
    }
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
    if (typeof window.UpsnapRefreshDashboardHeader === "function") {
        window.UpsnapRefreshDashboardHeader();
    }
});