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
// Signup/Signin form
// ---------------------------------------------------------------------------
Craft.Upsnap.Signup = {
	init: function () {
		var registerSigninTab = document.getElementById("register-signin-tab");
		if (!registerSigninTab) return; // register/signin tab not present

		var i18n = (window.Upsnap && window.Upsnap.settings && window.Upsnap.settings.signupI18n) || {};

		// Signup elements
		var signupWrapper         = document.getElementById("signup-form-wrapper");
		var fullnameInput         = document.getElementById("signup-fullname");
		var signupEmailInput      = document.getElementById("signup-email");
		var signupPasswordInput   = document.getElementById("signup-password");
		var confirmPasswordInput  = document.getElementById("signup-confirm-password");
		var fullnameError         = document.getElementById("signup-fullname-error");
		var signupEmailError      = document.getElementById("signup-email-error");
		var signupPasswordError   = document.getElementById("signup-password-error");
		var confirmPasswordError  = document.getElementById("signup-confirm-password-error");
		var signupGeneralError    = document.getElementById("signup-general-error");
		var signupSubmitBtn       = document.getElementById("signup-submit-btn");
		var toggleSigninLink      = document.getElementById("toggle-signin-form");

		// Signin elements
		var signinWrapper         = document.getElementById("signin-form-wrapper");
		var signinEmailInput      = document.getElementById("signin-email");
		var signinPasswordInput   = document.getElementById("signin-password");
		var signinEmailError      = document.getElementById("signin-email-error");
		var signinPasswordError   = document.getElementById("signin-password-error");
		var signinGeneralError    = document.getElementById("signin-general-error");
		var signinSubmitBtn       = document.getElementById("signin-submit-btn");
		var toggleSignupLink      = document.getElementById("toggle-signup-form");

		function isValidEmail(val) {
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
		}

		function isValidPassword(val) {
			return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(val);
		}

		function showErr(el, msg) { el.textContent = msg; el.style.display = "block"; }
		function clearErr(el)     { el.textContent = "";  el.style.display = "none";  }

		// Signup validation on blur
		if (fullnameInput) {
			fullnameInput.addEventListener("blur", function () {
				if (!this.value.trim()) {
					showErr(fullnameError, i18n.fullNameRequired || "Full name is required.");
				} else {
					clearErr(fullnameError);
				}
			});
		}

		if (signupEmailInput) {
			signupEmailInput.addEventListener("blur", function () {
				if (this.value && !isValidEmail(this.value)) {
					showErr(signupEmailError, i18n.emailInvalid || "Please enter a valid email address.");
				} else {
					clearErr(signupEmailError);
				}
			});
		}

		if (signupPasswordInput) {
			signupPasswordInput.addEventListener("blur", function () {
				if (this.value && !isValidPassword(this.value)) {
					showErr(signupPasswordError, i18n.passwordWeak || "Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character.");
				} else {
					clearErr(signupPasswordError);
				}
			});
		}

		if (confirmPasswordInput) {
			confirmPasswordInput.addEventListener("blur", function () {
				var password = signupPasswordInput ? signupPasswordInput.value : "";
				if (this.value && this.value !== password) {
					showErr(confirmPasswordError, i18n.passwordMismatch || "Passwords do not match.");
				} else {
					clearErr(confirmPasswordError);
				}
			});
		}

		// Signin validation on blur
		if (signinEmailInput) {
			signinEmailInput.addEventListener("blur", function () {
				if (this.value && !isValidEmail(this.value)) {
					showErr(signinEmailError, i18n.emailInvalid || "Please enter a valid email address.");
				} else {
					clearErr(signinEmailError);
				}
			});
		}

		// Toggle to signin
		if (toggleSigninLink) {
			toggleSigninLink.addEventListener("click", function (e) {
				e.preventDefault();
				signupWrapper.style.display = "none";
				signinWrapper.style.display = "";
			});
		}

		// Toggle to signup
		if (toggleSignupLink) {
			toggleSignupLink.addEventListener("click", function (e) {
				e.preventDefault();
				signinWrapper.style.display = "none";
				signupWrapper.style.display = "";
			});
		}

		// Signin submit
		if (signinSubmitBtn) {
			signinSubmitBtn.addEventListener("click", function () {
				var email     = signinEmailInput ? signinEmailInput.value.trim() : "";
				var password  = signinPasswordInput ? signinPasswordInput.value : "";
				var hasErrors = false;

				clearErr(signinEmailError);
				clearErr(signinPasswordError);
				clearErr(signinGeneralError);

				if (!email) {
					showErr(signinEmailError, i18n.emailRequired || "Email is required.");
					hasErrors = true;
				} else if (!isValidEmail(email)) {
					showErr(signinEmailError, i18n.emailInvalid || "Please enter a valid email address.");
					hasErrors = true;
				}

				if (!password) {
					showErr(signinPasswordError, i18n.passwordRequired || "Password is required.");
					hasErrors = true;
				}

				if (hasErrors) return;

				signinSubmitBtn.disabled    = true;
				signinSubmitBtn.textContent = "Signing in…";

				var formData = new FormData();
				formData.append(Craft.csrfTokenName, Craft.csrfTokenValue);
				formData.append("email",    email);
				formData.append("password", password);

				fetch(Craft.getActionUrl("upsnap/settings/login"), {
					method:  "POST",
					headers: { "Accept": "application/json", "X-Requested-With": "XMLHttpRequest" },
					body:    formData,
				})
					.then(function (r) { return r.json(); })
					.then(function (data) {
						if (data.success) {
							Craft.cp.displayNotice(data.message || "Login successful!");
							
							// Check if user has monitors
							checkMonitorsAndCreateIfNeeded(data.redirectUrl);
						} else {
							var errs = data.errors || {};
							if (errs.email)    showErr(signinEmailError,   Array.isArray(errs.email)    ? errs.email[0]    : errs.email);
							if (errs.password) showErr(signinPasswordError, Array.isArray(errs.password) ? errs.password[0] : errs.password);
							if (errs.general)  showErr(signinGeneralError,  Array.isArray(errs.general)  ? errs.general[0]  : errs.general);
							if (!errs.email && !errs.password && !errs.general) {
								showErr(signinGeneralError, data.message || i18n.loginError || "Login failed. Please check your credentials and try again.");
							}
							signinSubmitBtn.disabled    = false;
							signinSubmitBtn.textContent = i18n.signInLabel || "Sign In";
						}
					})
					.catch(function () {
						showErr(signinGeneralError, i18n.unexpectedError || "An unexpected error occurred. Please try again.");
						signinSubmitBtn.disabled    = false;
						signinSubmitBtn.textContent = i18n.signInLabel || "Sign In";
					});

			// Helper function to check monitors and create if needed
			function checkMonitorsAndCreateIfNeeded(redirectUrl) {
				const actionUrl = Craft.getActionUrl('upsnap/monitors/list');
				
				fetch(actionUrl, {
					headers: { "X-CSRF-Token": Craft.csrfTokenValue },
				})
					.then(function (r) { return r.json(); })
					.then(function (response) {
						// Check if there are no monitors
						const monitors = response.data || [];
						const hasMonitors = Array.isArray(monitors) && monitors.length > 0;
						
						
						if (!hasMonitors) {
							Craft.cp.displayNotice("No monitors found. Creating your first monitor…");
							// No monitors found, create the first one
							createFirstMonitorAndRedirect(redirectUrl);
						} else {
							// User has monitors, redirect directly
							window.location.href = redirectUrl || Craft.getCpUrl('upsnap/settings') + '#monitors-tab';
						}
					})
					.catch(function (err) {
						console.error('Failed to fetch monitors:', err);
						// If we can't check, try to create monitor anyway
						createFirstMonitorAndRedirect(redirectUrl);
					});
			}

			// Helper function to create first monitor and show loading message
			function createFirstMonitorAndRedirect(redirectUrl) {
				// Set flag so monitors table knows to show loading message
				sessionStorage.setItem('upsnap_creating_first_monitor', 'true');
				
				// Navigate to monitors tab first
				window.location.href = redirectUrl || Craft.getCpUrl('upsnap/settings') + '#monitors-tab';
				
				// Create the monitor in background
				setTimeout(function() {
					fetch(Craft.getActionUrl('upsnap/settings/create-first-monitor'), {
						method: 'POST',
						headers: {
							'X-CSRF-Token': Craft.csrfTokenValue,
							'Accept': 'application/json',
						},
						body: JSON.stringify({}),
					})
						.then(function (r) { return r.json(); })
						.then(function (data) {
							if (data.success) {
								// Monitor created successfully, reload the page to show it
								window.location.reload();
							} 
						})
						.catch(function (err) {
							console.error('Failed to create first monitor:', err);
							sessionStorage.removeItem('upsnap_creating_first_monitor');
						});
				}, 100);
			}
			});
		}
	},
};

document.addEventListener("DOMContentLoaded", function () {
	Craft.Upsnap.Signup.init();
});