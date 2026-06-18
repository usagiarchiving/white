/* 파일명: category/record/record.js */

// ==========================================================================
// 1. 데이터베이스 및 API 키 세팅
// ==========================================================================
var RECORD_URL = 'https://yjjxlklzgcfwwcunmrht.supabase.co';
var RECORD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlqanhsa2x6Z2Nmd3djdW5tcmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4MDU2NjgsImV4cCI6MjA5NzM4MTY2OH0.NYZ6zJZS0zHPqBde9plZD1IK7GZyk07F9jEF7wI55Y8';
var recordSupabase = window.supabase.createClient(RECORD_URL, RECORD_KEY);

const TMDB_API_KEY = 'd6224997a8f1d896b0244b268bcefd54'; 
const KAKAO_REST_KEY = '261889b87c5bf523ddd8846c0c45ec2e';

var recordSelectedFile = null; // 수동 업로드 이미지 보관용

// ==========================================================================
// 2. 탭 메뉴 스위칭 로직
// ==========================================================================
window.switchRecordTab = function(tabName, btn) {
    document.querySelectorAll('.record-tab-content').forEach(function(el) {
        el.classList.remove('active');
    });
    document.getElementById('record-tab-' + tabName).classList.add('active');
    
    document.querySelectorAll('.record-bottom-nav .nav-btn').forEach(function(el) {
        el.classList.remove('active');
    });
    btn.classList.add('active');
};

// ==========================================================================
// 3. 글쓰기 팝업(모달) 제어 로직
// ==========================================================================
function setRecordDefaultDate() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('modal-date-picker').value = `${yyyy}-${mm}-${dd}`;
}

document.getElementById('btn-add-record').addEventListener('click', function() {
    document.getElementById('modal-title').value = '';
    document.getElementById('modal-release-year').value = '';
    document.getElementById('modal-creator').value = '';
    document.getElementById('modal-nth').value = '';
    document.getElementById('modal-oneliner').value = '';
    document.getElementById('modal-rating').value = '';
    document.getElementById('modal-content').innerHTML = '';
    document.getElementById('modal-is-main').checked = false;
    document.getElementById('record-cover-url').value = '';
    removeRecordPreview();
    setRecordDefaultDate();

    document.getElementById('record-lightbox').style.display = 'flex';
});

window.closeRecordModal = function() {
    document.getElementById('record-lightbox').style.display = 'none';
};

// ==========================================================================
// 4. 수동 이미지 업로드 미리보기 로직
// ==========================================================================
document.getElementById('record-file-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    recordSelectedFile = file;
    var reader = new FileReader();
    reader.onload = function(event) {
        document.getElementById('record-image-preview').src = event.target.result;
        document.getElementById('record-preview-wrap').style.display = 'block';
    }
    reader.readAsDataURL(file);
});

window.removeRecordPreview = function() {
    recordSelectedFile = null;
    document.getElementById('record-file-input').value = '';
    document.getElementById('record-cover-url').value = ''; 
    document.getElementById('record-preview-wrap').style.display = 'none';
    document.getElementById('record-image-preview').src = '';
};

// ==========================================================================
// 5. Open API 연동 로직 (TMDB & Kakao 자동 검색)
// ==========================================================================
document.getElementById('btn-api-search').addEventListener('click', function(e) {
    e.preventDefault();
    var category = document.getElementById('modal-category').value;
    
    if (!['movie', 'drama', 'book'].includes(category)) {
        alert("현재 자동 불러오기는 '영화, 드라마, 책' 카테고리만 지원합니다. 직접 입력해주세요!");
        return;
    }
    
    document.getElementById('api-search-input').value = document.getElementById('modal-title').value; 
    document.getElementById('api-search-results').innerHTML = '<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 20px;">엔터키를 눌러 검색하세요.</p>';
    document.getElementById('api-search-modal').style.display = 'flex';
    document.getElementById('api-search-input').focus();
});

document.getElementById('api-search-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        executeApiSearch();
    }
});

async function executeApiSearch() {
    var query = document.getElementById('api-search-input').value.trim();
    if (!query) return;
    
    var category = document.getElementById('modal-category').value;
    var resultsContainer = document.getElementById('api-search-results');
    resultsContainer.innerHTML = '<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 20px;">검색 중...</p>';
    
    try {
        var results = [];
        
        if (category === 'movie' || category === 'drama') {
            // [TMDB 검색 엔진]
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
            // [카카오 책 검색 엔진]
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
                document.getElementById('modal-title').value = item.title;
                document.getElementById('modal-release-year').value = item.year;
                if(item.creator !== 'TMDB 정보') document.getElementById('modal-creator').value = item.creator;
                
                if (item.poster) {
                    document.getElementById('record-cover-url').value = item.poster;
                    document.getElementById('record-image-preview').src = item.poster;
                    document.getElementById('record-preview-wrap').style.display = 'block';
                }
                
                document.getElementById('api-search-modal').style.display = 'none'; 
            };
            resultsContainer.appendChild(div);
        });

    } catch (error) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #ff3b30; font-size: 11px; margin-top: 20px;">검색 중 오류가 발생했습니다.</p>';
    }
}

// ==========================================================================
// 6. DB 저장 로직 (껍데기 - 테스트 완료 후 연결 예정)
// ==========================================================================
window.saveRecordPost = async function() {
    alert("API 검색 테스트 중입니다! 잘 작동하는지 확인해 주시면, 바로 DB 저장 및 캘린더 렌더링 로직을 연결해 드리겠습니다.");
};
