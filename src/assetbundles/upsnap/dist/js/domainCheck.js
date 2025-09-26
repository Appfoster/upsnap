// Domain Check page JavaScript
document.addEventListener("DOMContentLoaded", function () {
    const refreshBtn = document.getElementById("refresh-btn");

    refreshBtn.addEventListener("click", function () {
        window.location.reload(); // reloads the current page
    });

    // Include show-details functionality if needed
    const moreDetails = document.getElementById('more-details');
    const showDetailsBtn = document.querySelector('.show-details');
    const showLessBtn = document.querySelector('.show-less');

    if (showDetailsBtn && showLessBtn && moreDetails) {
        showDetailsBtn.addEventListener('click', function (e) {
            e.preventDefault();
            moreDetails.style.display = 'block';
            showDetailsBtn.style.display = 'none';
            showLessBtn.style.display = 'inline-block';
        });

        showLessBtn.addEventListener('click', function (e) {
            e.preventDefault();
            moreDetails.style.display = 'none';
            showDetailsBtn.style.display = 'inline-block';
            showLessBtn.style.display = 'none';
        });
    }
});