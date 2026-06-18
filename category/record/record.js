/* 파일명: category/record/record.js */

// ==========================================================================
// 1. 데이터베이스 및 API 키 세팅
// ==========================================================================
var RECORD_URL = 'https://yjjxlklzgcfwwcunmrht.supabase.co';
var RECORD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqanhsa2x6Z2Nmd3djdW5tcmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU2NjgsImV4cCI6MjA5NzM4MTY2OH0.NYZ6zJZS0zHPqBde9plZD1IK7GZyk07F9jEF7wI55Y8';

if (typeof window.supabase !== 'undefined') {
    window.recordSupabase = window.supabase.createClient(RECORD_URL, RECORD_KEY);
}

const TMDB_API_KEY = 'd6224997a8f1d896b0244b268bcefd54'; 
const KAKAO_REST_KEY = '261889b87c5bf523ddd8846c0c45ec2e';

window.recordSelectedFile = null;

// ==========================================================================
// 2. 탭 메뉴 스위칭 로직
// ==========================================================================
window.switchRecordTab = function(tabName, btn) {
    $('.record-tab-content').removeClass('active');
    $('#record-tab-' + tabName).addClass('active');
    
    $('.record-bottom-nav .nav-btn').removeClass('active');
    $(btn).addClass('active');
};

// ==========================================================================
// 3. 글쓰기 팝업(모달) 제어 로직 (🚨 전역 함수 처리 완료)
// ==========================================================================
window.setRecordDefaultDate = function() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    $('#modal-date-picker').val(`${yyyy}-${mm}-${dd}`);
}

window.openRecordModal = function() {
    $('#modal-title').val('');
    $('#modal-release-year').val('');
    $('#modal-creator').val('');
    $('#modal-nth').val('');
    $('#modal-oneliner').val('');
    $('#modal-rating').val('');
    $('#modal-content').html('');
    $('#modal-is-main').prop('checked', false);
    $('#record-cover-url').val('');
    
    window.removeRecordPreview();
    window.setRecordDefaultDate();

    $('#record-lightbox').css('display', 'flex');
};

window.closeRecordModal = function() {
    $('#record-lightbox').css('display', 'none');
};

// ==========================================================================
// 4. 수동 이미지 업로드 미리보기 로직 (🚨 전역 함수 처리 완료)
// ==========================================================================
window.handleRecordImageUpload = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    window.recordSelectedFile = file;
    var reader = new FileReader();
    reader.onload = function(event) {
        $('#record-image-preview').attr('src', event.target.result);
        $('#record-preview-wrap').show();
    }
    reader.readAsDataURL(file);
};

window.removeRecordPreview = function() {
    window.recordSelectedFile = null;
    $('#record-file-input').val('');
    $('#record-cover-url').val(''); 
    $('#record-preview-wrap').hide();
    $('#record-image-preview').attr('src', '');
};

// ==========================================================================
// 5. Open API 연동 로직 (🚨 전역 함수 처리 완료)
// ==========================================================================
window.openApiSearchModal = function() {
    var category = $('#modal-category').val();
    
    if (!['movie', 'drama', 'book'].includes(category)) {
        alert("현재 자동 불러오기는 '영화, 드라마, 책' 카테고리만 지원합니다. 직접 입력해주세요!");
        return;
    }
    
    $('#api-search-input').val($('#modal-title').val()); 
    $('#api-search-results').html('<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 20px;">엔터키를 눌러 검색하세요.</p>');
    $('#api-search-modal').css('display', 'flex');
    
    setTimeout(function() {
        document.getElementById('api-search-input').focus();
    }, 100);
};

window.handleApiSearchEnter = function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        window.executeApiSearch();
    }
};

window.executeApiSearch = async function() {
    var query = $('#api-search-input').val().trim();
    if (!query) return;
    
    var category = $('#modal-category').val();
    var resultsContainer = document.getElementById('api-search-results');
    resultsContainer.innerHTML = '<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 20px;">검색 중...</p>';
    
    try {
        var results = [];
        
        if (category === 'movie' || category === 'drama') {
            var type = category === 'movie' ? 'movie' : 'tv';
            var res = await fetch(`https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&language=ko-KR&query=${encodeURIComponent(query)}`);
            var data = await res.json();
            
            results = data.results.slice(0, 10).map(item => ({
                title: item.title || item.name,
                year: (item.release_date || item.first_air_date || '').substring(0, 4),
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '',
                creator: 'TMDB 정보' 
            }));
            
        } else if (category === 'book') {
            var res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=10`, {
                headers: { 'Authorization': `KakaoAK ${KAKAO_REST_KEY}` }
            });
            var data = await res.json();
            
            results = data.documents.map(item => ({
                title: item.title,
                year: item.datetime ? item.datetime.substring(0, 4) : '',
                poster: item.thumbnail,
                creator: item.authors.join(', ') 
            }));
        }

        if (results.length === 0) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 20px;">검색 결과가 없습니다.</p>';
            return;
        }

        resultsContainer.innerHTML = ''; 
        results.forEach(item => {
            var div = document.createElement('div');
            div.style.cssText = 'display: flex; gap: 12px; align-items: center; padding: 8px; border-radius: 6px; cursor: pointer; transition: background 0.2s;';
            div.onmouseover = function() { this.style.background = 'var(--divider-bg)'; };
            div.onmouseout = function() { this.style.background = 'transparent'; };
            
            var imgHtml = item.poster 
                ? `<img src="${item.poster}" style="width: 40px; height: 58px; object-fit: cover; border-radius: 4px; border: 1px solid var(--divider-bg);">` 
                : `<div style="width: 40px; height: 58px; background: var(--divider-bg); border-radius: 4px; display: flex; align-items:center; justify-content:center; font-size: 10px; color:var(--sub-color);">No Img</div>`;

            div.innerHTML = `
                ${imgHtml}
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--main-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</div>
                    <div style="font-size: 11px; color: var(--sub-color); margin-top: 2px;">${item.year} | ${item.creator}</div>
                </div>
            `;
            
            div.onclick = function() {
                $('#modal-title').val(item.title);
                $('#modal-release-year').val(item.year);
                if(item.creator !== 'TMDB 정보') $('#modal-creator').val(item.creator);
                
                if (item.poster) {
                    $('#record-cover-url').val(item.poster);
                    $('#record-image-preview').attr('src', item.poster);
                    $('#record-preview-wrap').show();
                }
                $('#api-search-modal').css('display', 'none'); 
            };
            resultsContainer.appendChild(div);
        });

    } catch (error) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #ff3b30; font-size: 11px; margin-top: 20px;">검색 중 오류가 발생했습니다.</p>';
    }
};

// ==========================================================================
// 6. DB 저장 로직
// ==========================================================================
window.saveRecordPost = async function() {
    alert("API 검색 기능과 팝업 작동이 모두 정상화되었습니다! 확인해주시면 DB 저장 로직을 추가하겠습니다.");
};
