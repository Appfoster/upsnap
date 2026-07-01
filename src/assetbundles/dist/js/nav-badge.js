(function () {
	var INTERVAL = Math.max(30, (window.UpsnapNavBadge && window.UpsnapNavBadge.interval) || 60) * 1000;
	var ENDPOINT = Craft.getActionUrl('upsnap/nav-badge/status');

	function getNavLabel() {
		return document.querySelector('#nav-upsnap .label');
	}

	function updateBadge(down, free) {
		var label = getNavLabel();
		if (!label) return;

		var badge = document.getElementById('upsnap-nav-badge');

		if (free) {
			if (!badge) {
				badge = document.createElement('span');
				badge.id = 'upsnap-nav-badge';
				badge.className = 'upsnap-nav-badge upsnap-nav-badge--free';
				badge.title = 'Upgrade to Pro for live CP alerts';
				badge.setAttribute('aria-label', 'Upgrade to Pro for live CP alerts');
				badge.textContent = '★';
				label.appendChild(badge);
			}
			return;
		}

		if (down > 0) {
			if (!badge) {
				badge = document.createElement('span');
				badge.id = 'upsnap-nav-badge';
				badge.className = 'upsnap-nav-badge';
				label.appendChild(badge);
			}
			badge.className = 'upsnap-nav-badge';
			badge.textContent = down;
			var badgeLabel = down + ' monitor' + (down === 1 ? '' : 's') + ' down';
			badge.setAttribute('aria-label', badgeLabel);
			badge.title = badgeLabel + '\nclick to view';
		} else {
			if (badge) badge.remove();
		}
	}

	function poll() {
		fetch(ENDPOINT, {
			headers: {
				'X-Requested-With': 'XMLHttpRequest',
				'Accept': 'application/json',
			},
			credentials: 'same-origin',
		})
			.then(function (r) {
				return r.ok ? r.json() : null;
			})
			.then(function (data) {
				if (!data) return;
				updateBadge(data.down || 0, data.free || false);
			})
			.catch(function () {});
	}

	function init() {
		poll();
		setInterval(poll, INTERVAL);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
