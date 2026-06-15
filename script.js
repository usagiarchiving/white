/**
 * ==========================================================================
 * [규칙 4] 부드러운 전환 효과 중심의 자바스크립트 아키텍처
 * ==========================================================================
 */

$(document).ready(function () {
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

    loadPage('category/home.html');
});

// [추가 기능] 새 글 작성 시 엔터키 전송
$(document).on('keypress', '#oneline-input', function(e) {
    if (e.which === 13) { 
        addOneLinePost(); 
    }
});

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

/**
 * ==========================================================================
 * Supabase 한 줄 기록 (oneline) 최적화 로직 (팝업 제거 인라인 에디팅)
 * ==========================================================================
 */

const SUPABASE_URL = 'https://pqqvmppgpqmtyttfjyve.supabase.co';
const SUPABASE_KEY = 'sb_publishable_8CDvOg82boUIFNxAtxBGwQ_t-DG1Fj6';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. 한 줄 기록 불러오기
async function loadOneLinePosts() {
    const feedContainer = $('#oneline-feed');
    feedContainer.html('<p style="text-align:center; color:var(--sub-color); font-size:13.5px; padding:30px 0; font-family:\'Noto Serif KR\', serif; opacity:0.6;">종이에 글을 찍어내는 중입니다...</p>');

    try {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*')
            .eq('category', 'oneline')
            .order('created_at', { ascending: false }); 

        if (error) throw error;
        feedContainer.empty();

        if (data.length === 0) {
            feedContainer.html('<p style="text-align:center; color:var(--sub-color); font-size:13.5px; padding:30px 0; font-family:\'Noto Serif KR\', serif;">아직 남겨진 생각의 조각이 없습니다.</p>');
            return;
        }

        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        data.forEach(post => {
            const dateObj = new Date(post.created_at);
            const timeString = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            
            // 따옴표 오류 방지를 위한 이스케이프 처리
            const safeContent = post.content.replace(/"/g, '&quot;');

            // [UI 변경] 팝업 없이 그 자리에서 내용과 시간을 변경하는 '인라인 에디터' 구조
            const postHtml = `
                <div class="feed-item fade-in-element" id="post-${post.id}" style="padding: 22px 0; border-bottom: 1px solid var(--divider-bg); display: flex; flex-direction: column; gap: 8px;">
                    
                    <div class="read-mode" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
                        <span class="feed-text" style="color: var(--main-color); font-family: 'Noto Serif KR', serif; line-height: 1.7; word-break: keep-all; font-size: 14.5px; flex: 1;">${post.content}</span>
                        <span class="feed-time" onclick="toggleAdminMenu(${post.id})" title="클릭하여 글 관리" style="font-size: 11.5px; color: var(--sub-color); font-family: 'Noto Serif KR', serif; opacity: 0.8; white-space: nowrap; padding-top: 3px; cursor: pointer;">${timeString}</span>
                    </div>
                    
                    <div class="edit-mode" style="display: none; flex-direction: column; gap: 10px; width: 100%;">
                        <input type="text" id="edit-content-${post.id}" value="${safeContent}" onkeypress="if(event.keyCode===13) saveEdit(${post.id})" style="width: 100%; background: transparent; border: none; border-bottom: 1px solid var(--point-color); color: var(--main-color); font-family: 'Noto Serif KR', serif; font-size: 14.5px; padding: 4px 0; outline: none;">
                        <input type="text" id="edit-time-${post.id}" value="${timeString}" onkeypress="if(event.keyCode===13) saveEdit(${post.id})" style="width: 130px; background: transparent; border: none; border-bottom: 1px solid var(--point-color); color: var(--sub-color); font-family: 'Noto Serif KR', serif; font-size: 11.5px; padding: 2px 0; outline: none;">
                    </div>
                    
                    <div class="admin-menu" id="admin-menu-${post.id}" style="display: none; justify-content: flex-end; gap: 12px; margin-top: 4px;">
                        <button onclick="startEdit(${post.id})" style="background:none; border:none; color:var(--point-color); font-size: 11.5px; font-family:'Noto Serif KR', serif; cursor:pointer; padding:0;">수정</button>
                        <button onclick="deleteOneLinePost(${post.id})" style="background:none; border:none; color:#ff3b30; font-size: 11.5px; font-family:'Noto Serif KR', serif; cursor:pointer; padding:0;">삭제</button>
                    </div>

                    <div class="edit-actions" id="edit-actions-${post.id}" style="display: none; justify-content: flex-end; gap: 12px; margin-top: 4px;">
                        <button onclick="saveEdit(${post.id})" style="background:none; border:none; color:var(--point-color); font-size: 11.5px; font-family:'Noto Serif KR', serif; font-weight:600; cursor:pointer; padding:0;">저장</button>
                        <button onclick="cancelEdit(${post.id})" style="background:none; border:none; color:var(--sub-color); font-size: 11.5px; font-family:'Noto Serif KR', serif; cursor:pointer; padding:0;">취소</button>
                    </div>
                </div>
            `;
            feedContainer.append(postHtml);
        });

    } catch (error) {
        console.error('Supabase 데이터 로드 실패:', error);
        feedContainer.html('<p style="text-align:center; color:#ff3b30; font-size:13px; padding:30px 0; font-family:\'Noto Serif KR\', serif;">기록을 불러오지 못했습니다.</p>');
    }
}

// 메뉴 토글 (수정 모드일 때는 날짜를 눌러도 반응하지 않게 차단)
function toggleAdminMenu(id) {
    if ($(`#post-${id} .edit-mode`).is(':visible')) return;
    $(`#admin-menu-${id}`).slideToggle(150).css('display', 'flex');
}

// [추가] 인라인 에디팅 - 수정 시작
function startEdit(id) {
    const postEl = $(`#post-${id}`);
    postEl.find('.read-mode').hide();
    postEl.find('.admin-menu').hide();
    postEl.find('.edit-mode').fadeIn(200).css('display', 'flex');
    postEl.find('.edit-actions').fadeIn(200).css('display', 'flex');
    postEl.find(`#edit-content-${id}`).focus();
}

// [추가] 인라인 에디팅 - 수정 취소
function cancelEdit(id) {
    const postEl = $(`#post-${id}`);
    postEl.find('.edit-mode').hide();
    postEl.find('.edit-actions').hide();
    postEl.find('.read-mode').fadeIn(200).css('display', 'flex');
    // 취소 시 메뉴는 기본적으로 닫아둠 (날짜를 눌러서 다시 열게 함)
}

// [추가] 인라인 에디팅 - 수정된 내용 실제 저장
async function saveEdit(id) {
    const newContent = $(`#edit-content-${id}`).val().trim();
    const newTimeStr = $(`#edit-time-${id}`).val().trim();

    if (!newContent) {
        alert("사유의 파편이 비어있습니다. 문장을 적어주세요.");
        $(`#edit-content-${id}`).focus();
        return;
    }

    try {
        const cleanTime = newTimeStr.replace(/\./g, '/');
        let finalTimeISO = new Date(cleanTime).toISOString();
        
        if (finalTimeISO === "Invalid Date") {
            finalTimeISO = new Date().toISOString(); 
        }

        const { error } = await supabaseClient
            .from('posts')
            .update({ content: newContent, created_at: finalTimeISO })
            .eq('id', id);

        if (error) throw error;
        loadOneLinePosts(); // 저장 후 목록 새로고침

    } catch (error) {
        console.error('Supabase 데이터 수정 실패:', error);
        alert('글을 수정하지 못했습니다. (Supabase RLS 비활성화 상태 확인)');
    }
}

// 3. 한 줄 기록 전송하기
async function addOneLinePost() {
    const inputEl = $('#oneline-input');
    const content = inputEl.val().trim();

    if (!content) return; 

    try {
        inputEl.prop('disabled', true);
        const now = new Date(); 
        const localISOString = now.toISOString();

        const { error } = await supabaseClient
            .from('posts')
            .insert([{ category: 'oneline', content: content, created_at: localISOString }]);

        if (error) throw error;
        inputEl.val('');
        loadOneLinePosts();

    } catch (error) {
        console.error('Supabase 데이터 저장 실패:', error);
        alert('기록을 남기지 못했습니다.');
    } finally {
        inputEl.prop('disabled', false);
        inputEl.focus();
    }
}

// 5. 한 줄 기록 삭제하기
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
