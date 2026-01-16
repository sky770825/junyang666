// 客戶見證模組 - 從模組化.html提取
// 包含客戶見證輪播相關功能

// 客戶見證輪播
function initTestimonialCarousel() {
    let currentTestimonialIndex = 0;
    const testimonialSlides = document.getElementById('testimonialSlides');
    const testimonialPrev = document.getElementById('testimonialPrev');
    const testimonialNext = document.getElementById('testimonialNext');
    const totalTestimonials = document.querySelectorAll('.testimonial-slide').length;

    function updateTestimonialCarousel() {
        if (testimonialSlides) {
            testimonialSlides.style.transform = `translateX(-${currentTestimonialIndex * 100}%)`;
        }
    }

    if (testimonialPrev) {
        testimonialPrev.addEventListener('click', () => {
            currentTestimonialIndex = currentTestimonialIndex > 0 ? currentTestimonialIndex - 1 : totalTestimonials - 1;
            updateTestimonialCarousel();
        });
    }

    if (testimonialNext) {
        testimonialNext.addEventListener('click', () => {
            currentTestimonialIndex = currentTestimonialIndex < totalTestimonials - 1 ? currentTestimonialIndex + 1 : 0;
            updateTestimonialCarousel();
        });
    }

    // 自動播放客戶見證
    setInterval(() => {
        if (totalTestimonials > 1) {
            currentTestimonialIndex = currentTestimonialIndex < totalTestimonials - 1 ? currentTestimonialIndex + 1 : 0;
            updateTestimonialCarousel();
        }
    }, 5000);
}
