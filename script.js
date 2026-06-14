/**
 * ==========================================================================
 * [2단계] Supabase 인프라 초기화 및 관리자 보안 세팅
 * ==========================================================================
 */
const SUPABASE_URL = "https://pqqvmppgpqmtyttfjyve.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8CDvOg82boUIFNxAtxBGwQ_t-DG1Fj6";

// [보안 추가] 오직 이 UID를 가진 유저만 글을 수정/삭제할 수 있는 관리자 권한을 가집니다.
const ADMIN_UID = "260f4b1b-fcaf-4b8a-9d25-a1bb3d8e2ee3"; 

const supabase = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

$(document).ready(function () {
    // 드롭다운 바 토글 제어
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

    // 로그인 모달 오픈 이벤트
    $("#btn-login").click(function() {
        openLoginModal();
    });

    // 로그아웃 이벤트
    $("#btn-logout").click(function() {
        handleLogout();
    });

    // 로그인 폼 전송 이벤트
    $("#login-form").submit(function(e) {
        e.preventDefault();
        handleLogin();
    });

    // 접속 시 현재 로그인된 세션이 있는지 자동 체크
    checkUserSession();

    // 초기 화면 로드
    loadPage('category/home.html');
});

/**
 * 로그인 팝업 열기 및 닫기
 */
function openLoginModal() {
    $("#login-modal").css("display", "flex").hide().fadeIn(250);
}

function closeLoginModal() {
    $("#login-modal").fadeOut(200);
    $("#login-id").val("");
    $("#login-pass").val("");
}

/**
 * Supabase Auth 연동 단독 관리자 인증 처리
 */
async function handleLogin() {
    const inputId = $("#login-id").val().trim();
    const inputPw = $("#login-pass").val();

    // 1차 방어: 지정한 아이디가 아니면 요청조차 보내지 않음
    if (inputId !== "usagiarchiving") {
        alert("승인되지 않은 관리자 계정입니다.");
        return;
    }

    if (!supabase) {
        alert("데이터베이스 연결에 문제가 발생했습니다.");
        return;
    }

    try {
        // [수정] gmail.com으로 로그인 요청 처리
        const emailFormat = inputId + "@gmail.com";
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email: emailFormat,
            password: inputPw
        });

        if (error) {
            alert("비밀번호가 올바르지 않습니다.");
        } else {
            // 2차 절대 방어: 로그인 성공했더라도 UID가 다르면 튕겨냄
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
        console.error(e);
        alert("로그인 처리 중 에러가 발생했습니다.");
    }
}

/**
 * 로그아웃 처리
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
 * 페이지 새로고침 시 로그인 상태(UID) 완벽 검증
 */
async function checkUserSession() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    
    // [수정] 고유 UID로 세션을 검사하여 보안성 극대화
    if (session && session.user && session.user.id === ADMIN_UID) {
        updateAuthUI(true);
    } else {
        updateAuthUI(false);
    }
}

/**
 * 로그인 상태에 따른 상단 버튼 교체 스위치 UI
 */
function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        $("#btn-login").hide();
        $("#btn-logout").fadeIn(200);
        // 이 클래스가 추가되어야 나중에 글 수정/삭제 버튼이 화면에 보입니다.
        $("body").addClass("admin-mode"); 
    } else {
        $("#btn-logout").hide();
        $("#btn-login").fadeIn(200);
        $("body").removeClass("admin-mode");
    }
}

/**
 * 카테고리 비동기 페이지 로더
 */
function loadPage(url) {
    const contentArea = $('#content-area');
    contentArea.fadeOut(200, function() {
        $.ajax({
            url: url,
            dataType: 'html',
            success: function(data) {
                contentArea.html(data).addClass('fade-in-element').show();
                setTimeout(() => { contentArea.removeClass('fade-in-element'); }, 500);
            },
            error: function() {
                contentArea.html('<p style="text-align:center; padding-top:50px; color:var(--sub-color);">컨텐츠를 불러올 수 없습니다.<br>('+url+')</p>').show();
            }
        });
    });
}

/**
 * 테마 제어 로직
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
