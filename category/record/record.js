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
window.recordCurrentDate = new Date(); // 캘린더/통계 월 이동용

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
// 3. 플로팅 툴바 및 글쓰기 팝업 로직
// ==========================================================================
window.checkRecordSelection = function() {
    var selection = window.getSelection();
    var toolbar = document.getElementById('record-floating-toolbar');
    if (!toolbar) return;
    
    if (selection.rangeCount > 0 && !selection.isCollapsed) {
        var node = selection.anchorNode;
        var isInsideEditor = false;
        
        while (node != null) {
            if (node.id === 'modal-content') { isInsideEditor = true; break; }
            node = node.parentNode;
        }
        
        if (isInsideEditor) {
            var range = selection.getRangeAt(0);
            var rect = range.getBoundingClientRect();
            toolbar.style.display = 'flex';
            
            var top = rect.top + window.scrollY - toolbar.offsetHeight - 8;
            var left = rect.left + window.scrollX + (rect.width / 2) - (toolbar.offsetWidth / 2);
            
            if (top < window.scrollY) top = rect.bottom + window.scrollY + 8; 
            if (left < 10) left = 10;
            
            toolbar.style.top = top + 'px'; 
            toolbar.style.left = left + 'px';
        } else { 
            toolbar.style.display = 'none'; 
        }
    } else { 
        toolbar.style.display = 'none'; 
    }
};

document.addEventListener('selectionchange', window.checkRecordSelection);
document.addEventListener('mouseup', window.checkRecordSelection);
document.addEventListener('touchend', window.checkRecordSelection);

window.formatRecord = function(command, value = null) {
    document.execCommand(command, false, value);
    window.checkRecordSelection();
    $('#modal-content').focus();
};

window.setRecordDefaultDate = function() {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    $('#modal-date-picker').val(`${yyyy}-${mm}-${dd}`);
};

window.openRecordModal = function(prefill = false) {
    if(!prefill) {
        $('#modal-title').val('');
        $('#modal-release-year').val('');
        $('#modal-creator').val('');
        $('#modal-tags').val('');
        $('#modal-author').val('김민정');
        $('#modal-category').val('movie');
        $('#record-cover-url').val('');
        window.removeRecordPreview();
    }
    
    $('#modal-content').html('');
    $('#modal-rating').val('0'); // 🚨 열릴 때 별점 데이터 0으로 초기화
    $('#modal-is-main').prop('checked', false);
    window.updateStarUI(0);
    window.setRecordDefaultDate();
    $('#record-lightbox').css('display', 'flex');
};

window.closeRecordModal = function() {
    $('#record-lightbox').css('display', 'none');
};

// ==========================================================================
// 4. 별점 (0.5 단위) 인터랙티브 로직 (🚨 클릭 시 완벽 고정)
// ==========================================================================
// 마우스를 올릴 때 (미리보기)
$(document).off('mousemove', '.star-icon').on('mousemove', '.star-icon', function(e) {
    var rect = this.getBoundingClientRect();
    var val = parseFloat($(this).attr('data-idx'));
    var isHalf = (e.clientX - rect.left) < (rect.width / 2);
    window.updateStarUI(isHalf ? val - 0.5 : val);
});

// 🚨 마우스 클릭 시 (점수 확정 & 숨겨진 input에 저장)
$(document).off('click', '.star-icon').on('click', '.star-icon', function(e) {
    var rect = this.getBoundingClientRect();
    var val = parseFloat($(this).attr('data-idx'));
    var isHalf = (e.clientX - rect.left) < (rect.width / 2);
    var finalRating = isHalf ? val - 0.5 : val;
    $('#modal-rating').val(finalRating); 
    window.updateStarUI(finalRating);
});

// 마우스가 별 영역을 벗어나면 (확정된 점수로 복구)
$(document).off('mouseleave', '#star-rating-ui').on('mouseleave', '#star-rating-ui', function() {
    var currentRating = parseFloat($('#modal-rating').val()) || 0;
    window.updateStarUI(currentRating);
});

// 별 UI 렌더링 함수
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
                
                // 감독 정보 2차 검색
                if (category === 'movie' || category === 'drama') {
                    $('#modal-creator').val('감독 정보 로딩 중...');
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
// 7. DB 저장, N회차 엔진 및 3대 렌더러(리스트, 캘린더, 통계)
// ==========================================================================
window.saveRecordPost = async function() {
    var btn = $('#btn-save-record');
    btn.css('opacity', '0.3').prop('disabled', true);
    
    try {
        // 🚨 [절대 방어막 1] 연도 필드 (어떤 텍스트나 오류가 와도 NaN을 원천 차단)
        // HTML ID가 modal-year 이든 modal-release-year 이든 모두 알아서 찾아냅니다.
        var yearInput = $('#modal-release-year').length ? $('#modal-release-year').val() : $('#modal-year').val();
        var rawYear = yearInput ? yearInput.toString().trim() : "";
        var parsedYear = parseInt(rawYear, 10);
        var safeYear = isNaN(parsedYear) ? null : parsedYear; // 숫자가 아니면 무조건 null
        
        // 🚨 [절대 방어막 2] 별점 필드
        var rawRating = parseFloat($('#modal-rating').val());
        var safeRating = isNaN(rawRating) || rawRating === 0 ? null : rawRating;

        // 제목만 적어도 나머지는 안전하게 null 처리되어 완벽히 전송됩니다.
        var dataObj = {
            category: $('#modal-category').val(),
            title: $('#modal-title').val() ? $('#modal-title').val().trim() : "",
            release_year: safeYear, 
            creator: $('#modal-creator').val() ? $('#modal-creator').val().trim() : null,
            tags: $('#modal-tags').val() ? $('#modal-tags').val().trim() : null,
            author: $('#modal-author').val() ? $('#modal-author').val().trim() : null,
            content: $('#modal-content').html() ? $('#modal-content').html().trim() : null,
            rating: safeRating, 
            is_main: $('#modal-is-main').is(':checked'),
            created_at: $('#modal-date-picker').val() ? $('#modal-date-picker').val() + 'T12:00:00+09:00' : new Date().toISOString(), 
            cover_url: $('#record-cover-url').val() ? $('#record-cover-url').val().trim() : null
        };

        if (!dataObj.title) { 
            alert("Title을 입력해주세요."); 
            throw new Error("Title is empty"); 
        }

        // 이미지 업로드 로직
        if (window.recordSelectedFile) {
            var file = window.recordSelectedFile;
            var fileExt = file.name.split('.').pop();
            var fileName = 'rec_' + new Date().getTime() + '.' + fileExt;
            var { data: uploadData, error: uploadError } = await window.recordSupabase.storage.from('images').upload('record/' + fileName, file);
            if (uploadError) throw uploadError;
            var { data: publicUrlData } = window.recordSupabase.storage.from('images').getPublicUrl('record/' + fileName);
            dataObj.cover_url = publicUrlData.publicUrl;
        }

        // DB 최종 전송
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

window.loadRecordData = async function() {
    var { data, error } = await window.recordSupabase.from('record').select('*').order('created_at', { ascending: true });
    if (error) { console.error(error); return; }
    
    // N회차 자동 계산 로직 (과거 날짜부터 누적 계산)
    var titleCount = {};
    data.forEach(item => {
        if(item.title) {
            var safeTitle = item.title.trim().toLowerCase();
            titleCount[safeTitle] = (titleCount[safeTitle] || 0) + 1;
            item.calculated_nth = titleCount[safeTitle]; 
        }
    });

    // 화면용 최신순(내림차순) 정렬
    data.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    window.recordData = data;
    
    window.renderRecordList();
    window.renderRecordCalendar();
    window.renderRecordStats();
};

window.renderRecordList = function() {
    var container = $('#record-list-container');
    if (window.recordData.length === 0) {
        container.html('<p style="text-align: center; color: var(--sub-color); font-size: 11px; margin-top: 30px; opacity: 0.6;">아직 기록이 없습니다.</p>');
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
                    <button onclick="addNthRecord('${safeTitle}', '${safeCreator}', '${safeCat}', '${safeCover}')" title="N회차 추가" style="background: var(--input-bg); border: 1px solid var(--divider-bg); border-radius: 12px; padding: 4px 10px; font-family: 'Noto Serif KR', serif; font-size: 10px; color: var(--sub-color); cursor: pointer; transition: 0.2s;"><i class="xi-plus"></i> Add</button>
                </div>
            </div>
        </div>`;
    });
    container.html(html);
};

// [캘린더 뷰 렌더링 엔진]
window.renderRecordCalendar = function() {
    var container = $('#record-cal-container');
    var y = window.recordCurrentDate.getFullYear();
    var m = window.recordCurrentDate.getMonth();
    var firstDay = new Date(y, m, 1).getDay();
    var lastDate = new Date(y, m + 1, 0).getDate();
    
    var html = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 15px; color: var(--main-color); font-weight: 600;">
            <i class="xi-angle-left" style="cursor:pointer;" onclick="changeRecordMonth(-1)"></i>
            <span>${y}년 ${m+1}월 아카이브</span>
            <i class="xi-angle-right" style="cursor:pointer;" onclick="changeRecordMonth(1)"></i>
        </div>`;
        
    html += `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center;">`;
    var days = ['일', '월', '화', '수', '목', '금', '토'];
    days.forEach(d => { html += `<div style="font-size: 10px; color: var(--sub-color); padding-bottom: 5px;">${d}</div>`; });
    
    for(var i=0; i<firstDay; i++) { html += `<div></div>`; }
    for(var i=1; i<=lastDate; i++) {
        var dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        var records = window.recordData.filter(r => r.created_at.startsWith(dateStr));
        var mainRecord = records.find(r => r.is_main) || records[0]; 
        
        var cellContent = `<div style="font-size: 10px; color: var(--sub-color); position: absolute; top: 2px; left: 4px; z-index: 2; text-shadow: 0 0 2px rgba(255,255,255,0.8);">${i}</div>`;
        if (mainRecord && mainRecord.cover_url) {
            cellContent += `<img src="${mainRecord.cover_url}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.95; border-radius: 4px;">`;
        } else if (mainRecord) {
            cellContent += `<div style="width: 100%; height: 100%; background: var(--rec-${mainRecord.category}); opacity: 0.5; border-radius: 4px;"></div>`;
        }

        html += `<div style="position: relative; aspect-ratio: 3/4; border: 1px solid var(--divider-bg); border-radius: 4px; overflow: hidden; background: var(--dropdown-bg);">
            ${cellContent}
        </div>`;
    }
    html += `</div>`;
    container.html(html);
};

// [통계 뷰 렌더링 엔진]
window.renderRecordStats = function() {
    var container = $('#record-stats-container');
    var y = window.recordCurrentDate.getFullYear();
    var m = window.recordCurrentDate.getMonth();
    var firstDay = new Date(y, m, 1).getDay();
    var lastDate = new Date(y, m + 1, 0).getDate();
    
    var html = `
        <div style="display: flex; justify-content: center; align-items: center; gap: 15px; margin-bottom: 15px; color: var(--main-color); font-weight: 600;">
            <i class="xi-angle-left" style="cursor:pointer;" onclick="changeRecordMonth(-1)"></i>
            <span>${y}년 ${m+1}월 통계</span>
            <i class="xi-angle-right" style="cursor:pointer;" onclick="changeRecordMonth(1)"></i>
        </div>`;
        
    html += `<div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center;">`;
    var days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(d => { html += `<div style="font-size: 10px; color: var(--sub-color);">${d}</div>`; });
    
    for(var i=0; i<firstDay; i++) { html += `<div></div>`; }
    for(var i=1; i<=lastDate; i++) {
        var dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        var records = window.recordData.filter(r => r.created_at.startsWith(dateStr));
        var dotsHtml = '';
        records.forEach(r => {
            dotsHtml += `<div style="width: 6px; height: 6px; border-radius: 50%; background: var(--rec-${r.category}); display: inline-block; margin: 1px;"></div>`;
        });
        
        html += `<div style="font-size: 11px; padding: 5px 0; color: var(--main-color); border: 1px solid var(--divider-bg); border-radius: 4px; min-height: 40px; display: flex; flex-direction: column; align-items: center; background: var(--dropdown-bg);">
            <div>${i}</div>
            <div style="margin-top: 2px; display: flex; flex-wrap: wrap; justify-content: center; max-width: 80%;">${dotsHtml}</div>
        </div>`;
    }
    html += `</div>`;
    container.html(html);
};

// 월 이동 컨트롤러
window.changeRecordMonth = function(delta) {
    window.recordCurrentDate.setMonth(window.recordCurrentDate.getMonth() + delta);
    window.renderRecordCalendar();
    window.renderRecordStats();
};

// N회차 이어쓰기 트리거
window.addNthRecord = function(title, creator, category, cover) {
    window.openRecordModal(true); 
    $('#modal-title').val(title);
    $('#modal-creator').val(creator);
    $('#modal-category').val(category);
    $('#modal-tags').val(''); 
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
