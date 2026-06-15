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

    // 3. 첫 접속 시 디폴트로 홈 화면 로드 (oneline이 아닌 진짜 홈 화면)
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

/**
 * ==========================================================================
 * [추가] Supabase 초기화 및 한 줄 기록 (oneline) 연동 로직
 * ==========================================================================
 */

// 1. Supabase 접속 정보 세팅 
// (주의: CDN의 기본 'supabase' 변수와 이름이 겹치지 않도록 'supabaseClient'로 명명)
const SUPABASE_URL = 'https://pqqvmppgpqmtyttfjyve.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8CDvOg82boUIFNxAtxBGwQ_t-DG1Fj6';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. 한 줄 기록 불러오기
async function loadOneLinePosts() {
    const feedContainer = $('#oneline-feed');
    
    // 로딩 중 표시 (부드러운 감성)
    feedContainer.html('<p style="text-align:center; color:var(--sub-color); font-size:13.5px; padding:30px 0;">기록을 살피는 중입니다...</p>');

    try {
        // posts 테이블에서 category가 'oneline'인 데이터만 최신순으로 가져오기
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('category', 'oneline')
            .order('created_at', { ascending: false });

        if (error) throw error;

        feedContainer.empty();

        if (data.length === 0) {
            feedContainer.html('<p style="text-align:center; color:var(--sub-color); font-size:13.5px; padding:30px 0;">아직 남겨진 기록이 없습니다.</p>');
            return;
        }

        // [규칙 4] 부드러운 페이드인 효과를 주며 목록 렌더링
        data.forEach(post => {
            // 시간 포맷팅 (예: 2026.06.15 16:33)
            const dateObj = new Date(post.created_at);
            const timeString = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

            const postHtml = `
                <div class="feed-item fade-in-element" style="padding: 18px 0; border-bottom: 1px dashed var(--divider-bg); display: flex; justify-content: space-between; align-items: baseline; gap: 20px;">
                    <span class="feed-text" style="color: var(--main-color); line-height: 1.7; word-break: keep-all;">${post.content}</span>
                    <span class="feed-time" style="font-size: 11.5px; color: var(--sub-color); font-family: monospace; opacity: 0.8; white-space: nowrap;">${timeString}</span>
                </div>
            `;
            feedContainer.append(postHtml);
        });

    } catch (error) {
        console.error('Supabase 데이터 로드 실패:', error);
        feedContainer.html('<p style="text-align:center; color:#ff3b30; font-size:13px; padding:30px 0;">기록을 불러오지 못했습니다.</p>');
    }
}

// 3. 한 줄 기록 전송하기 (DB에 저장)
async function addOneLinePost() {
    const inputEl = $('#oneline-input');
    const content = inputEl.val().trim();

    if (!content) {
        // [디테일] 입력 없이 전송 누르면 레퍼런스처럼 기본 멘트 발사
        inputEl.val("조용하고 평화로운 하루입니다.");
        return;
    }

    try {
        // 중복 전송 방지를 위해 일시적으로 입력창 잠금
        inputEl.prop('disabled', true);
        
        // posts 테이블에 insert (category는 'oneline', title은 생략)
        const { error } = await supabaseClient
            .from('posts')
            .insert([
                { category: 'oneline', content: content }
            ]);

        if (error) throw error;

        // 저장 성공 시 입력창 깔끔하게 비우고 목록 리로드
        inputEl.val('');
        loadOneLinePosts();

    } catch (error) {
        console.error('Supabase 데이터 저장 실패:', error);
        alert('기록을 남기지 못했습니다. 네트워크 상태를 확인해주세요.');
    } finally {
        // 전송 완료 후 다시 입력창 활성화
        inputEl.prop('disabled', false);
        inputEl.focus();
    }
}
