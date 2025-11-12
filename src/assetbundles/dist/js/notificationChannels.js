// Notification Channels specific JavaScript functionality
document.addEventListener("DOMContentLoaded", function () {
    registerNotificationChannelsJs();
    registerNotificationChannelModal();
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
        if (!channels.length) {
            tableBody.innerHTML = `<tr><td colspan="3" class="light">No notification channels found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        channels.forEach((channel) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class='capitalize'>${channel.channel_type || "N/A"}</td>
                <td>${channel.config?.recipients?.to || "—"}</td>
                <td>
                    <button type="button" class="btn small icon edit edit-channel-btn" data-channel='${JSON.stringify(channel)}' title="Edit Channel">
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Attach edit event listeners
        attachEditListeners();
    }

    function attachEditListeners() {
        const editButtons = tableBody.querySelectorAll(".edit-channel-btn");
        editButtons.forEach(button => {
            button.addEventListener("click", (e) => {
                const channelData = JSON.parse(e.currentTarget.getAttribute("data-channel"));
                openModalForEdit(channelData);
            });
        });
    }
}

/**
 * Registers modal functionality for add/edit
 */
function registerNotificationChannelModal() {
    const modal = document.getElementById("add-notification-channel-modal");
    const openBtn = document.getElementById("add-notification-channel-btn");
    if (!modal || !openBtn) return;

    const closeBtn = modal.querySelector(".upsnap-modal__close");
    const cancelBtn = document.getElementById("cancel-notification-channel-btn");
    const saveBtn = document.getElementById("save-notification-channel-btn");
    const typeField = document.getElementById("channelType");
    const recipientField = document.getElementById("channelRecipient");
    const modalTitle = modal.querySelector(".upsnap-modal__title");

    let editMode = false;
    let currentChannelId = null;

    const resetForm = () => {
        if (typeField) typeField.value = "email";
        if (recipientField) recipientField.value = "";
        editMode = false;
        currentChannelId = null;
        if (modalTitle) modalTitle.textContent = "Add Notification Channel";
        if (saveBtn) saveBtn.textContent = "Save Channel";
    };

    const showModal = () => modal.classList.remove("hidden");
    const hideModal = () => {
        modal.classList.add("hidden");
        resetForm();
    };

    // Open modal for adding new channel
    openBtn.addEventListener("click", () => {
        resetForm();
        showModal();
    });

    closeBtn?.addEventListener("click", hideModal);
    cancelBtn?.addEventListener("click", hideModal);

    // Function to open modal in edit mode
    function openModalForEdit(channelData) {
        editMode = true;
        currentChannelId = channelData.id;

        if (typeField) typeField.value = channelData.channel_type || "email";
        if (recipientField) recipientField.value = channelData.config?.recipients?.to || "";
        if (modalTitle) modalTitle.textContent = "Edit Notification Channel";
        if (saveBtn) saveBtn.textContent = "Update Channel";

        showModal();
    }

    // Make openModalForEdit available globally for edit buttons
    window.openModalForEdit = openModalForEdit;

    // Save/Update handler
    saveBtn?.addEventListener("click", async () => {
        const type = typeField?.value || "email";
        const recipient = recipientField?.value.trim();

        if (!recipient) {
            showCraftMessage("error", "Please enter recipient email.");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = editMode ? "Updating..." : "Saving...";
        saveBtn.classList.add("disabled");

        try {
            const endpoint = editMode
                ? `/actions/upsnap/monitor-notification-channels/update`
                : `/actions/upsnap/monitor-notification-channels/create`;

            const payload = {
                type,
                label: "Email Alerts",
                config: { recipients: { to: recipient } },
            };

            if (editMode) {
                payload.channelId = currentChannelId;
            }

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": Craft.csrfTokenValue,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data?.message || `Failed to ${editMode ? 'update' : 'add'} notification channel.`);
            }

            showCraftMessage(
                "success",
                data?.message || `Notification channel ${editMode ? 'updated' : 'added'} successfully.`
            );

            hideModal();

            // Reload the channels list
            const tabContainer = document.getElementById("notification-channels-tab");
            if (tabContainer && !tabContainer.classList.contains("hidden")) {
                // Trigger a reload by dispatching a custom event
                const reloadEvent = new CustomEvent("reloadNotificationChannels");
                document.dispatchEvent(reloadEvent);
            }

        } catch (error) {
            const message = error?.message || "Something went wrong.";
            showCraftMessage("error", message);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = editMode ? "Update Channel" : "Save Channel";
            saveBtn.classList.remove("disabled");
        }
    });

    // Listen for reload events
    document.addEventListener("reloadNotificationChannels", () => {
        const tabContainer = document.getElementById("notification-channels-tab");
        if (tabContainer && !tabContainer.classList.contains("hidden")) {
            // Re-trigger the load
            const tableBody = document.getElementById("notification-channels-table-body");
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="3">Loading...</td></tr>`;

                Craft.sendActionRequest("GET", "upsnap/monitor-notification-channels/list")
                    .then((response) => {
                        const { data } = response?.data || {};
                        if (!data || !Array.isArray(data)) {
                            throw new Error("Invalid response format");
                        }
                        renderNotificationChannelsAfterUpdate(data);
                    })
                    .catch((error) => {
                        console.error("Failed to reload notification channels:", error);
                        showCraftMessage("error", "Failed to reload notification channels");
                    });
            }
        }
    });

    function renderNotificationChannelsAfterUpdate(channels) {
        const tableBody = document.getElementById("notification-channels-table-body");
        if (!tableBody) return;

        if (!channels.length) {
            tableBody.innerHTML = `<tr><td colspan="3" class="light">No notification channels found.</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        channels.forEach((channel) => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td class='capitalize'>${channel.channel_type || "N/A"}</td>
                <td>${channel.config?.recipients?.to || "—"}</td>
                <td>
                    <button type="button" class="btn small icon edit edit-channel-btn" data-channel='${JSON.stringify(channel)}' title="Edit Channel">
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Re-attach edit listeners
        const editButtons = tableBody.querySelectorAll(".edit-channel-btn");
        editButtons.forEach(button => {
            button.addEventListener("click", (e) => {
                const channelData = JSON.parse(e.currentTarget.getAttribute("data-channel"));
                openModalForEdit(channelData);
            });
        });
    }
}