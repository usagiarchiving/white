/**
 * 파일명: script.js
 * ==========================================================================
 * [규칙 4] 부드러운 전환 효과 중심의 자바스크립트 아키텍처
 * ==========================================================================
 */

$(document).ready(function () {
    // 마스터 주머니를 읽어서 메뉴판 동적 인쇄
    if (typeof CATEGORIES !== 'undefined') {
        const menuContainer = $('#dropdown-menu');
        menuContainer.empty(); 
        
        CATEGORIES.forEach(cat => {
            if (cat.active) {
                menuContainer.append(`<a href="#" onclick="loadPage('${cat.path}'); return false;">${cat.name}</a>`);
            }
        });
    }

    $(".dropdown-bars").click(function (e) {
        e.stopPropagation();
        $(".dropdown-inner").slideToggle(250); 
        let icon = $("#menu-icon");
        icon.toggleClass("xi-bars xi-close");
    });
    
    $(".dropdown-inner a, body").click(function() {
        $(".dropdown-inner").slideUp(200);
        $("#menu-icon").removeClass("xi-close").addClass("xi-bars");
    });
    $('.dropdown-inner').click(function(e) { e.stopPropagation(); });

    // 첫 페이지 로드 (Home)
    loadPage('category/home.html');
});

// 페이지를 불러오는 핵심 엔진
function loadPage(url) {
    const contentArea = $('#content-area');
    
    // [추가] 홈 화면이면 '꽉 찬 하트', 아니면 '빈 하트'로 아이콘 변경
    if (url === 'category/home.html') {
        $('#home-icon').removeClass('xi-heart-o').addClass('xi-heart');
    } else {
        $('#home-icon').removeClass('xi-heart').addClass('xi-heart-o');
    }

    contentArea.fadeOut(200, function() {
        $.ajax({
            url: url,
            dataType: 'html',
            cache: false, 
            success: function(data) {
                contentArea.html(data).addClass('fade-in-element').show();
                setTimeout(() => { contentArea.removeClass('fade-in-element'); }, 500);
            },
            error: function() {
                contentArea.html('<p style="text-align:center; padding-top:50px; color:var(--sub-color);">내용을 불러오지 못했습니다.</p>').show();
            }
        });
    });
}

// [수정] 테마 변경 시 해(xi-sun)와 달(xi-moon)로 아이콘 교체
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.className = themeName;
    
    if(themeName === 'theme-dark') {
        $('#theme-icon').removeClass('xi-sun').addClass('xi-moon');
    } else {
        $('#theme-icon').removeClass('xi-moon').addClass('xi-sun');
    }
}

// 테마 토글 버튼 클릭 시
function toggleTheme() {
    if (localStorage.getItem('theme') === 'theme-dark') {
        setTheme('theme-light');
    } else {
        setTheme('theme-dark');
    }
}

// 사이트 첫 진입 시 기억해둔 테마 복구 (없으면 라이트모드)
(function () {
    if (localStorage.getItem('theme') === 'theme-dark') {
        setTheme('theme-dark');
    } else {
        setTheme('theme-light');
    }
})();
