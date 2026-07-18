/* 파일명: category/record/record.js */

// ==========================================================================
// 1. 데이터베이스 및 API 키 세팅 (기존 주소 및 키 보존)
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
window.selectedRecordRating = 0;       // 선택한 별점 보관용 글로벌 변수

// ==========================================================================
// 2. 초기화 및 데이터 로드
// ==========================================================================
window.initRecordPage = function() {
    window.loadRecordData();
    window.initRecordEvents();
    window.setDefaultRecordDate();
};

window.loadRecordData = async function() {
    try {
        const { data, error } = await window.recordSupabase
            .from('record')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        window.recordData = data || [];
        window.renderRecordFeed();
        window.renderRecordCalendar();
        window.renderRecordStats();
    } catch (error) {
        console.error("데이터 로드 실패:", error);
    }
};

// ==========================================================================
// 3. UI 상호작용 및 이벤트 제어
// ==========================================================================
window.initRecordEvents = function() {
    // 별점 마우스 호버 및 클릭 로직
    $('.star-icon').on('mouseover', function() {
        const idx = $(this).data('index');
        window.highlightStars(idx);
    }).on('mouseout', function() {
        window.highlightStars(window.selectedRecordRating);
    }).on('click', function() {
        window.selectedRecordRating = $(this).data('index');
        window.highlightStars(window.selectedRecordRating);
    });

    // 검색 모달 내 엔터키 검색 이벤트 연동
    $('#api-search-input').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            window.searchExternalAPI();
        }
    });
    
    // 메인화면 실시간 검색창 이벤트
    $('#record-search').on('input', function() {
        window.renderRecordFeed();
    });

    // 메인화면 카테고리 필터링 select 이벤트
    $('#record-category-filter').on('change', function() {
        window.renderRecordFeed();
    });
};

window.highlightStars = function(rating) {
    $('.star-icon').each(function() {
        const idx = $(this).data('index');
        if (idx <= rating) {
            $(this).removeClass('xi-star-o').addClass('xi-star').css('color', 'var(--point-color)');
        } else {
            $(this).removeClass('xi-star').addClass('xi-star-o').css('color', 'var(--sub-color)');
        }
    });
};

window.setDefaultRecordDate = function() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    $('#modal-date').val(`${yyyy}-${mm}-${dd}`);
};

// ==========================================================================
// 4. API 외부 검색 엔진 🚨 [수정: 카카오 책 검색 엔진 완벽 픽스]
// ==========================================================================
window.searchExternalAPI = async function() {
    const query = $('#api-search-input').val().trim();
    const category = $('#modal-category').val();
    const resultsContainer = $('#api-search-results');
    
    if (!query) return;
    resultsContainer.html('<p style="text-align:center; font-size:11px; color:var(--sub-color);">검색 중...</p>');

    if (category === 'movie' || category === 'drama') {
        // TMDB 영화/드라마 검색 엔진
        const type = category === 'movie' ? 'movie' : 'tv';
        const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=ko-KR`;
        
        $.ajax({
            url: url,
            type: 'GET',
            success: function(data) {
                resultsContainer.empty();
                if (!data.results || data.results.length === 0) {
                    resultsContainer.html('<p style="text-align:center; font-size:11px; color:var(--sub-color);">검색 결과가 없습니다.</p>');
                    return;
                }
                data.results.forEach(item => {
                    const title = item.title || item.name;
                    const date = item.release_date || item.first_air_date || '';
                    const year = date ? date.split('-')[0] : '';
                    const imgUrl = item.poster_path ? `https://image.tmdb.org/t/p/w200${item.poster_path}` : '';
                    
                    const itemHtml = `
                        <div class="api-result-item" onclick="window.selectApiItem('${title.replace(/'/g, "\\'")}', '${year}', '', '${imgUrl}')" style="display:flex; gap:10px; padding:8px; border-bottom:1px solid var(--divider-bg); cursor:pointer;">
                            ${imgUrl ? `<img src="${imgUrl}" style="width:40px; height:55px; object-fit:cover; border-radius:2px;">` : ''}
                            <div>
                                <div style="font-weight:600; color:var(--main-color); font-size:12px;">${title}</div>
                                <div style="font-size:11px; color:var(--sub-color);">${year}</div>
                            </div>
                        </div>`;
                    resultsContainer.append(itemHtml);
                });
            },
            error: function() {
                resultsContainer.html('<p style="text-align:center; font-size:11px; color:#ff3b30;">검색에 실패했습니다.</p>');
            }
        });
    } else if (category === 'book') {
        // 🚨 [수정 완료] 카카오 책 검색 연동 규격 맞춤 정밀 튜닝
        // 기존 TMDB용 data.results 반복문 구조에서 카카오 전용 data.documents 배열 구조로 완벽 교체
        $.ajax({
            url: 'https://dapi.kakao.com/v3/search/book',
            headers: { 'Authorization': 'KakaoAK ' + KAKAO_REST_KEY },
            type: 'GET',
            data: { query: query },
            success: function(data) {
                resultsContainer.empty();
                if (!data.documents || data.documents.length === 0) {
                    resultsContainer.html('<p style="text-align:center; font-size:11px; color:var(--sub-color);">검색 결과가 없습니다.</p>');
                    return;
                }
                data.documents.forEach(item => {
                    const title = item.title;
                    const authors = item.authors ? item.authors.join(', ') : '';
                    const year = item.datetime ? item.datetime.split('-')[0] : '';
                    const imgUrl = item.thumbnail || '';
                    
                    const itemHtml = `
                        <div class="api-result-item" onclick="window.selectApiItem('${title.replace(/'/g, "\\'")}', '${year}', '${authors.replace(/'/g, "\\'")}', '${imgUrl}')" style="display:flex; gap:10px; padding:8px; border-bottom:1px solid var(--divider-bg); cursor:pointer;">
                            ${imgUrl ? `<img src="${imgUrl}" style="width:40px; height:55px; object-fit:cover; border-radius:2px;">` : ''}
                            <div>
                                <div style="font-weight:600; color:var(--main-color); font-size:12px;">${title}</div>
                                <div style="font-size:11px; color:var(--sub-color);">${authors} | ${year}</div>
                            </div>
                        </div>`;
                    resultsContainer.append(itemHtml);
                });
            },
            error: function() {
                resultsContainer.html('<p style="text-align:center; font-size:11px; color:#ff3b30;">책 검색에 실패했습니다.</p>');
            }
        });
    } else {
        resultsContainer.html('<p style="text-align:center; font-size:11px; color:var(--sub-color);">이 카테고리는 외부 자동 검색을 지원하지 않습니다.</p>');
    }
};

window.selectApiItem = function(title, year, creator, coverUrl) {
    $('#modal-title').val(title);
    $('#modal-year').val(year);
    $('#modal-creator').val(creator);
    if(coverUrl) {
        $('#record-cover-url').val(coverUrl);
        $('#modal-cover-preview').html(`<img src="${coverUrl}" style="max-width:100px; max-height:140px; object-fit:cover; border-radius:2px; border:1px solid var(--divider-bg);">`);
    }
    $('#api-search-input').val('');
    $('#api-search-results').empty();
    window.closeApiSearchModal();
};

// ==========================================================================
// 5. 데이터 저장 엔진 🚨 [수정: 제목 제외 올패스 선택형 저장 패치]
// ==========================================================================
window.saveRecordData = async function() {
    const title = $('#modal-title').val().trim();
    if (!title) {
        alert('제목은 반드시 입력해야 합니다.');
        return;
    }

    // 🚨 [수정 핵심] 빈칸 전송 시 "" 문자열이 넘어가 int4, float8 컬럼과 부딪히던 400 에러 차단막 구축.
    // 사용자가 입력칸을 채우지 않았다면 완벽한 대수적 null 객체로 정제하여 Supabase에 적재합니다.
    const rawYear = $('#modal-year').val().trim();
    const release_year = rawYear === "" ? null : parseInt(rawYear, 10);
    const rating = window.selectedRecordRating === 0 ? null : parseFloat(window.selectedRecordRating);

    const recordId = $('#modal-record-id').val();
    
    const recordPayload = {
        category: $('#modal-category').val(),
        title: title,
        release_year: release_year, // 비어있을 시 null 처리되어 안전하게 통과 (선택)
        creator: $('#modal-creator').val().trim() || null,
        tags: $('#modal-tags').val().trim() || null,
        author: $('#modal-author').val().trim() || null,
        content: $('#modal-content').html().trim() || null,
        rating: rating,             // 비어있을 시 null 처리되어 안전하게 통과 (선택)
        is_main: $('#modal-is-main').is(':checked'),
        cover_url: $('#record-cover-url').val().trim() || null,
        created_at: new Date($('#modal-date').val()).toISOString()
    };

    try {
        $('.record-save-btn').prop('disabled', true);
        let response;
        
        if (recordId) {
            response = await window.recordSupabase
                .from('record')
                .update(recordPayload)
                .eq('id', recordId);
        } else {
            response = await window.recordSupabase
                .from('record')
                .insert([recordPayload]);
        }

        if (response.error) throw response.error;

        window.closeRecordModal();
        window.loadRecordData();
    } catch (error) {
        console.error("저장 오류 발생:", error);
        alert("기록을 남기지 못했습니다: " + error.message);
    } finally {
        $('.record-save-btn').prop('disabled', false);
    }
};

// ==========================================================================
// 6. 리스트 피드 출력 및 검색 필터링
// ==========================================================================
window.renderRecordFeed = function() {
    const container = $('#record-feed');
    if (!container.length) return;
    container.empty();

    const searchKeyword = $('#record-search').val().toLowerCase().trim();
    const categoryFilter = $('#record-category-filter').val();

    let filteredData = window.recordData;

    if (categoryFilter !== 'all') {
        filteredData = filteredData.filter(item => item.category === categoryFilter);
    }

    if (searchKeyword) {
        filteredData = filteredData.filter(item => {
            const titleMatch = item.title && item.title.toLowerCase().includes(searchKeyword);
            const creatorMatch = item.creator && item.creator.toLowerCase().includes(searchKeyword);
            const contentMatch = item.content && item.content.toLowerCase().includes(searchKeyword);
            const tagsMatch = item.tags && item.tags.toLowerCase().includes(searchKeyword);
            return titleMatch || creatorMatch || contentMatch || tagsMatch;
        });
    }

    if (filteredData.length === 0) {
        container.html('<p style="text-align:center; padding:30px; color:var(--sub-color); font-family:\'Noto Serif KR\', serif; font-size:12px;">남겨진 서재가 비어있습니다.</p>');
        return;
    }

    filteredData.forEach(item => {
        const dateObj = new Date(item.created_at);
        const dateString = `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
        
        // 별점 분기 안전 장치
        const parsedRating = item.rating ? Math.round(item.rating) : 0;
        const stars = parsedRating > 0 ? '★'.repeat(parsedRating) : '별점 미지정';
        
        const cardHtml = `
            <div class="record-card" style="border:1px solid var(--divider-bg); border-radius:4px; padding:15px; margin-bottom:15px; background:var(--dropdown-bg); display:flex; gap:15px; position:relative;">
                ${item.cover_url ? `<img src="${item.cover_url}" style="width:70px; height:100px; object-fit:cover; border-radius:2px; border:1px solid var(--divider-bg);">` : ''}
                <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                    <div>
                        <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
                            <span style="font-size:10px; padding:2px 6px; border-radius:4px; background:var(--rec-${item.category}); color:#2c2c2e; font-weight:bold;">${item.category.toUpperCase()}</span>
                            <span style="font-weight:700; color:var(--title-color); font-size:13px;">${item.title}</span>
                        </div>
                        <div style="font-size:11px; color:var(--sub-color); margin-top:4px;">${item.creator || ''} ${item.release_year ? `(${item.release_year})` : ''}</div>
                        <div style="font-size:12px; color:var(--main-color); margin-top:8px; line-height:1.6; word-break:break-all;">${item.content || ''}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px; font-size:11px; color:var(--sub-color);">
                        <span style="color:var(--point-color); font-weight:600;">${stars}</span>
                        <span>${dateString}</span>
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap:12px; margin-top:8px; opacity:0.4; transition:0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'">
                        <i class="xi-pen" onclick="window.editRecord(${item.id})" style="cursor:pointer; font-size:11px;" title="수정"></i>
                        <i class="xi-trash" onclick="window.deleteRecord(${item.id})" style="cursor:pointer; font-size:11px; color:#ff3b30;" title="삭제"></i>
                    </div>
                </div>
            </div>`;
        container.append(cardHtml);
    });
};

// ==========================================================================
// 7. 모달 상태 스위칭 로직
// ==========================================================================
window.openRecordModal = function(isNew = true) {
    $('#modal-record-id').val('');
    $('#modal-title').val('');
    $('#modal-year').val('');
    $('#modal-creator').val('');
    $('#modal-tags').val('');
    $('#modal-author').val('');
    $('#modal-content').html('');
    $('#record-cover-url').val('');
    $('#modal-cover-preview').empty();
    $('#modal-is-main').prop('checked', false);
    window.selectedRecordRating = 0;
    window.highlightStars(0);
    window.setDefaultRecordDate();
    $('#record-modal').fadeIn(200).css('display', 'flex');
};

window.closeRecordModal = function() {
    $('#record-modal').fadeOut(200);
};

window.openApiSearchModal = function() {
    $('#api-search-modal').fadeIn(200).css('display', 'flex');
    $('#api-search-input').focus();
};

window.closeApiSearchModal = function() {
    $('#api-search-modal').fadeOut(200);
};

window.editRecord = function(id) {
    const item = window.recordData.find(r => r.id === id);
    if (!item) return;

    window.openRecordModal(false);
    $('#modal-record-id').val(item.id);
    $('#modal-category').val(item.category);
    $('#modal-title').val(item.title);
    $('#modal-year').val(item.release_year || '');
    $('#modal-creator').val(item.creator || '');
    $('#modal-tags').val(item.tags || '');
    $('#modal-author').val(item.author || '');
    $('#modal-content').html(item.content || '');
    $('#record-cover-url').val(item.cover_url || '');
    if (item.cover_url) {
        $('#modal-cover-preview').html(`<img src="${item.cover_url}" style="max-width:100px; max-height:140px; object-fit:cover; border-radius:2px; border:1px solid var(--divider-bg);">`);
    }
    $('#modal-is-main').prop('checked', item.is_main);
    
    const dateObj = new Date(item.created_at);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    $('#modal-date').val(`${yyyy}-${mm}-${dd}`);

    window.selectedRecordRating = item.rating || 0;
    window.highlightStars(window.selectedRecordRating);
};

window.deleteRecord = async function(id) {
    if (!confirm('정말 이 기록을 지우시겠습니까?')) return;
    try {
        const { error } = await window.recordSupabase
            .from('record')
            .delete()
            .eq('id', id);
        if (error) throw error;
        window.loadRecordData();
    } catch (error) {
        alert('삭제에 실패했습니다: ' + error.message);
    }
};

// ==========================================================================
// 8. 서재 달력(Calendar) 및 통계 엔진
// ==========================================================================
window.renderRecordCalendar = function() {
    const container = $('#record-calendar');
    if (!container.length) return;
    container.empty();

    const year = window.recordCurrentDate.getFullYear();
    const month = window.recordCurrentDate.getMonth();

    $('#calendar-month-display').text(`${year}년 ${month + 1}월`);

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    let html = `<div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:5px; text-align:center; font-size:11px;">`;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    days.forEach(d => html += `<div style="font-weight:600; color:var(--sub-color); padding:4px 0;">${d}</div>`);

    for (let i = 0; i < firstDay; i++) {
        html += `<div></div>`;
    }

    for (let i = 1; i <= lastDate; i++) {
        const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const recordsOnDay = window.recordData.filter(r => {
            const rDate = new Date(r.created_at);
            const rDateStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, '0')}-${String(rDate.getDate()).padStart(2, '0')}`;
            return rDateStr === currentDateStr;
        });

        let dotsHtml = '';
        recordsOnDay.forEach(r => {
            dotsHtml += `<div style="width: 5px; height: 5px; border-radius: 50%; background: var(--rec-${r.category}); display: inline-block; margin: 1px;"></div>`;
        });
        
        html += `
            <div style="font-size: 11px; padding: 5px 0; color: var(--main-color); border: 1px solid var(--divider-bg); border-radius: 4px; min-height: 42px; display: flex; flex-direction: column; align-items: center; background: var(--dropdown-bg);">
                <div>${i}</div>
                <div style="margin-top: 2px; display: flex; flex-wrap: wrap; justify-content: center; max-width: 90%;">${dotsHtml}</div>
            </div>`;
    }
    html += `</div>`;
    container.html(html);
};

window.changeRecordMonth = function(delta) {
    window.recordCurrentDate.setMonth(window.recordCurrentDate.getMonth() + delta);
    window.renderRecordCalendar();
    window.renderRecordStats();
};

window.renderRecordStats = function() {
    const container = $('#record-stats');
    if (!container.length) return;
    container.empty();

    const categories = ['movie', 'drama', 'book', 'char', 'game', 'song', 'toon', 'show', 'video', 'etc'];
    let statsHtml = '<div style="display:flex; flex-direction:column; gap:8px; margin-top:15px;">';
    
    categories.forEach(cat => {
        const count = window.recordData.filter(r => r.category === cat).length;
        if (count > 0) {
            statsHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                    <span style="display:flex; align-items:center; gap:6px;">
                        <span style="width:10px; height:10px; border-radius:50%; background:var(--rec-${cat});"></span>
                        <span style="color:var(--main-color); text-transform:uppercase;">${cat}</span>
                    </span>
                    <span style="font-weight:bold; color:var(--title-color);">${count}개</span>
                </div>`;
        }
    });
    statsHtml += '</div>';
    container.html(statsHtml);
};

window.addNthRecord = function(title, creator, category, cover) {
    window.openRecordModal(true); 
    $('#modal-title').val(title);
    $('#modal-creator').val(creator);
    $('#modal-category').val(category);
    $('#modal-tags').val(''); 
    $('#modal-content').html('');
    
    if(cover) {
        $('#record-cover-url').val(cover);
        $('#modal-cover-preview').html(`<img src="${cover}" style="max-width:100px; max-height:140px; object-fit:cover; border-radius:2px; border:1px solid var(--divider-bg);">`);
    }
};

$(document).ready(function() {
    window.initRecordPage();
});
