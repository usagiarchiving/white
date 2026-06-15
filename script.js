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
    $("#btn-login").click(function() {
        // 임시 로그인 처리 가시화
        $(this).hide();
        $("#btn-logout").fadeIn(200);
        alert("나만 로그인하는 관리자 세션 모드 활성화 (UI 가구현)");
    });

    $("#btn-logout").click(function() {
        // 임시 로그아웃 처리 가시화
        $(this).hide();
        $("#btn-login").fadeIn(200);
        alert("로그아웃 되었습니다.");
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

/**
 * ==========================================================================
 * Supabase 초기화 및 한 줄 기록 (oneline) 연동 로직
 * ==========================================================================
 */

const SUPABASE_URL = 'https://pqqvmppgpqmtyttfjyve.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8CDvOg82boUIFNxAtxBGwQ_t-DG1Fj6';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. 한 줄 기록 불러오기
async function loadOneLinePosts() {
    const feedContainer = $('#oneline-feed');
    
    feedContainer.html('<p style="text-align:center; color:var(--sub-color); font-size:13.5px; padding:30px 0; font-family:\'Noto Serif KR\', serif;">기록을 살피는 중입니다...</p>');

    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('category', 'oneline')
            .order('created_at', { ascending: false });

        if (error) throw error;

        feedContainer.empty();

        if (data.length === 0) {
            feedContainer.html('<p style="text-align:center; color:var(--sub-color); font-size:13.5px; padding:30px 0; font-family:\'Noto Serif KR\', serif;">아직 남겨진 기록이 없습니다.</p>');
            return;
        }

        data.forEach(post => {
            // 가져온 시간을 단정한 포맷으로 변환 (YYYY.MM.DD HH:mm)
            const dateObj = new Date(post.created_at);
            const timeString = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

            // 서체 통일 및 수정/삭제 버튼 UI 추가
            const postHtml = `
                <div class="feed-item fade-in-element" style="padding: 22px 0; border-bottom: 1px solid var(--divider-bg); display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
                        <span class="feed-text" style="color: var(--main-color); font-family: 'Noto Serif KR', serif; line-height: 1.7; word-break: keep-all; font-size: 14.5px;">${post.content}</span>
                        <span class="feed-time" style="font-size: 11.5px; color: var(--sub-color); font-family: 'Noto Serif KR', serif; opacity: 0.8; white-space: nowrap; padding-top: 3px;">${timeString}</span>
                    </div>
                    
                    <div class="admin-inline-menu" style="display: flex; gap: 12px; justify-content: flex-end; opacity: 0.2; transition: opacity 0.3s ease;">
                        <button onclick="editOneLinePost(${post.id}, '${post.content.replace(/'/g, "\\'")}', '${post.created_at}')" style="background:none; border:none; color:var(--sub-color); font-size: 11.5px; font-family:'Noto Serif KR', serif; cursor:pointer; padding:0;">수정</button>
                        <button onclick="deleteOneLinePost(${post.id})" style="background:none; border:none; color:#ff3b30; font-size: 11.5px; font-family:'Noto Serif KR', serif; cursor:pointer; padding:0;">삭제</button>
                    </div>
                </div>
            `;
            feedContainer.append(postHtml);
        });

        // 데스크탑에서는 마우스 오버, 모바일에서는 터치 시 버튼 진해짐
        $('.feed-item').hover(
            function() { $(this).find('.admin-inline-menu').css('opacity', '0.8'); },
            function() { $(this).find('.admin-inline-menu').css('opacity', '0.2'); }
        );

    } catch (error) {
        console.error('Supabase 데이터 로드 실패:', error);
        feedContainer.html('<p style="text-align:center; color:#ff3b30; font-size:13px; padding:30px 0; font-family:\'Noto Serif KR\', serif;">기록을 불러오지 못했습니다.</p>');
    }
}

// 3. 한 줄 기록 전송하기 (DB에 저장)
async function addOneLinePost() {
    const inputEl = $('#oneline-input');
    const content = inputEl.val().trim();

    if (!content) {
        inputEl.val("조용하고 평화로운 하루입니다.");
        return;
    }

    try {
        inputEl.prop('disabled', true);
        
        // 전송 버튼을 누르는 순간의 기기 시간을 낚아채어 강제 주입
        const now = new Date(); 
        const localISOString = now.toISOString();

        const { error } = await supabaseClient
            .from('posts')
            .insert([
                { 
                    category: 'oneline', 
                    content: content,
                    created_at: localISOString 
                }
            ]);

        if (error) throw error;

        inputEl.val('');
        loadOneLinePosts();

    } catch (error) {
        console.error('Supabase 데이터 저장 실패:', error);
        alert('기록을 남기지 못했습니다. 네트워크 상태를 확인해주세요.');
    } finally {
        inputEl.prop('disabled', false);
        inputEl.focus();
    }
}

// 4. [추가] 한 줄 기록 수정하기
async function editOneLinePost(id, currentContent, currentDetailTime) {
    const newContent = prompt("수정할 내용을 입력하세요:", currentContent);
    if (newContent === null) return; // 취소
    
    const newTime = prompt("시간을 수정하시겠습니까? (형식 자유):", currentDetailTime);
    if (newTime === null) return;

    try {
        let finalTimeISO = new Date(newTime).toISOString();
        if(finalTimeISO === "Invalid Date") {
            finalTimeISO = new Date().toISOString(); 
        }

        const { error } = await supabaseClient
            .from('posts')
            .update({ content: newContent.trim(), created_at: finalTimeISO })
            .eq('id', id);

        if (error) throw error;
        loadOneLinePosts();

    } catch (error) {
        console.error('Supabase 데이터 수정 실패:', error);
        alert('글을 수정하지 못했습니다.');
    }
}

// 5. [추가] 한 줄 기록 삭제하기
async function deleteOneLinePost(id) {
    if (!confirm("정말 이 기록을 삭제하시겠습니까?")) return;

    try {
        const { error } = await supabaseClient
            .from('posts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        loadOneLinePosts();

    } catch (error) {
        console.error('Supabase 데이터 삭제 실패:', error);
        alert('기록을 삭제하지 못했습니다.');
    }
}
