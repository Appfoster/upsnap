/**
 * Signup Inline Progress Component
 * Displays signup steps inline in the form, below the submit button
 */
(() => {
	if (!window.Craft) {
		console.error('Craft global missing.');
		return;
	}

	const SignupProgress = {
		isRunning: false,
		steps: [
			{ id: 'account_created', label: 'Account Created' },
			{ id: 'api_keys_fetched', label: 'API Keys Fetched' },
			{ id: 'monitor_created', label: 'First Monitor Created' },
		],
		sessionToken: null,
		formData: {},

		/**
		 * Initialize the progress component
		 */
		init() {
			this.createProgressHTML();
			this.wireStartButton();
		},

		/**
		 * Create the progress HTML structure and insert it after the submit button
		 */
		createProgressHTML() {
			if (document.getElementById('upsnap-inline-progress-container')) {
				return; // Already exists
			}

			const container = document.createElement('div');
			container.id = 'upsnap-inline-progress-container';
			container.className = 'upsnap-progress-hidden';
			container.innerHTML = `
				<div class="upsnap-inline-progress">
					<div class="upsnap-progress-steps">
						<div class="upsnap-progress-step pending" data-step="account_created">
							<div class="upsnap-progress-step-icon">●</div>
							<div class="upsnap-progress-step-label">Account Created</div>
						</div>
						<div class="upsnap-progress-step-divider"></div>
						<div class="upsnap-progress-step pending" data-step="api_keys_fetched">
							<div class="upsnap-progress-step-icon">●</div>
							<div class="upsnap-progress-step-label">API Keys Fetched</div>
						</div>
						<div class="upsnap-progress-step-divider"></div>
						<div class="upsnap-progress-step pending" data-step="monitor_created">
							<div class="upsnap-progress-step-icon">●</div>
							<div class="upsnap-progress-step-label">First Monitor Created</div>
						</div>
					</div>
					<div class="upsnap-progress-message">
						<div class="upsnap-spinner">
							<span></span>
						</div>
						<span id="upsnap-progress-text">Processing your account...</span>
					</div>
				</div>
			`;

			// Insert after the submit button
			const submitBtn = document.getElementById('signup-submit-btn');
			if (submitBtn && submitBtn.parentNode) {
				submitBtn.parentNode.insertBefore(container, submitBtn.nextSibling);
			}
		},

		/**
		 * Wire the "Start Monitoring" button
		 */
		wireStartButton() {
			const startBtn = document.getElementById('signup-submit-btn');
			if (!startBtn) return;

			startBtn.addEventListener('click', (e) => {
				e.preventDefault();

				if (this.isRunning) {
					return; // Already running
				}

				// Get form data
				this.formData = this.getFormData();
				if (!this.formData) {
					this.showInlineError('Please fill out all required fields correctly.');
					return;
				}

				// Disable button and show progress
				startBtn.disabled = true;
				this.showProgress();

				// Start the flow
				this.executeStep1();
			});
		},

		/**
		 * Get form data from signup form
		 */
		getFormData() {
			const fullname = document.getElementById('signup-fullname')?.value?.trim();
			const email = document.getElementById('signup-email')?.value?.trim();
			const password = document.getElementById('signup-password')?.value;
			const confirmPassword = document.getElementById('signup-confirm-password')?.value;

			if (!fullname || !email || !password || !confirmPassword) {
				return null;
			}

			if (password !== confirmPassword) {
				return null;
			}

			return { fullname, email, password, confirm_password: confirmPassword };
		},

		/**
		 * Show the progress container
		 */
		showProgress() {
			const container = document.getElementById('upsnap-inline-progress-container');
			if (container) {
				container.classList.remove('upsnap-progress-hidden');
				container.classList.add('upsnap-progress-visible');
			}
			this.resetSteps();
			this.isRunning = true;
		},

		/**
		 * Hide the progress container
		 */
		hideProgress() {
			const container = document.getElementById('upsnap-inline-progress-container');
			if (container) {
				container.classList.remove('upsnap-progress-visible');
				container.classList.add('upsnap-progress-hidden');
			}
			this.isRunning = false;
		},

		/**
		 * Execute Step 1: Create Account
		 */
		async executeStep1() {
			this.updateStepStatus('account_created', 'in-progress');
			this.updateMessage('Creating your account...');

			try {
				const csrfToken = Craft.csrfTokenValue;
				const response = await fetch(Craft.getActionUrl('upsnap/settings/register'), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-Token': csrfToken,
					},
					body: JSON.stringify(this.formData),
				});

				const json = await response.json();

				if (json.status === 'success' && json.data?.session_token) {
					this.sessionToken = json.data.session_token;
					this.updateStepStatus('account_created', 'completed');
					this.updateMessage('✓ Account created successfully!');

					// Delay before moving to next step
					await this.delay(1000);
					await this.executeStep2();
				} else {
					throw new Error(json.message || 'Account creation failed');
				}
			} catch (err) {
				console.error('Step 1 Error:', err);
				this.updateStepStatus('account_created', 'error');
				this.showInlineError('Step 1 failed: ' + err.message);
				this.resetButton();
			}
		},

		/**
		 * Execute Step 2: Fetch API Token
		 */
		async executeStep2() {
			this.updateStepStatus('api_keys_fetched', 'in-progress');
			this.updateMessage('Generating API keys...');

			try {
				const csrfToken = Craft.csrfTokenValue;

				const response = await fetch(Craft.getActionUrl('upsnap/settings/create-api-token'), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-Token': csrfToken,
					},
					body: JSON.stringify({ session_token: this.sessionToken }),
				});

				const json = await response.json();

				if (json.status === 'success') {
					this.updateStepStatus('api_keys_fetched', 'completed');
					this.updateMessage('✓ API keys generated successfully!');

					// Delay before moving to next step
					await this.delay(1000);
					await this.executeStep3();
				} else {
					throw new Error(json.message || 'API token fetch failed');
				}
			} catch (err) {
				console.error('Step 2 Error:', err);
				this.updateStepStatus('api_keys_fetched', 'error');
				this.showInlineError('Step 2 failed: ' + err.message);
				this.resetButton();
			}
		},

		/**
		 * Execute Step 3: Create First Monitor
		 */
		async executeStep3() {
			this.updateStepStatus('monitor_created', 'in-progress');
			this.updateMessage('Creating your first monitor...');

			try {
				const csrfToken = Craft.csrfTokenValue;

				const response = await fetch(Craft.getActionUrl('upsnap/settings/create-first-monitor'), {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-CSRF-Token': csrfToken,
					},
					body: JSON.stringify({}),
				});

				const json = await response.json();

				if (json.status === 'success') {
					this.updateStepStatus('monitor_created', 'completed');
					this.updateMessage('✓ First monitor created successfully!');
				} else {
					// Monitor creation is optional, don't fail complete flow
					this.updateStepStatus('monitor_created', 'completed');
					this.updateMessage('✓ Setup complete! Monitor creation is optional.');
				}

				// Complete the flow
				await this.delay(1500);
				this.showCompletion();
			} catch (err) {
				console.error('Step 3 Error:', err);
				// Monitor creation is optional
				this.updateStepStatus('monitor_created', 'completed');
				this.updateMessage('✓ Setup complete! Monitor creation is optional.');
				await this.delay(1500);
				this.showCompletion();
			}
		},

		/**
		 * Update step status
		 */
		updateStepStatus(stepId, status) {
			const stepEl = document.querySelector(`.upsnap-progress-step[data-step="${stepId}"]`);
			if (!stepEl) return;

			stepEl.classList.remove('pending', 'in-progress', 'completed', 'error');
			stepEl.classList.add(status);

			const icon = stepEl.querySelector('.upsnap-progress-step-icon');
			if (status === 'completed') {
				icon.textContent = '✓';
			} else if (status === 'error') {
				icon.textContent = '✕';
			} else if (status === 'in-progress') {
				icon.textContent = '⟳';
			}
		},

		/**
		 * Update progress message
		 */
		updateMessage(message) {
			const textEl = document.getElementById('upsnap-progress-text');
			if (textEl) {
				textEl.textContent = message;
			}
		},

		/**
		 * Show inline error message
		 */
		showInlineError(message) {
			this.updateMessage('✕ ' + message);
			const textEl = document.getElementById('upsnap-progress-text');
			if (textEl) {
				textEl.style.color = '#d32f2f';
			}

			// Hide spinner
			const spinner = document.querySelector('.upsnap-spinner');
			if (spinner) {
				spinner.style.display = 'none';
			}
		},

		/**
		 * Show completion message
		 */
		showCompletion() {
			// Hide spinner
			const spinner = document.querySelector('.upsnap-spinner');
			if (spinner) {
				spinner.style.display = 'none';
			}

			this.updateMessage('🎉 Your account is ready! Redirecting to monitors listing...');
			const textEl = document.getElementById('upsnap-progress-text');
			if (textEl) {
				textEl.style.color = '#4caf50';
			}

			// Auto-redirect after 2 seconds
			setTimeout(() => {
				const redirectUrl = Craft.getCpUrl('upsnap/settings') + '&signup=completed';
				window.location.href = redirectUrl;
			}, 2000);
		},

		/**
		 * Reset button state
		 */
		resetButton() {
			const startBtn = document.getElementById('signup-submit-btn');
			if (startBtn) {
				startBtn.disabled = false;
			}
			this.isRunning = false;
		},

		/**
		 * Reset steps to pending state
		 */
		resetSteps() {
			this.steps.forEach((step) => {
				this.updateStepStatus(step.id, 'pending');
			});
		},

		/**
		 * Delay helper
		 */
		delay(ms) {
			return new Promise((resolve) => setTimeout(resolve, ms));
		},
	};

	// Expose to window for template initialization
	window.UpsnapSignupProgress = SignupProgress;
})();
