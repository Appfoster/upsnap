// Global JavaScript functionality used across multiple pages

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
    if (window.CraftPageData && window.CraftPageData.title && window.CraftPageData.monitorUrl) {
        const { title, monitorUrl } = window.CraftPageData;
        const heading = document.querySelector('#page-title h1, #page-heading');
        if (heading) {
            // Clean the display URL (remove protocol, www, and path)
            const displayUrl = monitorUrl
                .replace(/^https?:\/\//, '')
                .replace(/^www\./, '')
                .split('/')[0];

            // Update the page title dynamically
            heading.innerHTML = `
                ${title}
                <a href="${monitorUrl}" target="_blank" rel="noopener" class="monitor-url">
                    (${displayUrl})
                </a>
            `;
        }
    }
});