(() => {
	const ExpiryAlertBanner = {
		payload: null,

		init() {
			this.payload = window.UpsnapExpiryAlert ?? null;
			if (!this.payload) return;
			if (document.getElementById('upsnap-expiry-alert-banner')) return;

			const banner = document.createElement('div');
			banner.id = 'upsnap-expiry-alert-banner';
			banner.className = 'upsnap-expiry-banner';
			banner.setAttribute('role', 'alert');
			banner.innerHTML =
				this.payload.planTier === 'free'
					? this.buildFreeHTML()
					: this.buildAlertsHTML();

			const anchor =
				document.getElementById('header-container') ??
				document.getElementById('main-content');
			if (anchor) {
				anchor.insertAdjacentElement('beforebegin', banner);
			} else {
				const container = document.getElementById('content-container');
				if (container) {
					container.insertAdjacentElement('afterbegin', banner);
				} else {
					document.body.prepend(banner);
				}
			}

			this.wireClose(banner);
		},

		buildFreeHTML() {
			return `<div class="upsnap-expiry-banner__inner upsnap-expiry-banner__inner--upgrade">
				<span class="upsnap-expiry-banner__icon" aria-hidden="true">⚠️</span>
				<span class="upsnap-expiry-banner__msg">
					Upgrade UpSnap to receive SSL &amp; domain expiry alerts before it's too late.
					<a href="${this.esc(this.payload.upgradeUrl)}" target="_blank" rel="noopener noreferrer" class="upsnap-expiry-banner__link">Upgrade now →</a>
				</span>
				<button type="button" class="upsnap-expiry-banner__dismiss" aria-label="Dismiss">×</button>
			</div>`;
		},

		buildAlertsHTML() {
			const count = this.payload.alerts.length;
			const items = this.payload.alerts.map((a) => {
				const label = a.type === 'ssl' ? 'SSL' : 'Domain';
				const url = a.dashboard_url ?? this.payload.dashboardUrl;
				return `<a href="${this.esc(url)}" target="_blank" rel="noopener noreferrer" class="upsnap-expiry-banner__alert-link">${this.esc(a.monitor_name)} ${label} expires in ${a.days_remaining} day${a.days_remaining === 1 ? '' : 's'}</a>`;
			}).join(', ');

			return `<div class="upsnap-expiry-banner__inner">
				<span class="upsnap-expiry-banner__icon" aria-hidden="true">⚠️</span>
				<span class="upsnap-expiry-banner__msg">
					<strong>UpSnap Alert:</strong> ${count} site${count === 1 ? '' : 's'} need${count === 1 ? 's' : ''} attention - ${items}.
					<a href="${this.esc(this.payload.dashboardUrl)}" target="_blank" rel="noopener noreferrer" class="upsnap-expiry-banner__link">View in UpSnap →</a>
				</span>
				<button type="button" class="upsnap-expiry-banner__dismiss" aria-label="Dismiss">×</button>
			</div>`;
		},

		wireClose(banner) {
			const btn = banner.querySelector('.upsnap-expiry-banner__dismiss');
			if (btn) btn.addEventListener('click', () => this.dismiss(banner));
		},

		dismiss(banner) {
			banner.remove();
			this.postDismiss();
		},

		postDismiss() {
			const csrfToken =
				(window.Craft?.csrfTokenValue) ??
				document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ??
				'';

			const body = new URLSearchParams();
			body.set('hash', this.payload.hash);
			body.set(window.Craft?.csrfTokenName ?? 'CRAFT_CSRF_TOKEN', csrfToken);

			fetch(Craft.getActionUrl('upsnap/alerts/dismiss'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Accept': 'application/json',
					'X-Requested-With': 'XMLHttpRequest',
				},
				body: body.toString(),
			}).catch(() => {});
		},

		esc(str) {
			return String(str ?? '')
				.replace(/&/g, '&amp;')
				.replace(/"/g, '&quot;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;');
		},
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => ExpiryAlertBanner.init());
	} else {
		ExpiryAlertBanner.init();
	}
})();
