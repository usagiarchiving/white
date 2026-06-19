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
window.recordData = []; 

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
// 3. 글쓰기 팝업 및 에디터 툴바 로직
// ==========================================================================
window.setRecordDefaultDate = function() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    $('#modal-date-picker').val(`${yyyy}-${mm}-${dd}`);
}

// 🚨 에디터 툴바 (구분선, 굵게, 포인트 색상)
window.formatRecord = function(command, value = null) {
    document.execCommand(command, false, value);
    $('#modal-content').focus();
};

window.openRecordModal = function(prefill = null) {
    // prefill(미리채우기) 데이터가 없으면 완전 초기화
    if(!prefill) {
        $('#modal-title').val('');
        $('#modal-release-year').val('');
        $('#modal-creator').val('');
        $('#modal-tags').val('');
        $('#modal-author').val('김민정');
        $('#record-cover-url').val('');
        window.removeRecordPreview();
    }
    
    // 내용 및 별점 초기화
    $('#modal-content').html('');
    $('#modal-rating').val('0');
    $('#modal-is-main').prop('checked', false);
    window.updateStarUI(0);
    window.setRecordDefaultDate();

    $('#record-lightbox').css('display', 'flex');
};

window.closeRecordModal = function() {
    $('#record-lightbox').css('display', 'none');
};

// ==========================================================================
// 4. 별점 (0.5 단위) 인터랙티브 로직
// ==========================================================================
// 마우스가 별 위에서 움직일 때 (왼쪽 절반이면 0.5, 오른쪽 절반이면 1)
$(document).off('mousemove', '.star-icon').on('mousemove', '.star-icon', function(e) {
    var rect = this.getBoundingClientRect();
    var val = parseFloat($(this).attr('data-idx'));
    var isHalf = (e.clientX - rect.left) < (rect.width / 2);
    var hoverRating = isHalf ? val - 0.5 : val;
    window.updateStarUI(hoverRating);
});

// 마우스를 클릭해서 별점 확정
$(document).off('click', '.star-icon').on('click', '.star-icon', function(e) {
    var rect = this.getBoundingClientRect();
    var val = parseFloat($(this).attr('data-idx'));
    var isHalf = (e.clientX - rect.left) < (rect.width / 2);
    var finalRating = isHalf ? val - 0.5 : val;
    $('#modal-rating').val(finalRating); // 숨겨진 input에 값 저장
});

// 마우스가 별점 영역을 벗어나면 확정된 별점으로 되돌아감
$(document).off('mouseleave', '#star-rating-ui').on('mouseleave', '#star-rating-ui', function() {
    var currentRating = parseFloat($('#modal-rating').val()) || 0;
    window.updateStarUI(currentRating);
});

// 별 모양(아이콘)을 채워주는 함수
window.updateStarUI = function(rating) {
    $('.star-icon').each(function() {
        var idx = parseFloat($(this).attr('data-idx'));
        if (rating >= idx) {
            $(this).attr('class', 'xi-star star-icon').css('color', 'var(--point-color)');
        } else if (rating >= idx - 0.5) {
            $(this).attr('class', 'xi-star-half-o star-icon').css('color', 'var(--point-color)');
        } else {
            $(this).attr('class', 'xi-star-o star-icon').css('color', 'var(--divider-bg)');
        }
    });
};

// ==========================================================================
// 5. 수동 이미지 업로드
// ==========================================================================
window.handleRecordImageUpload = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    
    window.recordSelectedFile = file;
    var reader = new FileReader();
    reader.onload = function(event) {
        $('#record-image-preview').attr('src', event.target.result).show();
        $('#record-image-placeholder').hide();
        $('#btn-remove-preview').css('display', 'flex');
    }
    reader.readAsDataURL(file);
};

window.removeRecordPreview = function() {
    window.recordSelectedFile = null;
    $('#record-file-input').val('');
    $('#record-cover-url').val(''); 
    $('#record-image-preview').attr('src', '').hide();
    $('#record-image-placeholder').show();
    $('#btn-remove-preview').hide();
};

// ==========================================================================
// 6. Open API 연동 로직 (TMDB & Kakao)
// ==========================================================================
window.openApiSearchModal = function() {
    var category = $('#modal-category').val();
    if (!['movie', 'drama', 'book'].includes(category)) {
        alert("자동 불러오기는 '영화, 드라마, 책'만 지원합니다."); return;
    }
    $('#api-search-input').val($('#modal-title').val()); 
    $('#api-search-results').html('<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 20px;">엔터키를 눌러 검색하세요.</p>');
    $('#api-search-modal').css('display', 'flex');
    setTimeout(() => document.getElementById('api-search-input').focus(), 100);
};

window.handleApiSearchEnter = function(e) {
    if (e.key === 'Enter') { e.preventDefault(); window.executeApiSearch(); }
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
                id: item.id, 
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
            resultsContainer.innerHTML = '<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 20px;">결과가 없습니다.</p>'; return;
        }

        resultsContainer.innerHTML = ''; 
        results.forEach(item => {
            var div = document.createElement('div');
            div.style.cssText = 'display: flex; gap: 12px; align-items: center; padding: 8px; border-radius: 6px; cursor: pointer; transition: background 0.2s;';
            div.onmouseover = function() { this.style.background = 'var(--divider-bg)'; };
            div.onmouseout = function() { this.style.background = 'transparent'; };
            
            var imgHtml = item.poster 
                ? `<img src="${item.poster}" style="width: 40px; height: 58px; object-fit: cover; border-radius: 4px; border: 1px solid var(--divider-bg);">` 
                : `<div style="width: 40px; height: 58px; background: var(--divider-bg); border-radius: 4px; display: flex; align-items:center; justify-content:center; font-size: 10px; color:var(--sub-color);">No</div>`;

            div.innerHTML = `
                ${imgHtml}
                <div style="flex: 1; overflow: hidden;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--main-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title}</div>
                    <div style="font-size: 11px; color: var(--sub-color); margin-top: 2px;">${item.year} | ${item.creator}</div>
                </div>
            `;
            
            div.onclick = async function() {
                $('#modal-title').val(item.title);
                $('#modal-release-year').val(item.year);
                
                if (category === 'movie' || category === 'drama') {
                    $('#modal-creator').val('감독 정보 불러오는 중...');
                    try {
                        var detailType = category === 'movie' ? 'movie' : 'tv';
                        var detailRes = await fetch(`https://api.themoviedb.org/3/${detailType}/${item.id}?api_key=${TMDB_API_KEY}&language=ko-KR&append_to_response=credits`);
                        var detailData = await detailRes.json();
                        var director = '';
                        if (category === 'movie') {
                            var dirObj = (detailData.credits?.crew || []).find(c => c.job === 'Director');
                            if (dirObj) director = dirObj.name;
                        } else {
                            var creatorObj = detailData.created_by || [];
                            if (creatorObj.length > 0) director = creatorObj[0].name;
                        }
                        $('#modal-creator').val(director || '');
                    } catch(e) { $('#modal-creator').val(''); }
                } else if (item.creator !== 'TMDB 정보') {
                    $('#modal-creator').val(item.creator);
                }
                
                if (item.poster) {
                    $('#record-cover-url').val(item.poster);
                    $('#record-image-preview').attr('src', item.poster).show();
                    $('#record-image-placeholder').hide();
                    $('#btn-remove-preview').css('display', 'flex');
                }
                $('#api-search-modal').css('display', 'none'); 
            };
            resultsContainer.appendChild(div);
        });
    } catch (error) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #ff3b30; font-size: 11px; margin-top: 20px;">오류가 발생했습니다.</p>';
    }
};

// ==========================================================================
// 7. DB 저장 및 불러오기 (N회차 자동계산 로직 포함)
// ==========================================================================
window.saveRecordPost = async function() {
    var btn = $('#btn-save-record');
    btn.css('opacity', '0.3').prop('disabled', true);
    
    try {
        var dataObj = {
            category: $('#modal-category').val(),
            title: $('#modal-title').val().trim(),
            release_year: $('#modal-release-year').val().trim(),
            creator: $('#modal-creator').val().trim(),
            tags: $('#modal-tags').val().trim(),          // 🚨 태그 추가
            author: $('#modal-author').val().trim(),      // 🚨 작성자 추가
            content: $('#modal-content').html(),
            rating: parseFloat($('#modal-rating').val()) || 0, // 🚨 0.5 별점 연동
            is_main: $('#modal-is-main').is(':checked'),
            created_at: $('#modal-date-picker').val() + 'T12:00:00+09:00', 
            cover_url: $('#record-cover-url').val()
        };

        if (!dataObj.title) { alert("작품명을 입력해주세요."); throw new Error("Title is empty"); }

        if (window.recordSelectedFile) {
            var file = window.recordSelectedFile;
            var fileExt = file.name.split('.').pop();
            var fileName = 'rec_' + new Date().getTime() + '.' + fileExt;
            var { data: uploadData, error: uploadError } = await window.recordSupabase.storage.from('images').upload('record/' + fileName, file);
            if (uploadError) throw uploadError;
            var { data: publicUrlData } = window.recordSupabase.storage.from('images').getPublicUrl('record/' + fileName);
            dataObj.cover_url = publicUrlData.publicUrl;
        }

        var { error } = await window.recordSupabase.from('record').insert([dataObj]);
        if (error) throw error;
        
        window.closeRecordModal();
        window.loadRecordData(); 
    } catch (e) {
        if(e.message !== "Title is empty") alert("저장 실패: " + e.message);
    } finally {
        btn.css('opacity', '1').prop('disabled', false);
    }
};

// DB에서 불러오기 및 N회차 자동 계산
window.loadRecordData = async function() {
    var { data, error } = await window.recordSupabase.from('record').select('*').order('created_at', { ascending: true });
    if (error) { console.error(error); return; }
    
    // 🚨 핵심: 날짜순으로 과거부터 돌면서 이름(Title)이 같으면 1회차, 2회차 뱃지 누적
    var titleCount = {};
    data.forEach(item => {
        if(item.title) {
            var safeTitle = item.title.trim().toLowerCase();
            titleCount[safeTitle] = (titleCount[safeTitle] || 0) + 1;
            item.calculated_nth = titleCount[safeTitle]; // 동적 N회차 부여
        }
    });

    // 화면에 보여줄 때는 최신순(내림차순)으로 다시 뒤집음
    data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    window.recordData = data;
    
    renderRecordList();
    // 캘린더와 통계는 다음 단계에서 조율 후 추가
};

window.renderRecordList = function() {
    var container = $('#record-list-container');
    if (window.recordData.length === 0) {
        container.html('<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 30px; opacity: 0.6;">아직 기록이 없습니다. 연필을 눌러 추가해보세요!</p>');
        return;
    }
    
    var html = '';
    window.recordData.forEach(item => {
        var colorVar = `var(--rec-${item.category})`;
        var starStr = item.rating > 0 ? `<i class="xi-star" style="color:var(--point-color);"></i> ${item.rating}` : '';
        var nthStr = item.calculated_nth > 1 ? `<span style="font-size: 9px; padding: 2px 6px; background: var(--divider-bg); border-radius: 4px; font-weight: bold; color: var(--main-color); margin-left: 6px;">${item.calculated_nth}회차</span>` : '';
        var tagsStr = item.tags ? `<span style="color: var(--point-color); font-size: 11px;">${item.tags}</span>` : '';
        
        var imgHtml = item.cover_url 
            ? `<img src="${item.cover_url}" style="width: 75px; height: 110px; object-fit: cover; border-radius: 6px; border: 1px solid var(--divider-bg); flex-shrink: 0;">`
            : `<div style="width: 75px; height: 110px; background: var(--divider-bg); border-radius: 6px; display: flex; align-items:center; justify-content:center; flex-shrink: 0;"><i class="xi-image-o" style="color:var(--sub-color); opacity:0.5;"></i></div>`;
            
        // 🚨 N회차 이어쓰기용 데이터 문자열화 방어막 (따옴표 에러 방지)
        var safeTitle = item.title ? item.title.replace(/'/g, "\\'").replace(/"/g, "&quot;") : '';
        var safeCreator = item.creator ? item.creator.replace(/'/g, "\\'").replace(/"/g, "&quot;") : '';
        var safeCat = item.category;
        var safeCover = item.cover_url ? item.cover_url.replace(/'/g, "\\'") : '';
            
        html += `
        <div style="display: flex; gap: 15px; background: transparent; padding: 15px 0; border-bottom: 1px solid var(--divider-bg);">
            ${imgHtml}
            <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;">
                
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 9px; padding: 2px 6px; background: ${colorVar}; color: #333; border-radius: 10px; font-weight: 600;">${item.category}</span>
                        <span style="font-size: 11px; color: var(--sub-color);">${item.release_year || ''}</span>
                    </div>
                    <div style="font-size: 11px; color: var(--sub-color);">${item.author || ''}</div>
                </div>
                
                <div style="font-size: 14px; font-weight: 600; color: var(--main-color); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${item.title} ${nthStr}
                </div>
                <div style="font-size: 11px; color: var(--sub-color); margin-bottom: 8px;">${item.creator || ''}</div>
                
                ${tagsStr}
                
                <div style="font-size: 11px; color: var(--sub-color); margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div style="font-weight: bold;">${starStr}</div>
                    
                    <!-- 🚨 이어쓰기 (N회차 추가) 버튼 -->
                    <button onclick="addNthRecord('${safeTitle}', '${safeCreator}', '${safeCat}', '${safeCover}')" title="이 작품 N회차 기록하기" style="background: var(--input-bg); border: 1px solid var(--divider-bg); border-radius: 12px; padding: 4px 10px; font-family: 'Noto Serif KR', serif; font-size: 10px; color: var(--sub-color); cursor: pointer; transition: 0.2s;"><i class="xi-plus"></i> N회차 추가</button>
                </div>
            </div>
        </div>`;
    });
    container.html(html);
};

// 🚨 N회차 "이어쓰기" 버튼을 눌렀을 때 실행되는 함수
window.addNthRecord = function(title, creator, category, cover) {
    window.openRecordModal(true); // prefill=true 로 열어서 내용이 날아가지 않게 함
    
    $('#modal-title').val(title);
    $('#modal-creator').val(creator);
    $('#modal-category').val(category);
    $('#modal-tags').val(''); // 태그와 본문은 비워줌
    $('#modal-content').html('');
    
    if(cover) {
        $('#record-cover-url').val(cover);
        $('#record-image-preview').attr('src', cover).show();
        $('#record-image-placeholder').hide();
        $('#btn-remove-preview').css('display', 'flex');
    }
};

$(document).ready(function() {
    if (window.recordSupabase) {
        window.loadRecordData();
    }
});
