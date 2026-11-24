/**
 * ==========================================================================
 * [규칙 4] 부드러운 전환 효과 중심의 자바스크립트 아키텍처
 * (개별 페이지 로직은 모두 각 html 파일로 독립되었습니다)
 * ==========================================================================
 */

$(document).ready(function () {
    renderMenu();

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

    // 첫 페이지 로드 시, 주소창에 적힌 꼬리표(#)를 먼저 감지하여 문을 엽니다.
    initPageLoad();
});

// index.html의 마스터 주머니(설정에서 바꾼 순서·이름 반영됨)를 읽어서 메뉴판 인쇄
function renderMenu() {
    if (typeof CATEGORIES === 'undefined') return;
    const menuContainer = $('#dropdown-menu');
    menuContainer.empty();
    CATEGORIES.forEach(cat => {
        if (cat.active) {
            // 메뉴 클릭 시 페이지 로드와 동시에 주소창의 hash(#)도 함께 변경
            const a = $('<a>').attr('href', '#' + cat.hash).text(cat.name);
            a.on('click', () => { loadPageByHash(cat.hash); return false; });
            menuContainer.append(a);
        }
    });
}
window.renderMenu = renderMenu;

// 주소창의 해시(#)를 분석해서 맞는 페이지를 찾아 대령하는 함수
// 주소는 #카테고리 그대로 (예쁘게). ?c=카테고리 로 들어와도 그 카테고리로 열고, 주소는 #카테고리로 정리
function setCatUrl(hash) {
    if (!location.search.includes('c=')) return;
    history.replaceState(null, '', location.pathname + (hash ? '#' + hash : ''));
}

function initPageLoad() {
    const qc = /[?&]c=([^&#]+)/.exec(location.search);
    const currentHash = window.location.hash.replace('#', '') || (qc ? decodeURIComponent(qc[1]) : '');
    let targetPage = 'category/home.html'; // 기본값 (홈, 설정의 '처음 열 화면')
    const start = typeof CATEGORIES !== 'undefined' && CATEGORIES.find(cat => cat.hash === window.SITE_START && cat.active);
    if (start) targetPage = start.path;

    if (currentHash && typeof CATEGORIES !== 'undefined') {
        const matched = CATEGORIES.find(cat => cat.hash === currentHash && cat.active);
        if (matched) {
            targetPage = matched.path;
        }
    }
    const cur = typeof CATEGORIES !== 'undefined' && CATEGORIES.find(cat => cat.path === targetPage);
    if (cur) setCatUrl(cur.hash);
    loadPage(targetPage);
}

// 메뉴판 클릭 시 주소창 꼬리표를 바꾸고 화면을 전환하는 중계 함수
function loadPageByHash(hashName) {
    if (typeof CATEGORIES !== 'undefined') {
        const matched = CATEGORIES.find(cat => cat.hash === hashName);
        if (matched) {
            window.location.hash = hashName;
            setCatUrl(hashName);
            loadPage(matched.path);
        }
    }
}

// 김민정 · 마이홈 · 다이어리는 화면 가득 쓰는 게임 화면: 헤더를 얇게 하고 헤더 높이를 CSS에 알려 줌
const GAME_PAGES = /category\/(minjung|myhome|diary)\//;
function setHeaderHeight() {
    const h = document.getElementById('header');
    if (h) document.documentElement.style.setProperty('--hdr-h', h.offsetHeight + 'px');
}
window.addEventListener('resize', setHeaderHeight);
window.addEventListener('load', setHeaderHeight);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHeaderHeight);   // 아이콘 글꼴이 늦게 와도 높이 다시 잼

function loadPage(url) {
    const contentArea = $('#content-area');
    // 홈 화면(웹앱) 사진·이름은 지금 카테고리 것으로, 설정 톱니바퀴는 토끼굴 메인에서만
    if (window.siteSettings) {
        const cat = typeof CATEGORIES !== 'undefined' && CATEGORIES.find(c => c.path === url);
        window.siteSettings.identity(cat ? cat.hash : 'home');
        window.siteSettings.showGear(url === 'category/home.html');
    }
    const game = GAME_PAGES.test(url);
    if (game) {
        // 게임 화면은 기다림 없이 바로 바꿈 (전환이 버벅이지 않게)
        document.body.classList.add('game-page');
        setHeaderHeight();
        $.ajax({ url: url, dataType: 'html', cache: false,
            success: function (data) {
                contentArea.stop(true, true).html(data).addClass('fade-in-element').show();
                setTimeout(() => { contentArea.removeClass('fade-in-element'); }, 300);
            },
            error: function () { contentArea.html('<p style="text-align:center; padding-top:50px; color:var(--sub-color);">내용을 불러오지 못했습니다.</p>').show(); }
        });
        return;
    }
    document.body.classList.remove('game-page');
    setHeaderHeight();
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
/* 🚨 맨 마지막에 있던 불필요한 닫는 괄호 } 제거됨 (스크립트 오류 원인) */

// ==========================================================================
// 휴대폰: 확대 안 되게 (입력칸 자동 확대 · 두 손가락 확대 · 두 번 톡 확대 모두 막음)
// ==========================================================================
(function () {
    var VP = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    var m = document.querySelector('meta[name="viewport"]');
    if (m) m.setAttribute('content', VP);
    // 아이폰 사파리는 user-scalable=no 를 무시하고 두 손가락 확대를 허용해서 직접 막음
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) {
        document.addEventListener(t, function (e) { e.preventDefault(); }, { passive: false });
    });
    document.addEventListener('touchmove', function (e) { if (e.touches && e.touches.length > 1 && !e.target.closest('#mh-stage')) e.preventDefault(); }, { passive: false });
    // 두 번 톡 확대는 style.css 의 touch-action: manipulation 으로 막음 (버튼 빠르게 두 번 누르기는 그대로)
})();

// ==========================================================================
// 웹앱 알림(하시온 메시지): 알림 받는 일꾼(sw.js) 등록 + 알림을 누르면 김민정 화면의 시온 창 열기
// ==========================================================================
(function () {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('sw', e); });
    function openSion(tab) {
        try { sessionStorage.setItem('sion_open', tab || 'Message'); } catch (e) {}
        if (window.__openSion && location.hash === '#minjung') window.__openSion(tab);
        else loadPageByHash('minjung');
    }
    navigator.serviceWorker.addEventListener('message', function (e) { if (e.data && e.data.sion) openSion(e.data.sion); });
    // 앱이 닫혀 있다가 알림으로 열렸을 때: 주소의 ?sion=Message
    var m = /[?&]sion=(Message|Letter)/.exec(location.search);
    if (m) {
        try { sessionStorage.setItem('sion_open', m[1]); } catch (e) {}
        history.replaceState(null, '', location.pathname + '#minjung');
    }
})();
