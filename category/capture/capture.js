/* ==========================================================================
   하시온 — AI 채팅 캡처 백업
   - 데이터: 이 저장소(white)의 capture/capture.json
   - 이미지: capture/images/YYYY/MM/ 에 원본 그대로
   - 날짜는 사진 정보(EXIF/XMP) → 파일 이름 → 파일 시간 순으로 자동 인식
   ========================================================================== */
(function () {
    var REPO_NAME = window.ghdb.repoName;   // 지금 사이트의 저장소 (복사해 가도 그대로 동작)
    var DATA = 'capture/capture.json';
    var BATCH = 8;                      // 커밋 하나에 담는 이미지 수
    var repo = window.ghdb.repo(REPO_NAME);

    var db = { items: [], groups: [] };
    var now = new Date();
    var state = {
        tag: null, fav: false,
        order: lsGet('cap-order', 'desc'),
        selecting: false, sel: new Set(),
        open: JSON.parse(lsGet('cap-open', '{}')),     // 기본은 모두 닫힘, 연 것만 기억
        calY: now.getFullYear(), calM: now.getMonth() + 1,
        picked: null,
        monthOnly: lsGet('cap-month-only', '0') === '1'   // 켜면 달력에서 보고 있는 달만 목록에 표시
    };

    var $feed = $('#cap-feed'), $bar = $('#cap-bar');
    var localUrls = {};   // 방금 올린 사진은 내 기기에 있는 파일로 바로 보여줌

    /* ---------------- 작은 도구들 ---------------- */
    function lsGet(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function pad(n) { return String(n).padStart(2, '0'); }
    function localISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
    function dayOf(at) { return at.slice(0, 10); }
    function timeOf(at) { return at.slice(11, 16); }
    var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
    function parseTags(str) {
        return (str || '').split(/[\s,]+/).map(function (t) { return t.replace(/^#+/, '').trim(); }).filter(Boolean)
            .filter(function (t, i, a) { return a.indexOf(t) === i; });
    }
    function tagsText(tags) { return (tags || []).map(function (t) { return '#' + t; }).join(' '); }
    function groupOf(item) { return item.group ? db.groups.find(function (g) { return g.id === item.group; }) : null; }
    function saveOpen() { lsSet('cap-open', JSON.stringify(state.open)); }
    function isOpen(k) { return !!state.open[k] || ((state.tag || state.fav) && k.charAt(0) === 'd'); }
    function idsOfDay(d) { return db.items.filter(function (it) { return dayOf(it.taken_at) === d; }).map(function (it) { return it.id; }); }

    function busyAlert(e) {
        console.error(e);
        var msg = (e && e.message) || String(e);
        if (/404|403/.test(msg)) msg = '토큰에 이 저장소(' + REPO_NAME + ')의 Contents 쓰기 권한이 있는지 확인해 주세요.\n\n' + msg;
        alert('저장하지 못했어요.\n' + msg);
    }

    /* ---------------- 불러오기 ---------------- */
    var EMPTY_NOTE = '아직 올린 캡처가 없어요. 위의 사진 아이콘으로 올려 주세요.';
    async function load() {
        try {
            var data = await repo.readJSON(DATA, { items: [], groups: [] });
            db.items = data.items || []; db.groups = data.groups || [];
            $('#cap-status').text(db.items.length ? '' : EMPTY_NOTE);
            render();
        } catch (e) {
            console.error(e);
            $('#cap-status').text('불러오지 못했어요. (' + (e.message || e) + ')');
        }
    }

    // 커밋 후 화면 갱신: commit 결과(최신 JSON)를 그대로 반영
    function applyResult(res) {
        var d = res && res[DATA];
        if (d) { d = JSON.parse(JSON.stringify(d)); db.items = d.items || []; db.groups = d.groups || []; }   // 저장소가 기억한 최신본과 분리
        $('#cap-status').text(db.items.length ? '' : EMPTY_NOTE);
        render();
    }

    function mutateDb(fn) {
        return { mutate: function (cur) { cur = cur || {}; cur.items = cur.items || []; cur.groups = cur.groups || []; fn(cur); cleanupGroups(cur); return cur; }, fallback: { items: [], groups: [] } };
    }
    function cleanupGroups(d) {
        var used = new Set(d.items.map(function (i) { return i.group; }).filter(Boolean));
        d.groups = d.groups.filter(function (g) { return used.has(g.id); });
        d.items.sort(function (a, b) { return a.taken_at < b.taken_at ? -1 : a.taken_at > b.taken_at ? 1 : 0; });
    }

    /* ---------------- 화면 그리기 ---------------- */
    function visibleItems() {
        return db.items.filter(function (it) {
            var g = groupOf(it);
            if (state.fav && !(it.fav || (g && g.fav))) return false;
            if (state.tag && !((it.tags || []).includes(state.tag) || (g && (g.tags || []).includes(state.tag)))) return false;
            return true;
        });
    }

    // 날짜별 → [낱장 또는 모음] 시간순
    function buildDays(items) {
        var days = {}, groupsSeen = {};
        items.forEach(function (it) {
            var g = groupOf(it), d = dayOf(it.taken_at);
            if (g) {
                var entry = groupsSeen[g.id];
                if (!entry) {
                    entry = groupsSeen[g.id] = { type: 'group', group: g, items: [], at: it.taken_at };
                    (days[d] = days[d] || []).push(entry);   // 모음은 첫 장의 날짜에 놓임
                }
                entry.items.push(it);
                if (it.taken_at < entry.at) entry.at = it.taken_at;
            } else {
                (days[d] = days[d] || []).push({ type: 'item', item: it, at: it.taken_at });
            }
        });
        Object.keys(days).forEach(function (d) {
            days[d].sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
            days[d].forEach(function (e) { if (e.items) e.items.sort(function (a, b) { return a.taken_at < b.taken_at ? -1 : 1; }); });
        });
        return days;
    }

    function itemHtml(it) {
        var sel = state.sel.has(it.id) ? ' is-sel' : '';
        var size = (it.w && it.h) ? ' width="' + it.w + '" height="' + it.h + '"' : '';
        return '<figure class="cap-item' + sel + '" data-id="' + esc(it.id) + '">' +
            '<img loading="lazy" decoding="async" alt=""' + size + ' src="' + esc(localUrls[it.id] || repo.url(it.view || it.path)) + '" data-path="' + esc(it.view || it.path) + '">' +
            '<figcaption class="cap-meta">' +
                (it.tags && it.tags.length ? '<span class="cap-meta-tags">' + esc(tagsText(it.tags)) + '</span>' : '') +
                '<span class="cap-meta-acts">' +
                    '<i data-act="fav" class="' + (it.fav ? 'xi-heart is-fav' : 'xi-heart-o') + '" title="♡"></i>' +
                    '<i data-act="edit" class="xi-pen" title="수정"></i>' +
                    '<i data-act="del" class="xi-trash cap-act-del" title="삭제"></i>' +
                '</span>' +
                (it.fav ? '<i class="xi-heart cap-meta-fav"></i>' : '') +
                '<span class="cap-meta-time" data-act="tools" title="누르면 수정 도구">' + timeOf(it.taken_at) + '</span>' +
            '</figcaption>' +
        '</figure>';
    }

    function groupHtml(e) {
        var g = e.group, first = e.items[0].taken_at, last = e.items[e.items.length - 1].taken_at;
        var span = timeOf(first) + (timeOf(last) !== timeOf(first) ? ' – ' + timeOf(last) : '');
        var open = isOpen('g:' + g.id) ? ' is-open' : '';
        return '<div class="cap-group' + open + '" data-gid="' + esc(g.id) + '">' +
            '<div class="cap-group-head">' +
                '<span class="cap-group-title">' + (g.fav ? '<i class="xi-heart is-fav"></i> ' : '') + esc(g.title || '모음') + '</span>' +
                '<span class="cap-group-sub">' + span + ' · ' + e.items.length + '장</span>' +
            '</div>' +
            '<div class="cap-group-body">' +
                (g.memo ? '<div class="cap-group-memo">' + esc(g.memo) + '</div>' : '') +
                (g.tags && g.tags.length ? '<div class="cap-group-tags">' + esc(tagsText(g.tags)) + '</div>' : '') +
                e.items.map(itemHtml).join('') +
                '<div class="cap-row-acts"><i class="xi-pen cap-group-edit" title="모음 수정"></i></div>' +
            '</div>' +
        '</div>';
    }

    function render() {
        var items = visibleItems();
        var days = buildDays(items);
        var keys = Object.keys(days).sort();
        if (state.monthOnly) {
            var ym = state.calY + '-' + pad(state.calM);
            keys = keys.filter(function (d) { return d.slice(0, 7) === ym; });
        }
        if (state.order === 'desc') keys.reverse();

        var note = '';
        if (state.tag || state.fav) {
            note = '<div class="cap-filter-note">' + (state.fav ? '♡ ' : '') + (state.tag ? '#' + esc(state.tag) + ' ' : '') +
                '· ' + items.length + '장 <span id="cap-clear-filter">전체 보기</span></div>';
        }

        var html = keys.map(function (d) {
            var dt = new Date(d + 'T00:00:00');
            var cnt = days[d].reduce(function (n, e) { return n + (e.items ? e.items.length : 1); }, 0);
            var open = isOpen('d:' + d) ? ' is-open' : '';
            return '<section class="cap-day' + open + (state.picked === d ? ' is-picked' : '') + '" id="cap-d-' + d + '" data-date="' + d + '">' +
                '<div class="cap-day-head">' +
                    '<span class="cap-day-date">' + d.replace(/-/g, '.') + ' <small>' + WEEK[dt.getDay()] + '</small></span>' +
                    '<span class="cap-day-tools" title="">' +
                        '<i data-day="add" class="xi-plus" title="이 날짜에 추가"></i>' +
                        '<i data-day="date" class="xi-calendar" title="이 날 전체 날짜 바꾸기"></i>' +
                        '<i data-day="select" class="xi-check-circle-o" title="골라서 수정"></i>' +
                        '<i data-day="del" class="xi-trash cap-act-del" title="이 날 전체 삭제"></i>' +
                    '</span>' +
                    '<span class="cap-day-count">' + cnt + '</span>' +
                '</div>' +
                '<div class="cap-day-body">' +
                    days[d].map(function (e) { return e.type === 'group' ? groupHtml(e) : itemHtml(e.item); }).join('') +
                '</div>' +
            '</section>';
        }).join('');

        if (state.monthOnly) {
            note += '<div class="cap-filter-note">' + state.calY + '년 ' + state.calM + '월만 보는 중 · ' +
                keys.reduce(function (n, d) { return n + days[d].reduce(function (m, e) { return m + (e.items ? e.items.length : 1); }, 0); }, 0) + '장' +
                (keys.length ? '' : ' (이 달엔 캡처가 없어요)') + '</div>';
        }
        $feed.html(note + html);
        $('#cap-ic-month').toggleClass('active', state.monthOnly);
        $('#cap-wrap').toggleClass('cap-selecting', state.selecting);
        $('#cap-ic-fav').toggleClass('active', state.fav).attr('class', (state.fav ? 'xi-heart' : 'xi-heart-o') + (state.fav ? ' active' : ''));
        $('#cap-ic-tags').toggleClass('active', !!state.tag || $('#cap-tags-panel').is(':visible'));
        $('#cap-ic-order').attr('class', state.order === 'asc' ? 'xi-arrow-down' : 'xi-arrow-up')
            .attr('title', state.order === 'asc' ? '오래된 날짜부터' : '최근 날짜부터');
        drawCal();
        drawTags();
        updateSelBar();
    }

    // 사이트 반영 전 이미지 → GitHub 원본 주소로 대신 표시 (error는 버블링이 안 돼서 캡처 단계에서 잡음)
    document.getElementById('cap-feed').addEventListener('error', function (e) {
        var el = e.target;
        if (el.tagName === 'IMG' && !el.dataset.fallback && el.dataset.path) {
            el.dataset.fallback = '1';
            el.src = repo.rawUrl(el.dataset.path) + '?t=' + Date.now();
        }
    }, true);
    document.getElementById('cap-feed').addEventListener('load', function (e) {
        if (e.target.tagName === 'IMG') e.target.classList.add('is-loaded');
    }, true);

    /* ---------------- 달력 (토끼굴 달력과 같은 모양) ---------------- */
    function drawCal() {
        var y = state.calY, m = state.calM;
        $('#cap-cal-month').text(y + '년 ' + m + '월').show();
        $('#cap-cal-picker').val(y + '-' + pad(m)).hide();
        var has = {};
        visibleItems().forEach(function (it) { has[dayOf(it.taken_at)] = 1; });
        var first = new Date(y, m - 1, 1).getDay(), last = new Date(y, m, 0).getDate();
        var t = new Date(), isThisMonth = t.getFullYear() === y && t.getMonth() + 1 === m;
        var h = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(function (w) { return '<div class="cap-cal-wd">' + w + '</div>'; }).join('');
        for (var i = 0; i < first; i++) h += '<div class="cap-cal-wrap"></div>';
        for (var d = 1; d <= last; d++) {
            var key = y + '-' + pad(m) + '-' + pad(d);
            var cls = 'cap-cal-day' + (has[key] ? ' has-log' : '') + (isThisMonth && d === t.getDate() ? ' is-today' : '') + (state.picked === key ? ' is-picked' : '');
            h += '<div class="cap-cal-wrap"><div class="' + cls + '" data-date="' + key + '">' + d + '</div></div>';
        }
        $('#cap-cal-grid').html(h);
    }
    function shiftMonth(n) {
        var d = new Date(state.calY, state.calM - 1 + n, 1);
        state.calY = d.getFullYear(); state.calM = d.getMonth() + 1;
        state.monthOnly ? render() : drawCal();
    }
    $('#cap-cal-prev').on('click', function () { shiftMonth(-1); });
    $('#cap-cal-next').on('click', function () { shiftMonth(1); });
    $('#cap-cal-month').on('click', function () { $(this).hide(); $('#cap-cal-picker').show().focus(); });
    $('#cap-cal-picker').on('change blur', function () {
        var v = $(this).val();
        if (/^\d{4}-\d{2}$/.test(v)) { state.calY = +v.slice(0, 4); state.calM = +v.slice(5, 7); }
        state.monthOnly ? render() : drawCal();
    });
    $('#cap-cal-grid').on('click', '.cap-cal-day.has-log', function () { goToDay($(this).data('date')); });

    function goToDay(d) {
        state.picked = d;
        state.calY = +d.slice(0, 4); state.calM = +d.slice(5, 7);
        // 다른 날은 닫고 고른 날만 열어서, 위에서 사진이 늘어나 위치가 밀리지 않게
        Object.keys(state.open).forEach(function (k) { if (k.charAt(0) === 'd') delete state.open[k]; });
        state.open['d:' + d] = 1; saveOpen();
        render();
        var scroll = function (smooth) {
            var el = document.getElementById('cap-d-' + d);
            if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: smooth ? 'smooth' : 'auto' });
        };
        requestAnimationFrame(function () { scroll(true); });
        setTimeout(function () { scroll(true); }, 450);
    }

    /* ---------------- 위쪽 아이콘들 ---------------- */
    function drawTags() {
        var count = {};
        db.items.forEach(function (it) { (it.tags || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; }); });
        db.groups.forEach(function (g) {
            var n = db.items.filter(function (i) { return i.group === g.id; }).length;
            (g.tags || []).forEach(function (t) { count[t] = (count[t] || 0) + n; });
        });
        var tags = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; });
        $('#cap-tags-panel').html(tags.length ? tags.map(function (t) {
            return '<span class="cap-pill' + (state.tag === t ? ' is-on' : '') + '" data-tag="' + esc(t) + '">#' + esc(t) + ' <small>' + count[t] + '</small></span>';
        }).join('') : '<span class="cap-none">태그가 없습니다.</span>');
    }
    $('#cap-ic-tags').on('click', function () { $('#cap-tags-panel').slideToggle(200); $(this).toggleClass('active'); });
    $('#cap-tags-panel').on('click', '.cap-pill', function () {
        var t = String($(this).data('tag'));
        state.tag = state.tag === t ? null : t; render();
    });
    $('#cap-ic-fav').on('click', function () { state.fav = !state.fav; render(); });
    $('#cap-ic-month').on('click', function () {
        state.monthOnly = !state.monthOnly; lsSet('cap-month-only', state.monthOnly ? '1' : '0'); render();
    });
    $('#cap-ic-order').on('click', function () { state.order = state.order === 'asc' ? 'desc' : 'asc'; lsSet('cap-order', state.order); render(); });
    $('#cap-ic-upload').on('click', function () { openUploadPicker(null); });
    $feed.on('click', '#cap-clear-filter', function () { state.tag = null; state.fav = false; render(); });

    /* ---------------- 목록 동작 ---------------- */
    $feed.on('click', '.cap-day-head', function (e) {
        var $d = $(this).parent(), d = $d.data('date'), tool = $(e.target).closest('[data-day]').data('day');
        if (tool === 'add') { openUploadPicker(d); return; }
        if (tool === 'date') { openDateSheet(idsOfDay(d), d); return; }
        if (tool === 'select') { state.open['d:' + d] = 1; saveOpen(); $d.addClass('is-open'); setSelecting(true); return; }
        if (tool === 'del') { deleteItems(idsOfDay(d), d.replace(/-/g, '.') + '의 캡처 ' + idsOfDay(d).length + '장을 모두 삭제할까요?'); return; }
        var k = 'd:' + d;
        $d.toggleClass('is-open');
        if ($d.hasClass('is-open')) state.open[k] = 1; else delete state.open[k];
        saveOpen();
    });
    $feed.on('click', '.cap-group-head', function () {
        var $g = $(this).parent(), gid = $g.data('gid');
        if (state.selecting) {
            // 고르기 중엔 모음 머리를 누르면 모음 전체 선택/해제
            var ids = $g.find('.cap-item').map(function () { return String($(this).data('id')); }).get();
            var allOn = ids.every(function (id) { return state.sel.has(id); });
            ids.forEach(function (id) { allOn ? state.sel.delete(id) : state.sel.add(id); });
            $g.addClass('is-open').find('.cap-item').toggleClass('is-sel', !allOn);
            updateSelBar();
            return;
        }
        var k = 'g:' + gid;
        $g.toggleClass('is-open');
        if ($g.hasClass('is-open')) state.open[k] = 1; else delete state.open[k];
        saveOpen();
    });
    $feed.on('click', '.cap-group-edit', function () { openGroupSheet($(this).closest('.cap-group').data('gid')); });
    $feed.on('click', '.cap-item', function (e) {
        var id = String($(this).data('id'));
        if (state.selecting) {
            state.sel.has(id) ? state.sel.delete(id) : state.sel.add(id);
            $(this).toggleClass('is-sel', state.sel.has(id));
            updateSelBar();
            return;
        }
        var act = $(e.target).closest('[data-act]').data('act');
        if (act === 'tools') { $(this).toggleClass('show-tools'); return; }
        if (act === 'fav') toggleFav([id]);
        if (act === 'edit') openItemSheet(id);
        if (act === 'del') deleteItems([id]);
    });

    /* ---------------- 따라오는 작은 툴바 ---------------- */
    $('#cap-tb-top').on('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    $('#cap-tb-select').on('click', function () { setSelecting(!state.selecting); });
    $('#cap-tb-upload').on('click', function () { openUploadPicker(null); });

    /* ---------------- 고르기 모드 ---------------- */
    function setSelecting(on) {
        state.selecting = on; state.sel.clear();
        $bar.toggleClass('is-selecting', on);
        $('#cap-wrap').toggleClass('cap-selecting', on);
        $('.cap-item').removeClass('is-sel');
        updateSelBar();
    }
    function updateSelBar() {
        $('#cap-sel-count').text(state.sel.size + '장');
        $('.cap-bar-select [data-act]').not('[data-act=done]').toggleClass('is-off', state.sel.size === 0);
    }
    $('.cap-bar-select').on('click', '[data-act]', function () {
        var act = $(this).data('act'), ids = Array.from(state.sel);
        if (act === 'done') { setSelecting(false); return; }
        if (!ids.length) return;
        if (act === 'group') openGroupSheet(null, ids);
        if (act === 'ungroup') ungroup(ids);
        if (act === 'date') openDateSheet(ids);
        if (act === 'tags') openTagSheet(ids);
        if (act === 'fav') toggleFav(ids);
        if (act === 'delete') deleteItems(ids);
    });

    /* ---------------- 수정 동작들 (모두 커밋 하나씩) ---------------- */
    // 화면은 바로 바꾸고, GitHub 저장은 뒤에서 차례로 (저장 중엔 위에 '저장 중' 표시)
    var pending = 0;
    function setPending(n) {
        pending = n;
        $('#cap-saving').text(pending ? '저장 중…' : '').toggleClass('on', !!pending);
    }
    window.onbeforeunload = function () { return pending ? '아직 저장 중이에요.' : undefined; };
    function background(promise) {
        setPending(pending + 1);
        return promise.then(function (res) {
            setPending(pending - 1);
            if (!pending) applyResult(res);    // 다 끝났을 때만 서버 상태로 맞춤 (중간에 화면이 깜빡이지 않게)
            return res;
        }, function (e) {
            setPending(pending - 1);
            busyAlert(e);
            load();                            // 실패하면 서버 상태로 되돌림
            throw e;
        });
    }
    async function run(message, files, fn) {
        var local = JSON.parse(JSON.stringify(db));
        fn(local); cleanupGroups(local);
        db.items = local.items; db.groups = local.groups;
        render();
        var j = {}; j[DATA] = mutateDb(fn);
        background(repo.commit(message, files || {}, j)).catch(function () {});
        return true;
    }

    async function toggleFav(ids) {
        var allOn = ids.every(function (id) { var it = db.items.find(function (i) { return i.id === id; }); return it && it.fav; });
        await run('capture: ♡ ' + ids.length + '장', null, function (d) {
            d.items.forEach(function (it) { if (ids.includes(it.id)) it.fav = !allOn; });
        });
        if (state.selecting) setSelecting(false);
    }

    async function ungroup(ids) {
        if (await run('capture: 모음에서 빼기 ' + ids.length + '장', null, function (d) {
            d.items.forEach(function (it) { if (ids.includes(it.id)) it.group = null; });
        })) setSelecting(false);
    }

    async function deleteItems(ids, question) {
        if (!ids.length) return;
        if (!confirm((question || (ids.length > 1 ? ids.length + '장을 삭제할까요?' : '이 캡처를 삭제할까요?')) + '\n저장소에서도 원본 파일이 지워져요.')) return;
        var files = {};
        db.items.forEach(function (it) { if (ids.includes(it.id)) { files[it.path] = null; if (it.view) files[it.view] = null; } });
        if (await run('capture: 삭제 ' + ids.length + '장', files, function (d) {
            d.items = d.items.filter(function (it) { return !ids.includes(it.id); });
        })) setSelecting(false);
    }

    /* ---------------- 시트 ---------------- */
    function openSheet(html) {
        $('#cap-sheet').html(html);
        $('#cap-sheet-bg').css('display', 'flex').hide().fadeIn(150);
        $bar.css('visibility', 'hidden');
    }
    function closeSheet() {
        $('#cap-sheet-bg').fadeOut(120);
        $bar.css('visibility', '');
        if (upload) { upload.rows.forEach(function (r) { URL.revokeObjectURL(r.url); }); upload = null; }
    }
    $('#cap-sheet-bg').on('click', function (e) { if (e.target === this && !busy) closeSheet(); });
    $('#cap-sheet').on('click', '[data-close]', function () { if (!busy) closeSheet(); });
    var busy = false;
    function setBusy(b, text) {
        busy = b;
        $('#cap-sheet .cap-btn').prop('disabled', b);
        $('#cap-sheet .cap-progress').text(text || '');
    }

    function openItemSheet(id) {
        var it = db.items.find(function (i) { return i.id === id; });
        if (!it) return;
        openSheet(
            '<h3>캡처 수정</h3><div class="cap-sub">' + esc(it.name || '') + '</div>' +
            '<label class="cap-field">날짜 · 시간</label><input type="datetime-local" step="1" id="cs-at" value="' + it.taken_at + '">' +
            '<label class="cap-field">태그</label><input type="text" id="cs-tags" placeholder="#뱅 #유이" value="' + esc(tagsText(it.tags)) + '">' +
            '<label class="cap-check"><input type="checkbox" id="cs-fav"' + (it.fav ? ' checked' : '') + '> ♡ 즐겨찾기</label>' +
            '<div class="cap-actions"><button class="cap-btn danger" id="cs-del">삭제</button><span class="cap-progress"></span>' +
            '<button class="cap-btn" data-close>닫기</button><button class="cap-btn primary" id="cs-save">저장</button></div>'
        );
        $('#cs-save').on('click', async function () {
            var at = normalizeAt($('#cs-at').val()), tags = parseTags($('#cs-tags').val()), fav = $('#cs-fav').is(':checked');
            if (!at) { alert('날짜를 확인해 주세요.'); return; }
            setBusy(true, '저장 중…');
            var ok = await run('capture: 수정 ' + it.name, null, function (d) {
                var x = d.items.find(function (i) { return i.id === id; });
                if (x) { x.taken_at = at; x.date_src = x.taken_at === it.taken_at ? x.date_src : 'manual'; x.tags = tags; x.fav = fav; }
            });
            setBusy(false);
            if (ok) closeSheet();
        });
        $('#cs-del').on('click', async function () {
            closeSheet();
            await deleteItems([id]);
        });
    }

    function openGroupSheet(gid, ids) {
        var g = gid ? db.groups.find(function (x) { return x.id === gid; }) : { title: '', memo: '', tags: [], fav: false };
        openSheet(
            '<h3>' + (gid ? '모음 수정' : ids.length + '장을 모음으로 묶기') + '</h3>' +
            '<div class="cap-sub">모음은 접고 펼 수 있고, 첫 장의 날짜에 놓여요.</div>' +
            '<label class="cap-field">제목 (비워도 돼요)</label><input type="text" id="cg-title" value="' + esc(g.title) + '">' +
            '<label class="cap-field">한 줄 메모</label><textarea id="cg-memo">' + esc(g.memo) + '</textarea>' +
            '<label class="cap-field">태그 (모음 전체)</label><input type="text" id="cg-tags" placeholder="#뱅 #유이" value="' + esc(tagsText(g.tags)) + '">' +
            '<label class="cap-check"><input type="checkbox" id="cg-fav"' + (g.fav ? ' checked' : '') + '> ♡ 즐겨찾기</label>' +
            '<div class="cap-actions">' + (gid ? '<button class="cap-btn danger" id="cg-un">모음 풀기</button>' : '') +
            '<span class="cap-progress"></span><button class="cap-btn" data-close>닫기</button><button class="cap-btn primary" id="cg-save">저장</button></div>'
        );
        $('#cg-save').on('click', async function () {
            var data = { title: $('#cg-title').val().trim(), memo: $('#cg-memo').val().trim(), tags: parseTags($('#cg-tags').val()), fav: $('#cg-fav').is(':checked') };
            setBusy(true, '저장 중…');
            var newId = 'g' + Date.now().toString(36);
            var ok = await run(gid ? 'capture: 모음 수정' : 'capture: 모음 만들기 ' + ids.length + '장', null, function (d) {
                if (gid) {
                    var x = d.groups.find(function (y) { return y.id === gid; });
                    if (x) Object.assign(x, data);
                } else {
                    d.groups.push(Object.assign({ id: newId }, data));
                    d.items.forEach(function (it) { if (ids.includes(it.id)) it.group = newId; });
                }
            });
            setBusy(false);
            if (ok) { closeSheet(); if (!gid) setSelecting(false); }
        });
        $('#cg-un').on('click', async function () {
            if (!confirm('모음을 풀까요? 사진은 그대로 남아요.')) return;
            setBusy(true, '저장 중…');
            var ok = await run('capture: 모음 풀기', null, function (d) {
                d.items.forEach(function (it) { if (it.group === gid) it.group = null; });
            });
            setBusy(false);
            if (ok) closeSheet();
        });
    }

    function openDateSheet(ids, fromDay) {
        var first = db.items.find(function (i) { return i.id === ids[0]; });
        if (!first) return;
        openSheet(
            '<h3>' + (fromDay ? fromDay.replace(/-/g, '.') + ' 전체(' + ids.length + '장) 날짜 바꾸기' : ids.length + '장 날짜 바꾸기') + '</h3><div class="cap-sub">시간은 그대로 두고 날짜만 바뀌어요.</div>' +
            '<input type="date" id="cd-date" value="' + dayOf(first.taken_at) + '">' +
            '<div class="cap-actions"><span class="cap-progress"></span><button class="cap-btn" data-close>닫기</button><button class="cap-btn primary" id="cd-save">저장</button></div>'
        );
        $('#cd-save').on('click', async function () {
            var d0 = $('#cd-date').val();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d0)) return;
            setBusy(true, '저장 중…');
            var ok = await run('capture: 날짜 변경 ' + ids.length + '장 → ' + d0, null, function (d) {
                d.items.forEach(function (it) { if (ids.includes(it.id)) { it.taken_at = d0 + it.taken_at.slice(10); it.date_src = 'manual'; } });
            });
            setBusy(false);
            if (ok) { closeSheet(); if (state.selecting) setSelecting(false); goToDay(d0); }
        });
    }

    function openTagSheet(ids) {
        openSheet(
            '<h3>' + ids.length + '장에 태그 붙이기</h3><div class="cap-sub">기존 태그에 더해져요. 빼려면 "빼기"를 눌러요.</div>' +
            '<input type="text" id="ct-tags" placeholder="#뱅 #유이">' +
            '<div class="cap-actions"><span class="cap-progress"></span><button class="cap-btn" id="ct-remove">빼기</button><button class="cap-btn primary" id="ct-add">붙이기</button></div>'
        );
        function go(remove) {
            return async function () {
                var tags = parseTags($('#ct-tags').val());
                if (!tags.length) return;
                setBusy(true, '저장 중…');
                var ok = await run('capture: 태그 ' + (remove ? '빼기 ' : '붙이기 ') + tagsText(tags), null, function (d) {
                    d.items.forEach(function (it) {
                        if (!ids.includes(it.id)) return;
                        var cur = it.tags || [];
                        it.tags = remove ? cur.filter(function (t) { return !tags.includes(t); })
                            : cur.concat(tags.filter(function (t) { return !cur.includes(t); }));
                    });
                });
                setBusy(false);
                if (ok) { closeSheet(); setSelecting(false); }
            };
        }
        $('#ct-add').on('click', go(false));
        $('#ct-remove').on('click', go(true));
    }

    function normalizeAt(v) {
        if (!v) return '';
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return v + ':00';
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) return v.slice(0, 19);
        return '';
    }

    /* ---------------- 업로드 ---------------- */
    var upload = null;      // { forceDate, rows: [{file,url,at,src,hash,w,h,dup,bytes}] }

    function openUploadPicker(forceDate) {
        if (!window.ghdb.hasToken()) {
            alert('먼저 오른쪽 위 자물쇠를 눌러 GitHub 토큰을 넣어 주세요.');
            return;
        }
        $('#cap-file').data('force-date', forceDate || '').val('').trigger('click');
    }

    $('#cap-file').on('change', async function () {
        var files = Array.from(this.files || []);
        if (!files.length) return;
        var forceDate = $(this).data('force-date') || null;
        upload = { forceDate: forceDate, rows: [] };
        openSheet('<h3>' + files.length + '장 올리기</h3><div class="cap-sub" id="cu-sub">사진 정보를 읽는 중…</div><div class="cap-up-list" id="cu-list"></div>');

        var known = new Set(db.items.map(function (i) { return i.hash; }));
        for (var f of files) {
            if (!upload) return;   // 시트를 닫았으면 중단
            var bytes = new Uint8Array(await f.arrayBuffer());
            var hash = await sha256(bytes);
            var det = detectTime(f, bytes);
            if (forceDate) det = { at: forceDate + det.at.slice(10), src: det.src, forced: true };
            var dim = imageSize(bytes);
            var row = { file: f, bytes: bytes, url: URL.createObjectURL(f), at: det.at, src: det.src, forced: det.forced, hash: hash, w: dim && dim.w, h: dim && dim.h,
                dup: known.has(hash) ? 'old' : (upload.rows.some(function (r) { return r.hash === hash; }) ? 'batch' : '') };
            upload.rows.push(row);
        }
        drawUpload();
    });

    var SRC_LABEL = { exif: '사진 정보의 시간', xmp: '사진 정보의 시간', name: '파일 이름의 시간', file: '파일 수정 시간 (확인해 주세요)' };

    function drawUpload() {
        var rows = upload.rows;
        rows.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
        var dups = rows.filter(function (r) { return r.dup; }).length;
        var ok = rows.length - dups;
        $('#cap-sheet h3').text(ok + '장 올리기');
        $('#cu-sub').text((upload.forceDate ? upload.forceDate + ' 날짜로 들어가요. ' : '날짜는 자동으로 나눠져요. 틀린 건 여기서 고쳐 주세요. ') +
            (dups ? '· 이미 있는 ' + dups + '장은 건너뛰어요.' : ''));
        $('#cu-list').html(rows.map(function (r, i) {
            var srcTxt = r.dup === 'old' ? '이미 올린 사진이라 건너뛰어요' : r.dup === 'batch' ? '같은 사진이 두 번 골라졌어요' :
                (SRC_LABEL[r.src] || '') + (r.forced ? ' · 날짜는 지정한 날' : '');
            return '<div class="cap-up-row' + (r.dup ? ' is-dup' : '') + '" data-i="' + i + '">' +
                '<img src="' + r.url + '" alt="">' +
                '<div class="cap-up-mid">' +
                    '<input type="datetime-local" step="1" value="' + r.at + '"' + (r.dup ? ' disabled' : '') + '>' +
                    '<div class="cap-up-src' + (r.src === 'file' && !r.dup ? ' warn' : '') + '">' + esc(srcTxt) + ' · ' + esc(r.file.name) + '</div>' +
                '</div>' +
                '<button class="cap-up-x" title="빼기"><i class="xi-close"></i></button>' +
            '</div>';
        }).join('') +
            '<label class="cap-field">태그 (전체에 붙음)</label><input type="text" id="cu-tags" placeholder="#뱅 #유이">' +
            '<label class="cap-check"><input type="checkbox" id="cu-group"> 이번에 올리는 사진을 한 모음으로 묶기</label>' +
            '<div id="cu-group-box" style="display:none">' +
                '<label class="cap-field">모음 제목</label><input type="text" id="cu-gtitle">' +
                '<label class="cap-field">한 줄 메모</label><textarea id="cu-gmemo"></textarea>' +
            '</div>' +
            '<div class="cap-actions"><span class="cap-progress"></span><button class="cap-btn" data-close>취소</button>' +
            '<button class="cap-btn primary" id="cu-go"' + (ok ? '' : ' disabled') + '>올리기</button></div>');
    }

    $('#cap-sheet').on('change', '.cap-up-row input', function () {
        var r = upload.rows[$(this).closest('.cap-up-row').data('i')];
        var v = normalizeAt($(this).val());
        if (v) { r.at = v; r.src = 'manual'; }
    });
    $('#cap-sheet').on('click', '.cap-up-x', function () {
        if (busy) return;
        var i = $(this).closest('.cap-up-row').data('i');
        URL.revokeObjectURL(upload.rows[i].url);
        upload.rows.splice(i, 1);
        if (!upload.rows.length) { closeSheet(); return; }
        drawUpload();
    });
    $('#cap-sheet').on('change', '#cu-group', function () { $('#cu-group-box').toggle(this.checked); });
    $('#cap-sheet').on('click', '#cu-go', function () {
        var rows = upload.rows.filter(function (r) { return !r.dup; });
        if (!rows.length) return;
        var tags = parseTags($('#cu-tags').val());
        var group = $('#cu-group').is(':checked') ? {
            id: 'g' + Date.now().toString(36), title: $('#cu-gtitle').val().trim(), memo: $('#cu-gmemo').val().trim(), tags: [], fav: false
        } : null;

        var items = rows.map(function (r) {
            var base = 'capture/%s/' + r.at.slice(0, 4) + '/' + r.at.slice(5, 7) + '/' +
                r.at.slice(0, 10).replace(/-/g, '') + '-' + r.at.slice(11, 19).replace(/:/g, '') + '_' + r.hash.slice(0, 8);
            var it = {
                id: r.hash.slice(0, 12), taken_at: r.at, date_src: r.src, path: base.replace('%s', 'images') + '.' + extOf(r.file), view: null, hash: r.hash,
                w: r.w || null, h: r.h || null, size: r.bytes.length, name: r.file.name, type: r.file.type || '',
                group: group ? group.id : null, tags: tags.slice(), fav: false, added_at: localISO(new Date())
            };
            localUrls[it.id] = r.url;     // 업로드 끝날 때까지(그리고 이후에도) 내 파일로 표시
            r._viewBase = base.replace('%s', 'view');
            return it;
        });

        // 화면에는 바로 추가하고 창을 닫음
        if (group) db.groups.push(group);
        items.forEach(function (it) { db.items.push(it); });
        cleanupGroups(db);
        $('#cap-status').text('');
        upload = null;                     // closeSheet가 파일 주소를 지우지 않게
        closeSheet();
        goToDay(items[0].taken_at.slice(0, 10));

        var total = rows.length, done = 0;
        var showProg = function (extra) { $('#cap-saving').text('올리는 중 ' + done + ' / ' + total + (extra || '')).addClass('on'); };
        var onWait = function (sec) { showProg(' · GitHub이 잠깐 쉬래요 ' + sec + '초'); };

        var job = (async function () {
            var lastRes = null;
            for (var s = 0; s < rows.length; s += BATCH) {
                var chunk = rows.slice(s, s + BATCH), chunkItems = items.slice(s, s + BATCH);
                // 보기용 가벼운 사본 만들기 (원본은 그대로 따로 저장)
                var blobsIn = [];
                for (var k = 0; k < chunk.length; k++) {
                    blobsIn.push(chunk[k].bytes);
                    var v = await makeView(chunk[k].file, chunk[k].bytes.length);
                    chunk[k]._view = v;
                    if (v) blobsIn.push(v.bytes);
                }
                var shas = await repo.putBlobs(blobsIn, null, onWait, 4);
                var files = {}, n = 0;
                chunk.forEach(function (r, idx) {
                    files[chunkItems[idx].path] = shas[n++];
                    if (r._view) { chunkItems[idx].view = r._viewBase + '.' + r._view.ext; files[chunkItems[idx].view] = shas[n++]; }
                    done++;
                });
                showProg();
                var j = {};
                j[DATA] = mutateDb(function (d) {
                    var have = new Set(d.items.map(function (i) { return i.hash; }));
                    if (group && !d.groups.some(function (g) { return g.id === group.id; })) d.groups.push(group);
                    chunkItems.forEach(function (it) { if (!have.has(it.hash)) d.items.push(it); });
                });
                lastRes = await repo.commit('capture: ' + chunkItems.length + '장 추가 (' + chunkItems[0].taken_at.slice(0, 10) + ')', files, j, onWait);
            }
            return lastRes;
        })();
        showProg();
        background(job).catch(function () {});
    });

    // 보기용 사본: 가로 1080px webp. 원본이 이미 작거나, 너무 길어서 브라우저가 못 그리면 만들지 않음
    async function makeView(file, size) {
        try {
            if (size < 450 * 1024 || !window.createImageBitmap) return null;
            var bmp = await createImageBitmap(file);
            var scale = Math.min(1, 1080 / bmp.width), w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
            if (w * h > 16000000 || h > 16000) { bmp.close && bmp.close(); return null; }
            var c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d').drawImage(bmp, 0, 0, w, h);
            bmp.close && bmp.close();
            var blob = await new Promise(function (r) { c.toBlob(r, 'image/webp', 0.85); });
            if (!blob || blob.type !== 'image/webp') blob = await new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.86); });
            if (!blob || blob.size > size * 0.8) return null;
            return { bytes: new Uint8Array(await blob.arrayBuffer()), ext: blob.type === 'image/webp' ? 'webp' : 'jpg' };
        } catch (e) { console.warn('view', e); return null; }
    }

    function extOf(file) {
        var m = /\.([a-z0-9]{2,5})$/i.exec(file.name);
        if (m) return m[1].toLowerCase();
        var t = (file.type || '').split('/')[1] || 'png';
        return t === 'jpeg' ? 'jpg' : t;
    }

    async function sha256(bytes) {
        var buf = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    /* ---------------- 날짜 인식 ---------------- */
    function detectTime(file, bytes) {
        var meta = readMetaTime(bytes);
        if (meta) return meta;
        var byName = timeFromName(file.name);
        if (byName) return { at: byName, src: 'name' };
        return { at: localISO(new Date(file.lastModified || Date.now())), src: 'file' };
    }

    function validAt(y, mo, d, h, mi, s) {
        y = +y; mo = +mo; d = +d; h = +(h || 0); mi = +(mi || 0); s = +(s || 0);
        if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return '';
        return y + '-' + pad(mo) + '-' + pad(d) + 'T' + pad(h) + ':' + pad(mi) + ':' + pad(s);
    }

    function timeFromName(name) {
        var m;
        // macOS 한국어: 스크린샷 2026-11-21 오후 2.02.30
        if ((m = /(20\d{2})-(\d{2})-(\d{2})\D{0,3}(오전|오후|AM|PM)\s*(\d{1,2})[.:](\d{2})[.:](\d{2})/i.exec(name))) {
            var h = +m[5] % 12; if (/오후|PM/i.test(m[4])) h += 12;
            return validAt(m[1], m[2], m[3], h, m[6], m[7]);
        }
        // Screenshot_20261121-140230, KakaoTalk_20261121_140230123, 2026-11-21 14.02.30, IMG_20261121_140230
        if ((m = /(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})[\sT_\-.]{0,3}(\d{2})[-_.:h]?(\d{2})[-_.:m]?(\d{2})/.exec(name))) {
            var v = validAt(m[1], m[2], m[3], m[4], m[5], m[6]); if (v) return v;
        }
        // 13자리 밀리초 타임스탬프 (예: 1781616166791.png)
        if ((m = /(?:^|\D)(1[6-9]\d{11})(?:\D|$)/.exec(name))) return localISO(new Date(+m[1]));
        return '';
    }

    function ascii(bytes, start, len) {
        var s = '';
        for (var i = start; i < start + len && i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
        return s;
    }
    function u32be(b, i) { return ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]; }

    function readMetaTime(b) {
        try {
            // JPEG
            if (b[0] === 0xFF && b[1] === 0xD8) {
                var i = 2;
                while (i + 4 < b.length && b[i] === 0xFF) {
                    var marker = b[i + 1], len = (b[i + 2] << 8) + b[i + 3];
                    if (marker === 0xE1 && ascii(b, i + 4, 4) === 'Exif') { var t = tiffTime(b, i + 10); if (t) return { at: t, src: 'exif' }; }
                    if (marker === 0xE1) { var x = xmpTime(ascii(b, i + 4, len)); if (x) return { at: x, src: 'xmp' }; }
                    if (marker === 0xDA) break;
                    i += 2 + len;
                }
            }
            // PNG
            if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') {
                var p = 8;
                while (p + 8 < b.length) {
                    var clen = u32be(b, p), type = ascii(b, p + 4, 4);
                    if (type === 'eXIf') { var t2 = tiffTime(b, p + 8); if (t2) return { at: t2, src: 'exif' }; }
                    if (type === 'iTXt' || type === 'tEXt') { var x2 = xmpTime(ascii(b, p + 8, Math.min(clen, 200000))); if (x2) return { at: x2, src: 'xmp' }; }
                    if (type === 'IEND') break;
                    p += 12 + clen;
                }
            }
            // WebP
            if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') {
                var q = 12;
                while (q + 8 < b.length) {
                    var wt = ascii(b, q, 4), wl = b[q + 4] + (b[q + 5] << 8) + (b[q + 6] << 16) + (b[q + 7] << 24);
                    if (wt === 'EXIF') { var off = ascii(b, q + 8, 4) === 'Exif' ? q + 14 : q + 8; var t3 = tiffTime(b, off); if (t3) return { at: t3, src: 'exif' }; }
                    if (wt === 'XMP ') { var x3 = xmpTime(ascii(b, q + 8, wl)); if (x3) return { at: x3, src: 'xmp' }; }
                    q += 8 + wl + (wl & 1);
                }
            }
        } catch (e) { console.warn('meta', e); }
        return null;
    }

    function xmpTime(s) {
        var m = /(?:DateTimeOriginal|DateCreated|CreateDate)[^0-9]{1,20}(20\d{2})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
        return m ? validAt(m[1], m[2], m[3], m[4], m[5], m[6]) : '';
    }

    // TIFF(EXIF) 블록에서 DateTimeOriginal → DateTimeDigitized → DateTime
    function tiffTime(b, base) {
        var le = b[base] === 0x49;
        function u16(o) { return le ? b[base + o] + (b[base + o + 1] << 8) : (b[base + o] << 8) + b[base + o + 1]; }
        function u32(o) { return le ? (b[base + o] + (b[base + o + 1] << 8) + (b[base + o + 2] << 16) + (b[base + o + 3] << 24)) >>> 0 : u32be(b, base + o); }
        function readIfd(off) {
            var out = {}, n = u16(off);
            if (n > 500) return out;
            for (var k = 0; k < n; k++) {
                var e = off + 2 + k * 12, tag = u16(e), cnt = u32(e + 4), valOff = cnt > 4 ? u32(e + 8) : e + 8;
                if (tag === 0x8769) out.exif = u32(e + 8);
                if (tag === 0x0132 || tag === 0x9003 || tag === 0x9004) out[tag] = ascii(b, base + valOff, Math.min(cnt, 32));
            }
            return out;
        }
        var ifd0 = readIfd(u32(4));
        var ex = ifd0.exif ? readIfd(ifd0.exif) : {};
        var s = ex[0x9003] || ex[0x9004] || ifd0[0x0132];
        var m = s && /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s);
        return m ? validAt(m[1], m[2], m[3], m[4], m[5], m[6]) : '';
    }

    // 이미지 크기 (화면이 덜 흔들리도록 저장)
    function imageSize(b) {
        try {
            if (b[0] === 0x89 && ascii(b, 1, 3) === 'PNG') return { w: u32be(b, 16), h: u32be(b, 20) };
            if (b[0] === 0xFF && b[1] === 0xD8) {
                var i = 2;
                while (i + 9 < b.length) {
                    if (b[i] !== 0xFF) { i++; continue; }
                    var mk = b[i + 1], len = (b[i + 2] << 8) + b[i + 3];
                    if (mk >= 0xC0 && mk <= 0xCF && mk !== 0xC4 && mk !== 0xC8 && mk !== 0xCC) return { h: (b[i + 5] << 8) + b[i + 6], w: (b[i + 7] << 8) + b[i + 8] };
                    i += 2 + len;
                }
            }
            if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') {
                var c = ascii(b, 12, 4);
                if (c === 'VP8X') return { w: 1 + b[24] + (b[25] << 8) + (b[26] << 16), h: 1 + b[27] + (b[28] << 8) + (b[29] << 16) };
                if (c === 'VP8 ') return { w: (b[26] + (b[27] << 8)) & 0x3fff, h: (b[28] + (b[29] << 8)) & 0x3fff };
                if (c === 'VP8L') { var v = b[21] + (b[22] << 8) + (b[23] << 16) + (b[24] << 24); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1 }; }
            }
        } catch (e) {}
        return null;
    }

    load();
})();
