// Notification Channels specific JavaScript functionality
document.addEventListener("DOMContentLoaded", function () {
    registerNotificationChannelsJs();
    registerAddChannel();
});

/**
 * Display Craft CP notification
 * @param {'success' | 'error' | 'notice'} type
 * @param {string} message
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
        default:
            Craft.cp.displayNotice(message);
            break;
    }
}

/**
 * Registers JS for Notification Channels tab
 */
function registerNotificationChannelsJs() {
    const tabContainer = document.getElementById("notification-channels-tab");
    const tableBody = document.getElementById("notification-channels-table-body");
    const addBtn = document.getElementById("add-notification-channel-btn");

    if (!tabContainer.classList.contains("hidden")) {
        loadNotificationChannels();
    }

    // Load when the tab becomes visible
    const observer = new MutationObserver(() => {
        if (!tabContainer.classList.contains("hidden")) {
            loadNotificationChannels();
        }
    });

    observer.observe(tabContainer, { attributes: true, attributeFilter: ["class"] });

    // Fetch channels from Craft action
    function loadNotificationChannels() {
        // Optional: clear table while loading
        tableBody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

        Craft.sendActionRequest("GET", "upsnap/monitor-notification-channels/list")
            .then((response) => {
                const { data } = response?.data || {};
                if (!data || !Array.isArray(data)) {
                    throw new Error("Invalid response format");
                }

                renderNotificationChannels(data);
            })
            .catch((error) => {
                console.error("Failed to load notification channels:", error);
                showCraftMessage(
                    "error",
                    error?.response?.data?.message || "Failed to load notification channels"
                );
                tableBody.innerHTML = `<tr><td colspan="3">Error loading data</td></tr>`;
            });
    }

    function renderNotificationChannels(channels) {
        window._upsnapNotificationChannelsData = channels;
        if (!channels.length) {
            tableBody.innerHTML = `<tr><td colspan="3" class="light">No notification channels found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        channels.forEach((channel) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${channel.type || "N/A"}</td>
                <td>${channel.config?.recipient || "—"}</td>
                <td>
                    <button type="button" class="btn small icon edit" data-id="${channel.id}" title="Edit Channel">
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
}

function registerAddChannel() {
    const modal = document.getElementById("add-notification-channel-modal");
    const openBtn = document.getElementById("add-notification-channel-btn");
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector(".upsnap-modal__close");
    const cancelBtn = document.getElementById("cancel-notification-channel-btn");
    const saveBtn = document.getElementById("save-notification-channel-btn");
    const typeField = document.getElementById("channelType");
    const recipientField = document.getElementById("channelRecipient");

    const resetForm = () => {
        if (typeField) typeField.value = "email";
        if (recipientField) recipientField.value = "";
    };

    const showModal = () => modal.classList.remove("hidden");
    const hideModal = () => modal.classList.add("hidden");

    openBtn.addEventListener("click", showModal);
    closeBtn?.addEventListener("click", hideModal);
    cancelBtn?.addEventListener("click", hideModal);

    saveBtn?.addEventListener("click", async () => {
        const type = typeField?.value || "email";
        const recipient = recipientField?.value.trim();

        if (!recipient) {
            Craft.Upsnap.Monitor.notify("Please enter recipient email.", "error");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        saveBtn.classList.add("disabled");

        try {
            const response = await fetch("/actions/upsnap/monitor-notification-channels/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": Craft.csrfTokenValue,
                },
                body: JSON.stringify({
                    type,
                    label: "Email Alerts",
                    config: { recipient },
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data?.message || "Failed to add notification channel.");
            }

            Craft.Upsnap.Monitor.notify(data?.message || "Notification channel added successfully.", "success");

            resetForm();
            hideModal();

            if (typeof window.loadNotificationChannels === "function") window.loadNotificationChannels();

        } catch (error) {
            const message = error?.message || "Something went wrong.";
            Craft.Upsnap.Monitor.notify(message, "error");
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Channel";
            saveBtn.classList.remove("disabled");
        }
    });
}