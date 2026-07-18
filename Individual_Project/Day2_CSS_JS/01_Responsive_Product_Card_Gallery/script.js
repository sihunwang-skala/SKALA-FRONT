// 다크모드 전환
const themeButton = document.querySelector('#themeButton');

if (themeButton) {
    themeButton.addEventListener('click', function() {
        document.body.classList.toggle('dark');

        const darkMode = document.body.classList.contains('dark');

        themeButton.textContent = darkMode ? '☀️ 라이트' : '🌙 다크';
        themeButton.setAttribute('aria-pressed', String(darkMode));
        themeButton.setAttribute(
            'aria-label',
            darkMode ? '라이트모드로 전환' : '다크모드로 전환'
        );
    });
}

// 상품 설명의 기술 용어를 누르면 아래 용어집으로 이동한다.
const termLinks = document.querySelectorAll('.term-trigger');

termLinks.forEach(function(link) {
    link.addEventListener('click', function(event) {
        const selector = link.getAttribute('href');

        if (!selector || !selector.startsWith('#')) {
            return;
        }

        const termCard = document.querySelector(selector);

        if (!termCard) {
            return;
        }

        event.preventDefault();

        const reduceMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)'
        ).matches;

        termCard.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'center'
        });

        // 같은 링크를 다시 눌러도 강조 효과가 다시 실행되게 한다.
        termCard.classList.remove('term-highlight');
        void termCard.offsetWidth;
        termCard.classList.add('term-highlight');

        history.replaceState(null, '', selector);

        window.setTimeout(function() {
            termCard.classList.remove('term-highlight');
        }, 1200);
    });
});
