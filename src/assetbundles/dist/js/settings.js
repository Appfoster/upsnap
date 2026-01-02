// Initialize Upsnap namespace on Craft object
if (typeof Craft.Upsnap === "undefined") {
	Craft.Upsnap = {};
}

// Settings page specific functionality
Craft.Upsnap.Settings = {
	// DOM elements
	elements: {},

	emailTags: [],

	// Healthcheck toggles configuration
	healthchecks: [
		{ id: "brokenLinksEnabled", settingsId: "brokenLinks-settings" },
		{ id: "mixedContentEnabled", settingsId: "mixedContent-settings" },
		{ id: "lighthouseEnabled", settingsId: "lighthouse-settings" },
		{ id: "reachabilityEnabled", settingsId: "reachability-settings" },
		{ id: "sslEnabled", settingsId: "ssl-settings" },
		{ id: "domainEnabled", settingsId: "domain-settings" },
	],

	// Email validation
	isValidEmail: function (email) {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	},

	// Update hidden field with email array
	updateHiddenField: function () {
		if (this.elements.emailHidden) {
			this.elements.emailHidden.value = JSON.stringify(this.emailTags);
			this.elements.emailHidden.dispatchEvent(new Event("input"));
		}
	},

	// Check if API key is provided
	hasApiKey: function () {
		return (
			this.elements.apiKeyField &&
			this.elements.apiKeyField.value.trim() !== ""
		);
	},

	// Handle lightswitch toggle
	handleMonitoringToggle: function (event) {
		// Toggle advanced settings
		this.toggleAdvancedSettings();
	},

	// Toggle advanced settings based on enabled lightswitch
	toggleAdvancedSettings: function () {
		if (!this.elements.enabledField || !this.elements.advancedSettings)
			return;

		const isEnabled =
			this.elements.enabledField.getAttribute("aria-checked") === "true";

		if (isEnabled) {
			this.elements.advancedSettings.style.display = "block";
		} else {
			this.elements.advancedSettings.style.display = "none";
		}
	},

	// Toggle healthcheck specific settings
	toggleHealthcheckSettings: function (lightswitchId, settingsId) {
		const lightswitch = document.getElementById(lightswitchId);
		const settings = document.getElementById(settingsId);

		if (!lightswitch || !settings) return;

		const isEnabled = lightswitch.getAttribute("aria-checked") === "true";

		// Store original display type the first time we toggle
		if (!settings.dataset.originalDisplay) {
			const currentDisplay = window.getComputedStyle(settings).display;
			settings.dataset.originalDisplay =
				currentDisplay !== "none" ? currentDisplay : "flex";
		}

		settings.style.display = isEnabled
			? settings.dataset.originalDisplay
			: "none";
	},

	// Form validation
	validateForm: function (event) {
		return true;
	},

	// Initialize the settings page
	init: function () {
		// Get DOM elements
		this.elements = {
			apiKeyField: document.getElementById("apiKey"),
			enabledField: document.getElementById("enabled"),
			advancedSettings: document.getElementById("advanced-settings"),
			settingsForm: document.getElementById("settings-form"),
		};

		// Initialize email tags from hidden field
		if (this.elements.emailHidden && this.elements.emailHidden.value) {
			try {
				this.emailTags = JSON.parse(this.elements.emailHidden.value);
			} catch (e) {
				this.emailTags = [];
			}
		}

		// Initial check on page load
		if (this.elements.enabledField && this.elements.advancedSettings) {
			this.toggleAdvancedSettings();
		}

		// Event listeners for main monitoring toggle
		if (this.elements.enabledField) {
			this.elements.enabledField.addEventListener(
				"click",
				this.handleMonitoringToggle.bind(this)
			);
		}

		// Initialize healthcheck toggles
		this.healthchecks.forEach(
			function (healthcheck) {
				const lightswitch = document.getElementById(healthcheck.id);

				if (lightswitch) {
					// Initial state
					this.toggleHealthcheckSettings(
						healthcheck.id,
						healthcheck.settingsId
					);

					// Add event listener
					lightswitch.addEventListener(
						"click",
						function () {
							// Use setTimeout to allow the lightswitch to update its state first
							setTimeout(
								function () {
									this.toggleHealthcheckSettings(
										healthcheck.id,
										healthcheck.settingsId
									);
								}.bind(this),
								10
							);
						}.bind(this)
					);
				}
			}.bind(this)
		);

		// Form submit validation
		if (this.elements.settingsForm) {
			this.elements.settingsForm.addEventListener(
				"submit",
				this.validateForm.bind(this)
			);
		}
		// Add Craft-native form state tracking
		if (this.elements.settingsForm) {
			const form = this.elements.settingsForm;
			const saveBtn = document.getElementById("save-button");

			const initialData = new FormData(form);
			const original = Object.fromEntries(initialData.entries());

			// Disable save button by default
			saveBtn.disabled = true;
			saveBtn.classList.add("disabled");

			const isDirty = () => {
				const current = Object.fromEntries(
					new FormData(form).entries()
				);
				return Object.keys(current).some(
					(key) => current[key] !== original[key]
				);
			};

			const toggleSaveButton = () => {
				const dirty = isDirty();
				if (dirty) {
					saveBtn.disabled = false;
					saveBtn.classList.remove("disabled");
				} else {
					saveBtn.disabled = true;
					saveBtn.classList.add("disabled");
				}
			};

			// Listen for any input/change in the form
			form.querySelectorAll("input, select, textarea").forEach((el) => {
				el.addEventListener("input", toggleSaveButton);
				el.addEventListener("change", toggleSaveButton);
			});

			// Add Craft lightswitch listeners
			form.querySelectorAll(".lightswitch").forEach((ls) => {
				ls.addEventListener("click", () => {
					setTimeout(() => {
						toggleSaveButton();
					}, 50);
				});
			});

			// Optional: disable after submit
			form.addEventListener("submit", () => {
				saveBtn.disabled = true;
				saveBtn.classList.add("disabled");
			});
		}

		// -------------------------------
		// Tab-based form action switching
		// -------------------------------
		// Intercept form submission for Healthcheck tab
		const form = this.elements.settingsForm;
		if(form) {
			form.addEventListener("submit", function (e) {
				const activeTab = document.querySelector(
					".tab-content:not(.hidden)"
				);
				if (!activeTab || activeTab.id !== "healthchecks-tab") {
					return; // Normal submit for other tabs
				}
	
				e.preventDefault(); // Stop full page reload
	
				const url = Craft.getActionUrl("upsnap/monitors/update");
				const formData = new FormData(form);
	
				// Optional: show spinner or disable save button
				const saveBtn = document.getElementById("save-button");
				saveBtn.disabled = true;
				saveBtn.classList.add("disabled");
	
				fetch(url, {
					method: "POST",
					headers: {
						"X-CSRF-Token": Craft.csrfTokenValue,
					},
					body: formData,
				})
					.then((response) => response.json())
					.then((data) => {
						if (data.success) {
							Craft.cp.displayNotice(
								data.message || "Monitor updated successfully."
							);
						} else {
							Craft.cp.displayError(
								data.message || "Failed to update monitor."
							);
						}
					})
					.catch((err) => {
						console.error("Healthcheck update failed:", err);
						Craft.cp.displayError("An unexpected error occurred.");
					})
					.finally(() => {
						saveBtn.disabled = false;
						saveBtn.classList.remove("disabled");
					});
			});
		}

	},
};

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
	Craft.Upsnap.Settings.init();
});