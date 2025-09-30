// Global JavaScript functionality used across multiple pages

document.addEventListener("DOMContentLoaded", function () {
    // Global refresh button functionality
    const refreshBtn = document.getElementById("refresh-btn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", function () {
            window.location.reload(); // reloads the current page
        });
    }

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
});