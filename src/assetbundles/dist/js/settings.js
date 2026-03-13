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

// ---------------------------------------------------------------------------
// Signup form
// ---------------------------------------------------------------------------
Craft.Upsnap.Signup = {
	init: function () {
		var signupWrapper = document.getElementById("signup-form-wrapper");
		if (!signupWrapper) return; // signup form not present on this page load

		var i18n = (window.Upsnap && window.Upsnap.settings && window.Upsnap.settings.signupI18n) || {};

		var emailInput         = document.getElementById("signup-email");
		var passwordInput      = document.getElementById("signup-password");
		var emailError         = document.getElementById("signup-email-error");
		var passwordError      = document.getElementById("signup-password-error");
		var generalError       = document.getElementById("signup-general-error");
		var submitBtn          = document.getElementById("signup-submit-btn");
		var toggleLink         = document.getElementById("toggle-api-key-form");
		var toggleRegisterLink = document.getElementById("toggle-register-form");
		var existingWrapper    = document.getElementById("existing-api-key-wrapper");
		var saveButton         = document.getElementById("save-button");

		function isValidEmail(val) {
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
		}

		function isValidPassword(val) {
			return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(val);
		}

		function showErr(el, msg) { el.textContent = msg; el.style.display = "block"; }
		function clearErr(el)     { el.textContent = "";  el.style.display = "none";  }

		// Real-time validation on blur
		emailInput.addEventListener("blur", function () {
			if (this.value && !isValidEmail(this.value)) {
				showErr(emailError, i18n.emailInvalid || "Please enter a valid email address.");
			} else {
				clearErr(emailError);
			}
		});

		passwordInput.addEventListener("blur", function () {
			if (this.value && !isValidPassword(this.value)) {
				showErr(passwordError, i18n.passwordWeak || "Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character.");
			} else {
				clearErr(passwordError);
			}
		});

		// "Already have an account?" toggle
		if (toggleLink) {
			toggleLink.addEventListener("click", function (e) {
				e.preventDefault();
				signupWrapper.style.display   = "none";
				existingWrapper.style.display = "";
				if (saveButton) saveButton.style.display = "";
			});
		}

		// "Don't have an API key? Register" back-toggle
		if (toggleRegisterLink) {
			toggleRegisterLink.addEventListener("click", function (e) {
				e.preventDefault();
				existingWrapper.style.display = "none";
				signupWrapper.style.display   = "";
				if (saveButton) saveButton.style.display = "none";
			});
		}

		// Signup submit
		submitBtn.addEventListener("click", function () {
			var email     = emailInput.value.trim();
			var password  = passwordInput.value;
			var hasErrors = false;

			clearErr(emailError);
			clearErr(passwordError);
			clearErr(generalError);

			if (!email) {
				showErr(emailError, i18n.emailRequired || "Email is required.");
				hasErrors = true;
			} else if (!isValidEmail(email)) {
				showErr(emailError, i18n.emailInvalid || "Please enter a valid email address.");
				hasErrors = true;
			}

			if (!password) {
				showErr(passwordError, i18n.passwordRequired || "Password is required.");
				hasErrors = true;
			} else if (!isValidPassword(password)) {
				showErr(passwordError, i18n.passwordWeak || "Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character.");
				hasErrors = true;
			}

			if (hasErrors) return;

			submitBtn.disabled    = true;
			submitBtn.textContent = i18n.creatingAccount || "Creating account\u2026";

			var formData = new FormData();
			formData.append(Craft.csrfTokenName, Craft.csrfTokenValue);
			formData.append("email",    email);
			formData.append("password", password);

			fetch(Craft.getActionUrl("upsnap/settings/signup"), {
				method:  "POST",
				headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
				body:    formData,
			})
				.then(function (r) { return r.json(); })
				.then(function (data) {
					if (data.success) {
						var notice = document.createElement("div");
						notice.style.cssText = "background:#e6f4ea;color:#1e7e34;padding:12px 16px;border-radius:4px;margin-bottom:16px;";
						notice.textContent   = data.message || i18n.successMessage || "Account created successfully! Monitoring has started.";
						signupWrapper.insertBefore(notice, signupWrapper.firstChild);
						submitBtn.textContent = i18n.accountCreated || "Account created!";
						setTimeout(function () { window.location.href = data.redirectUrl; }, 1500);
					} else {
						var errs = data.errors || {};
						if (errs.email)    showErr(emailError,    Array.isArray(errs.email)    ? errs.email[0]    : errs.email);
						if (errs.password) showErr(passwordError, Array.isArray(errs.password) ? errs.password[0] : errs.password);
						if (errs.general)  showErr(generalError,  Array.isArray(errs.general)  ? errs.general[0]  : errs.general);
						if (!errs.email && !errs.password && !errs.general) {
							showErr(generalError, data.message || i18n.genericError || "An error occurred. Please try again.");
						}
						submitBtn.disabled    = false;
						submitBtn.textContent = i18n.submitLabel || "Start beta free trial";
					}
				})
				.catch(function () {
					showErr(generalError, i18n.unexpectedError || "An unexpected error occurred. Please try again.");
					submitBtn.disabled    = false;
					submitBtn.textContent = i18n.submitLabel || "Start beta free trial";
				});
		});
	},
};

document.addEventListener("DOMContentLoaded", function () {
	Craft.Upsnap.Signup.init();
});