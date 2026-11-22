/* ==========================================================================
   lightbox.js — 어느 카테고리든 사진을 누르면 화면 가득 크게 보기
   - 저장된 사진 전체를 잘리지 않게 (원래 비율), 여러 장이면 좌우로 넘기기 (‹ › · 밀기 · 키보드)
   - 폰: 두 손가락 확대, 꾹 눌러 저장 (브라우저 기본)
   - 꾸밈 그림(아이콘·캐릭터·배경·스티커 등 assets 폴더, 작은 그림)은 제외
   - 다른 코드에서: window.lightbox.open([주소...], 몇 번째, { onDelete(i) })  → 삭제 버튼이 생김
   ========================================================================== */
(function () {
    var GROUPS = '[data-lb-group], .mj-dedit, .mj-outfit-form, .mj-cimgs, .mj-diary, .mj-lib, .mj-libform, .mm-body, .dy-rte, .mj-bglist';
    var SKIP = '.mj-outfits, .mj-nav, .mj-icons, .mj-badge, .mj-ico, .mj-file, .mj-stickers, .mj-char, .mj-bgs, .mj-pick, .mj-dlg-bg, .lb-root, [data-nolb], button.dy-icon, button.dy-app, .dy-menu, #dy-menu';

    var el, imgEl, countEl, delBtn, list = [], idx = 0, opts = {};

    function build() {
        el = document.createElement('div');
        el.className = 'lb-root';
        el.innerHTML =
            '<button class="lb-x" aria-label="닫기">×</button>' +
            '<button class="lb-nav lb-prev" aria-label="이전">‹</button>' +
            '<div class="lb-stage"><img class="lb-img" alt=""></div>' +
            '<button class="lb-nav lb-next" aria-label="다음">›</button>' +
            '<div class="lb-foot"><span class="lb-count"></span><button class="lb-del">Delete</button></div>';
        document.body.appendChild(el);
        imgEl = el.querySelector('.lb-img'); countEl = el.querySelector('.lb-count'); delBtn = el.querySelector('.lb-del');
        el.addEventListener('click', function (e) {
            if (e.target.closest('.lb-prev')) return go(-1);
            if (e.target.closest('.lb-next')) return go(1);
            if (e.target.closest('.lb-del')) {
                var i = idx, cb = opts.onDelete; close();
                if (cb) cb(i);
                return;
            }
            if (e.target === imgEl) return;
            close();
        });
        // 밀어서 넘기기
        var sx = null;
        el.addEventListener('touchstart', function (e) { sx = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
        el.addEventListener('touchend', function (e) {
            if (sx == null || !e.changedTouches.length) return;
            var dx = e.changedTouches[0].clientX - sx; sx = null;
            if (Math.abs(dx) > 50 && list.length > 1) go(dx < 0 ? 1 : -1);
        });
        document.addEventListener('keydown', function (e) {
            if (!el.classList.contains('on')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') go(-1);
            if (e.key === 'ArrowRight') go(1);
        });
    }
    function show() {
        imgEl.src = list[idx];
        countEl.textContent = list.length > 1 ? (idx + 1) + ' / ' + list.length : '';
        el.classList.toggle('multi', list.length > 1);
        el.classList.toggle('can-del', !!opts.onDelete);
    }
    function go(d) { if (list.length < 2) return; idx = (idx + d + list.length) % list.length; show(); }
    function open(srcs, i, o) {
        if (!el) build();
        list = srcs.filter(Boolean); if (!list.length) return;
        idx = Math.max(0, Math.min(i || 0, list.length - 1)); opts = o || {};
        show();
        el.classList.add('on');
    }
    function close() { if (el) el.classList.remove('on'); opts = {}; }

    // 사진처럼 보여 줄 그림인지
    function isPhoto(img) {
        if (!img || img.tagName !== 'IMG') return false;
        if (img.closest(SKIP)) return false;
        var src = img.currentSrc || img.src || '';
        if (!src || /\/assets\//.test(src) || /\.svg(\?|$)/i.test(src)) return false;
        var r = img.getBoundingClientRect();
        return r.width >= 28 && r.height >= 28;
    }
    function galleryOf(img) {
        var g = img.closest(GROUPS);
        var imgs = g ? Array.prototype.filter.call(g.querySelectorAll('img'), isPhoto) : [img];
        if (imgs.indexOf(img) < 0) imgs = [img];
        return imgs;
    }

    // 사진을 누르면 크게 (다른 클릭 동작보다 먼저). 고치는 중인 본문(.mj-dedit)은 그쪽 코드가 직접 엶
    document.addEventListener('click', function (e) {
        var img = e.target;
        if (!img || img.tagName !== 'IMG' || !isPhoto(img)) return;
        if (!img.closest('#content-area')) return;
        if (img.closest('.mj-dedit')) return;
        if (img.closest('a[href]') && !img.closest(GROUPS)) return;     // 링크 걸린 그림은 링크대로
        e.preventDefault(); e.stopPropagation();
        var imgs = galleryOf(img);
        open(imgs.map(function (x) { return x.currentSrc || x.src; }), imgs.indexOf(img));
    }, true);

    window.lightbox = { open: open, close: close };
})();
