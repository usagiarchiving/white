let CONFIG_CATEGORIES = [];
let CONFIG_ARTICLES = [];

// Supabase 세팅
const SUPABASE_URL = "https://pqqvmppgpqmtyttfjyve.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_8CDvOg82boUIFNxAtxBGwQ_t-DG1Fj6";
const ADMIN_UID = "260f4b1b-fcaf-4b8a-9d25-a1bb3d8e2ee3"; 
const supabase = typeof supabase !== 'undefined' ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

$(document).ready(function () {
    // 메뉴 토글 (오리지널 코드)
    $(".dropdown-bars").click(function (e) {
        e.stopPropagation();
        $(".dropdown-inner").slideToggle(200); 
        let icon = $("#menu-icon");
        icon.toggleClass("xi-bars xi-close");
    });
    
    $(".dropdown-inner a, body").click(function() {
        $(".dropdown-inner").slideUp(200);
        $("#menu-icon").removeClass("xi-close").addClass("xi-bars");
    });
    $('.dropdown-inner').click(function(e) { e.stopPropagation(); });

    // 검색어 이벤트 (오리지널 코드)
    $('#search-input').on('input', function() {
        const activeCategory = $('.category-item.active').text() || '전체';
        buildList(activeCategory);
    });

    // 로그인 이벤트
    $("#btn-login").click(function() { openLoginModal(); });
    $("#btn-logout").click(function() { handleLogout(); });
    $("#login-form").submit(function(e) { e.preventDefault(); handleLogin(); });

    // 기존 리스트 비동기 로딩 (오리지널 코드)
    $.ajax({
        url: 'category/list.html', // 카테고리 폴더로 경로 변경
        dataType: 'html',
        success: function(data) {
            const tempDiv = $('<div>').html(data);
            const categoriesSet = new Set();
            tempDiv.find('.list-item').each(function() {
                const id = $(this).attr('data-id');
                const category = $(this).attr('data-category');
                const title = $(this).text().trim();
                const date = $(this).attr('data-date');
                CONFIG_ARTICLES.push({ id, category, title, date });
                if(category) categoriesSet.add(category);
            });
            CONFIG_CATEGORIES = Array.from(categoriesSet);
            initializeWebsite();
            loadExternalPage('home', 'category/home.html');
        },
        error: function() {
            $('#list-container').html('<p style="text-align:center;">list.html을 불러오는데 실패했습니다.</p>');
            initializeWebsite();
            loadExternalPage('home', 'category/home.html');
        }
    });

    checkUserSession();
});

// ==========================================
// 오리지널 함수들 유지
// ==========================================
function setTheme(themeName) {
    localStorage.setItem('theme', themeName);
    document.documentElement.className = themeName;
    if(themeName === 'theme-dark') {
        $('#theme-icon').removeClass('xi-toggle-off').addClass('xi-toggle-on');
    } else {
        $('#theme-icon').removeClass('xi-toggle-on').addClass('xi-toggle-off');
    }
}
function toggleTheme() { setTheme(localStorage.getItem('theme') === 'theme-dark' ? 'theme-light' : 'theme-dark'); }
(function () { setTheme(localStorage.getItem('theme') === 'theme-dark' ? 'theme-dark' : 'theme-light'); })();

function changeView(viewName) {
    const $currentVisible = $('.page-view:visible');
    if ($currentVisible.length > 0) {
        $currentVisible.fadeOut(300, function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            $(`#view-${viewName}`).fadeIn(400);
        });
    } else {
        $(`#view-${viewName}`).show();
    }
}

function loadExternalPage(viewName, url) {
    $.ajax({
        url: url,
        dataType: 'html',
        success: function(data) {
            $(`#${viewName}-content`).html(data);
            if(viewName !== 'list') changeView(viewName);
        },
        error: function() {
            $(`#${viewName}-content`).html('<p style="text-align:center;">파일을 불러오지 못했습니다.</p>');
            if(viewName !== 'list') changeView(viewName);
        }
    });
}

function initializeWebsite() {
    const menuContainer = $('#category-menu-container');
    menuContainer.empty();
    menuContainer.append(`<span class="category-item active" onclick="filterCategory('전체', this)">전체</span>`);
    CONFIG_CATEGORIES.forEach(cat => {
        menuContainer.append(`<span class="category-item" onclick="filterCategory('${cat}', this)">${cat}</span>`);
    });
    buildList('전체');
}

function buildList(targetCategory) {
    const listContainer = $('#list-container');
    listContainer.empty();
    const keyword = $('#search-input').val().toLowerCase();
    CONFIG_ARTICLES.forEach((item, index) => {
        const matchCategory = (targetCategory === '전체' || item.category === targetCategory);
        const matchKeyword = item.title.toLowerCase().includes(keyword);
        if (matchCategory && matchKeyword) {
            const html = `
                <div class="box_contents">
                    <a href="#" class="link_title" onclick="openArticle(${index}); return false;">
                        <div class="title_post">${item.title}</div>
                        <div class="info_post">${item.date} · ${item.category}</div>
                    </a>
                </div>
            `;
            listContainer.append(html);
        }
    });
}

function filterCategory(categoryName, element) {
    $('.category-item').removeClass('active');
    $(element).addClass('active');
    $('#list-container').fadeOut(250, function() { buildList(categoryName); $(this).fadeIn(350); });
}

function openArticle(index) {
    const item = CONFIG_ARTICLES[index];
    $('#article-title').text(item.title);
    $('#article-date').text(item.category + " · " + item.date);
    $.ajax({
        url: 'category/txt/' + item.id + '.html', // 카테고리/txt 폴더로 경로 변경
        dataType: 'html',
        success: function(data) { $('#article-content').html(data); changeView('article'); },
        error: function() { $('#article-content').html('<p>글을 불러오는데 실패했습니다.</p>'); changeView('article'); }
    });
}

// ==========================================
// 로그인 관련 함수들
// ==========================================
function openLoginModal() { $("#login-modal").css("display", "flex").hide().fadeIn(250); }
function closeLoginModal() { $("#login-modal").fadeOut(200); $("#login-id").val(""); $("#login-pass").val(""); }

async function handleLogin() {
    const inputId = $("#login-id").val().trim();
    const inputPw = $("#login-pass").val();
    if (inputId !== "usagiarchiving") { alert("승인되지 않은 계정입니다."); return; }
    if (!supabase) return;

    try {
        const emailFormat = inputId + "@gmail.com";
        const { data, error } = await supabase.auth.signInWithPassword({ email: emailFormat, password: inputPw });
        if (error) {
            alert("비밀번호가 올바르지 않습니다.");
        } else {
            if (data.user && data.user.id === ADMIN_UID) {
                closeLoginModal();
                updateAuthUI(true);
            } else {
                alert("권한이 없는 계정입니다.");
                await supabase.auth.signOut();
            }
        }
    } catch (e) { alert("로그인 중 에러가 발생했습니다."); }
}

async function handleLogout() {
    if (!supabase) return;
    const confirmLogout = confirm("로그아웃 하시겠습니까?");
    if (!confirmLogout) return;
    try {
        await supabase.auth.signOut();
        updateAuthUI(false);
        loadExternalPage('home', 'category/home.html'); 
    } catch (e) { console.error(e); }
}

async function checkUserSession() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user && session.user.id === ADMIN_UID) {
        updateAuthUI(true);
    } else {
        updateAuthUI(false);
    }
}

function updateAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        $("#btn-login").hide(); $("#btn-logout").fadeIn(200);
        $("body").addClass("admin-mode"); 
    } else {
        $("#btn-logout").hide(); $("#btn-login").fadeIn(200);
        $("body").removeClass("admin-mode");
    }
}
