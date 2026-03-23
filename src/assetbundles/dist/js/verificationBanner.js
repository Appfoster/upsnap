/**
 * Email Verification Banner Component
 * Shows after successful signup to alert users about email verification requirement
 */
(() => {
	if (!window.Craft) {
		console.error('Craft global missing.');
		return;
	}

	const VerificationBanner = {
		/**
		 * Initialize the banner component
		 */
		init() {
			this.createBannerHTML();
			this.checkRedirectFromSignup();
		},

		/**
		 * Create the verification banner HTML
		 */
		createBannerHTML() {
			if (document.getElementById('upsnap-verification-banner')) {
				return; // Already exists
			}

			const banner = document.createElement('div');
			banner.id = 'upsnap-verification-banner';
			banner.className = 'upsnap-verification-overlay hidden';
			banner.innerHTML = `
				<div class="upsnap-verification-content">
					<div class="upsnap-verification-icon">
						📧
					</div>
					<h1>Verify Your Email</h1>
					<p class="upsnap-verification-message">
                        Account created. You have 3 days to verify your email.
						<strong>Please check your inbox for the verification link.</strong>
					</p>
					<div class="upsnap-verification-instructions">
						<ol>
							<li class="upsnap-verification-message">Check your email inbox for a verification link</li>
							<li class="upsnap-verification-message">Click the link to verify your account</li>
						</ol>
					</div>
					<div class="upsnap-verification-actions">
						<button id="upsnap-verification-close-btn" class="btn submit primary">
							Continue to Monitors
						</button>
					</div>
					<div class="upsnap-verification-note">
						<strong>Note:</strong> Your account will be blocked after 3 days if the email is not verified.
					</div>
				</div>
			`;

			document.body.appendChild(banner);
			this.wireCloseButton();
		},

		/**
		 * Wire the close button
		 */
		wireCloseButton() {
			const closeBtn = document.getElementById('upsnap-verification-close-btn');
			if (!closeBtn) return;

			closeBtn.addEventListener('click', (e) => {
				e.preventDefault();
				this.close();
			});
		},

		/**
		 * Show the verification banner
		 */
		show() {
			const banner = document.getElementById('upsnap-verification-banner');
			if (banner) {
				banner.classList.remove('hidden');
			} else {
				console.error('Banner element NOT found!');
			}
		},

		/**
		 * Hide the verification banner
		 */
		close() {
			const banner = document.getElementById('upsnap-verification-banner');
			if (banner) {
				banner.classList.add('hidden');
			}

			// Redirect to monitors tab
			window.location.href = Craft.getCpUrl('upsnap/settings') + '#monitors-tab';
		},

		/**
		 * Check if we're redirecting from signup completion
		 */
		checkRedirectFromSignup() {
			const params = new URLSearchParams(window.location.search);
			const signupParam = params.get('signup');
			
			if (signupParam === 'completed') {
				this.show();

				// Clean up URL
				window.history.replaceState({}, document.title, window.location.pathname);
			} else {
				console.error('Not a signup completion redirect');
			}
		},
	};

	// Expose to window for template initialization
	window.UpsnapVerificationBanner = VerificationBanner;
})();
