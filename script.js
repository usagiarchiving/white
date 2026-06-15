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

// [추가 기능] 엔터키를 누르면 바로 전송되도록 이벤트 연결
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
            cache: false, // <-- [중요] 브라우저가 옛날 파일을 기억하지 못하게 차단합니다.
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
 * Supabase 한 줄 기록 (oneline) 최적화 로직
 * ==========================================================================
 */

const SUPABASE_URL = 'https://pqqvmppgpqmtyttfjyve.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxcXZtcHBncHFtdHl0dGZqeXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzYxMDAsImV4cCI6MjA5NzAxMjEwMH0.86kBtiDT9J_FNeKDOqm82p53JObFTfQkQUAzsT94icw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. 한 줄 기록 불러오기 (최신글 맨 위로 보장 & 날짜 클릭 토글)
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

            const postHtml = `
                <div class="feed-item fade-in-element" style="padding: 22px 0; border-bottom: 1px solid var(--divider-bg); display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
                        <span class="feed-text" style="color: var(--main-color); font-family: 'Noto Serif KR', serif; line-height: 1.7; word-break: keep-all; font-size: 14.5px;">${post.content}</span>
                        <span class="feed-time" onclick="toggleAdminMenu(${post.id})" title="클릭하여 글 관리" style="font-size: 11.5px; color: var(--sub-color); font-family: 'Noto Serif KR', serif; opacity: 0.8; white-space: nowrap; padding-top: 3px; cursor: pointer;">${timeString}</span>
                    </div>
                    
                    <div id="admin-menu-${post.id}" style="display: none; justify-content: flex-end; gap: 12px; margin-top: 4px;">
                        <button onclick="editOneLinePost(${post.id}, '${post.content.replace(/'/g, "\\'")}', '${timeString}')" style="background:none; border:none; color:var(--point-color); font-size: 11.5px; font-family:'Noto Serif KR', serif; cursor:pointer; padding:0;">수정</button>
                        <button onclick="deleteOneLinePost(${post.id})" style="background:none; border:none; color:#ff3b30; font-size: 11.5px; font-family:'Noto Serif KR', serif; cursor:pointer; padding:0;">삭제</button>
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

function toggleAdminMenu(id) {
    $(`#admin-menu-${id}`).slideToggle(150).css('display', 'flex');
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
        alert('기록을 남기지 못했습니다. (Supabase RLS 설정을 확인하세요)');
    } finally {
        inputEl.prop('disabled', false);
        inputEl.focus();
    }
}

// 4. 한 줄 기록 수정하기
async function editOneLinePost(id, currentContent, currentDetailTime) {
    const newContent = prompt("수정할 내용을 입력하세요:", currentContent);
    if (newContent === null) return; 
    
    const newTime = prompt("시간을 수정하시겠습니까? (형식: YYYY.MM.DD HH:mm)", currentDetailTime);
    if (newTime === null) return;

    try {
        const cleanTime = newTime.replace(/\./g, '/');
        let finalTimeISO = new Date(cleanTime).toISOString();
        
        if (finalTimeISO === "Invalid Date") {
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
        alert('글을 수정하지 못했습니다. (Supabase RLS 비활성화 필요)');
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
        alert('기록을 삭제하지 못했습니다. (Supabase RLS 비활성화 필요)');
    }
}
