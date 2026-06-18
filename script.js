/**
 * ==========================================================================
 * [규칙 4] 부드러운 전환 효과 중심의 자바스크립트 아키텍처
 * (개별 페이지 로직은 모두 각 html 파일로 독립되었습니다)
 * ==========================================================================
 */

$(document).ready(function () {
    // [추가] index.html의 마스터 주머니를 읽어서 메뉴판 동적 인쇄
    if (typeof CATEGORIES !== 'undefined') {
        const menuContainer = $('#dropdown-menu');
        menuContainer.empty(); // 기존 메뉴 초기화
        
        CATEGORIES.forEach(cat => {
            if (cat.active) {
                // 🚨 [핀셋 수정] 메뉴 클릭 시 페이지 로드와 동시에 주소창의 hash(#)도 함께 변경되도록 연동했습니다.
                menuContainer.append(`<a href="#${cat.hash}" onclick="loadPageByHash('${cat.hash}'); return false;">${cat.name}</a>`);
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

    $("#btn-login").click(function() {
        $(this).hide();
        $("#btn-logout").fadeIn(200);
        alert("나만 로그인하는 관리자 세션 모드 활성화 (UI 가구현)");
    });

    $("#btn-logout").click(function() {
        $(this).hide();
        $("#btn-login").fadeIn(200);
        alert("로그아웃 되었습니다.");
    });

    // 🚨 [핀셋 수정] 첫 페이지 로드 시, 주소창에 적힌 꼬리표(#)를 먼저 감지하여 문을 엽니다.
    initPageLoad();
});

// 🚨 [신규 추가] 주소창의 해시(#)를 분석해서 맞는 페이지를 찾아 대령하는 함수
function initPageLoad() {
    const currentHash = window.location.hash.replace('#', '');
    let targetPage = 'category/home.html'; // 기본값 (홈)

    if (currentHash && typeof CATEGORIES !== 'undefined') {
        const matched = CATEGORIES.find(cat => cat.hash === currentHash && cat.active);
        if (matched) {
            targetPage = matched.path;
        }
    }
    loadPage(targetPage);
}

// 🚨 [신규 추가] 메뉴판 클릭 시 주소창 꼬리표를 바꾸고 화면을 전환하는 중계 함수
function loadPageByHash(hashName) {
    if (typeof CATEGORIES !== 'undefined') {
        const matched = CATEGORIES.find(cat => cat.hash === hashName);
        if (matched) {
            // 주소창 뒤에 #명찰을 예쁘게 붙여줍니다.
            window.location.hash = hashName;
            loadPage(matched.path);
        }
    }
}

function loadPage(url) {
    const contentArea = $('#content-area');
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

function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.className = themeName;
    if(themeName === 'theme-dark') {
        $('#theme-icon').removeClass('xi-toggle-off').addClass('xi-toggle-on');
    } else {
        $('#theme-icon').removeClass('xi-toggle-on').addClass('xi-toggle-off');
    }
}

function toggleTheme() {
    setTheme(localStorage.getItem('theme') === 'theme-dark' ? 'theme-light' : 'theme-dark');
}

(function () {
    setTheme(localStorage.getItem('theme') === 'theme-dark' ? 'theme-dark' : 'theme-light');
})();
