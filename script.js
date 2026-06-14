/**
 * ==========================================================================
 * [규칙 4] 부드러운 전환 효과 및 Supabase 연동 아키텍처
 * ==========================================================================
 */

// Supabase 세팅 (이전과 동일하게 마스터 정보 매핑)
const SUPABASE_URL = "https://pqqvmppgpqmtyttfjyve.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8CDvOg82boUIFNxAtxBGwQ_t-DG1Fj6";
const ADMIN_UID = "260f4b1b-fcaf-4b8a-9d25-a1bb3d8e2ee3"; 
const supabase = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

$(document).ready(function () {
    // 1. 드롭다운 메뉴 열기 / 닫기 컨트롤
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

    // 2. 로그인 버튼 이벤트 바인딩
    $("#btn-login").click(function() {
        $("#login-modal").css("display", "flex").hide().fadeIn(250);
    });

    $("#btn-logout").click(function() {
        handleLogout();
    });

    $("#login-form").submit(function(e) {
        e.preventDefault();
        handleLogin();
    });

    // 새로고침해도 로그인 유지되도록 체크
    checkUserSession();

    // 3. 첫 접속 시 디폴트로 홈 화면 로드
    loadPage('category/home.html');
});

/**
 * 모달창 닫기
 */
function closeLoginModal() {
    $("#login-modal").fadeOut(200);
    $("#login-id").val("");
    $("#login-pass").val("");
}

/**
 * 로그인 로직 (Gmail 자동 변환 & UID 철통 방어)
 */
async function handleLogin() {
    const inputId = $("#login-id").val().trim();
    const inputPw = $("#login-pass").val();

    if (inputId !== "usagiarchiving") {
        alert("승인되지 않은 관리자 계정입니다.");
        return;
    }

    if (!supabase) return;

    try {
        const emailFormat = inputId + "@gmail.com";
        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailFormat,
            password: inputPw
        });

        if (error) {
            alert("비밀번호가 올바르지 않습니다.");
        } else {
            if (data.user && data.user.id === ADMIN_UID) {
                alert("관리자 계정 인증 성공");
                closeLoginModal();
                updateAuthUI(true);
            } else {
                alert("승인되지 않은 계정입니다.");
                await supabase.auth.signOut();
            }
        }
    } catch (e) {
        alert("로그인 처리 중 에러가 발생했습니다.");
    }
}

/**
 * 로그아웃 로직
 */
async function handleLogout() {
    if (!supabase) return;
    const confirmLogout = confirm("로그아웃 하시겠습니까?");
    if (!confirmLogout) return;

    try {
        await supabase.auth.signOut();
        updateAuthUI(false);
        alert("로그아웃 되었습니다.");
        loadPage('category/home.html'); 
    } catch (e) {
        console.error(e);
    }
}

/**
 * 세션 검증
 */
async function checkUserSession() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session && session.user && session.user.id === ADMIN_UID) {
        updateAuthUI(true);
    } else {
        updateAuthUI(false);
    }
}

/**
 * UI 토글
 */
function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        $("#btn-login").hide();
        $("#btn-logout").fadeIn(200);
        $("body").addClass("admin-mode"); 
    } else {
        $("#btn-logout").hide();
        $("#btn-login").fadeIn(200);
        $("body").removeClass("admin-mode");
    }
}

/**
 * 페이지 부드럽게 비동기 로드하는 함수
 */
function loadPage(url) {
    const contentArea = $('#content-area');
    
    contentArea.fadeOut(200, function() {
        $.ajax({
            url: url,
            dataType: 'html',
            success: function(data) {
                contentArea.html(data).addClass('fade-in-element').show();
                
                setTimeout(() => {
                    contentArea.removeClass('fade-in-element');
                }, 500);
            },
            error: function() {
                contentArea.html('<p style="text-align:center; padding-top:50px; color:var(--sub-color);">내용을 불러오지 못했습니다. 경로를 확인해 주세요.<br>('+url+')</p>').show();
            }
        });
    });
}

/**
 * 다크모드/라이트모드 테마 제어 함수
 */
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
