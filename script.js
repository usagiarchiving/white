/**
 * ==========================================================================
 * [추가된 부분] Supabase 실제 연동 설정
 * ==========================================================================
 */
const SUPABASE_URL = 'https://pqqvmppgpqmtyttfjyve.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8CDvOg82boUIFNxAtxBGwQ_t-DG1Fj6';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * ==========================================================================
 * [규칙 4] 부드러운 전환 효과 중심의 자바스크립트 아키텍처
 * ==========================================================================
 */

$(document).ready(function () {
    // 1. 드롭다운 메뉴 열기 / 닫기 컨트롤
    $(".dropdown-bars").click(function (e) {
        e.stopPropagation();
        // 부드러운 슬라이딩 전환
        $(".dropdown-inner").slideToggle(250); 
        
        let icon = $("#menu-icon");
        icon.toggleClass("xi-bars xi-close");
    });
    
    // 외부 빈 곳이나 메뉴 클릭 시 자동으로 닫히도록 마감 처리
    $(".dropdown-inner a, body").click(function() {
        $(".dropdown-inner").slideUp(200);
        $("#menu-icon").removeClass("xi-close").addClass("xi-bars");
    });
    $('.dropdown-inner').click(function(e) { e.stopPropagation(); });

    // 2. [수정된 부분] 관리자 로그인 / 로그아웃 (Supabase 실제 연동)
    
    // 로그인 상태에 따른 UI 제어 함수
    function updateLoginUI(isLoggedIn) {
        if (isLoggedIn) {
            $("#btn-login").hide();
            $("#btn-logout").fadeIn(200);
            $(".article-admin-menu").fadeIn(300); // 관리자용 버튼 표시
        } else {
            $("#btn-logout").hide();
            $("#btn-login").fadeIn(200);
            $(".article-admin-menu").hide();      // 관리자용 버튼 숨김
        }
    }

    // 접속 시 현재 Supabase 로그인 상태 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
        updateLoginUI(!!session);
    });

    // 로그인 버튼 클릭 시 팝업 열기
    $("#btn-login").click(function() {
        $("#login-modal").css('display', 'flex').hide().fadeIn(250);
    });

    // 팝업 닫기 버튼
    $("#btn-login-close").click(function() {
        $("#login-modal").fadeOut(200);
    });

    // 실제 로그인 시도
    $("#btn-login-submit").click(async function() {
        const inputEmail = $("#login-id").val();
        const inputPw = $("#login-pw").val();
        const submitBtn = $(this);

        submitBtn.text("로그인 중..."); // 진행 중 표시

        // Supabase 인증 요청
        const { data, error } = await supabase.auth.signInWithPassword({
            email: inputEmail,
            password: inputPw,
        });

        submitBtn.text("로그인"); // 버튼 글씨 원상복구

        if (error) {
            alert("로그인 실패: 이메일이나 비밀번호가 틀렸습니다.");
            console.error(error);
        } else {
            alert("관리자로 로그인되었습니다.");
            $("#login-modal").fadeOut(200);
            $("#login-id").val("");
            $("#login-pw").val("");
            updateLoginUI(true);
        }
    });

    // 로그아웃 처리
    $("#btn-logout").click(async function() {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            alert("로그아웃 되었습니다.");
            updateLoginUI(false);
        }
    });

    // 3. 첫 접속 시 디폴트로 홈 화면 로드
    loadPage('category/home.html');
});

/**
 * 페이지 부드럽게 비동기 로드하는 함수
 * @param {string} url - 불러올 html 파일 경로
 */
function loadPage(url) {
    const contentArea = $('#content-area');
    
    // [규칙 4] 기존 내용을 부드럽게 페이드아웃 한 뒤 교체
    contentArea.fadeOut(200, function() {
        $.ajax({
            url: url,
            dataType: 'html',
            success: function(data) {
                // 새 내용 주입 후 고급스러운 애니메이션 클래스 입혀서 페이드인
                contentArea.html(data).addClass('fade-in-element').show();
                
                // 애니메이션이 끝나면 클래스 제거하여 깔끔한 상태 유지
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
 * 다크모드/라이트모드 테마 제어 함수 (기존 로직 보존 및 정돈)
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

// 초기 실시간 테마 반영 실행
(function () {
    setTheme(localStorage.getItem('theme') === 'theme-dark' ? 'theme-dark' : 'theme-light');
})();
