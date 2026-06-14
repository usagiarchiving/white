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

    // 2. [요청사항] 로그인 / 로그아웃 버튼 인터페이스 가작동 구현
    // (추후 2단계에서 Supabase 실시간 연동 코드가 이곳에 주입됩니다)
    $("#btn-login").click(function() {
        // 임시 로그인 처리 가시화
        $(this).hide();
        $("#btn-logout").fadeIn(200);
        alert("나만 로그인하는 관리자 세션 모드 활성화 (UI 가구현)");
        // TODO: Supabase Auth 연동 예정
    });

    $("#btn-logout").click(function() {
        // 임시 로그아웃 처리 가시화
        $(this).hide();
        $("#btn-login").fadeIn(200);
        alert("로그아웃 되었습니다.");
        // TODO: Supabase Auth 로그아웃 연동 예정
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
