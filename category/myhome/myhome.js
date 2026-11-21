/* ==========================================================================
   마이홈 — 내 방 디오라마 + 가구별 해빗 트래커
   - 방: three.js (vendor/three), 좌우 360도 회전, 카메라 쪽 벽은 자동으로 숨김
   - 창문: 부산 동구의 해 뜨고 지는 시간 + 날씨(맑음/흐림/비/눈)를 반영 (Open-Meteo, 키 필요 없음)
   - 기록: 이 저장소의 myhome/myhome.json  { log: { 가구id: { 'YYYY-MM-DD': { d: 1, m: '메모' } } } }
   ========================================================================== */
import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { RoundedBoxGeometry } from '../../vendor/three/RoundedBoxGeometry.js';

/* ---------------- 가구 설정 (이름/기록할 행동/도장) — 가구마다 규칙 바꿀 곳 ---------------- */
// zone: 메뉴에서 묶어 보여줄 구역 (보통 집처럼)
const ZONES = ['현관', '주방', '거실', '침실', '욕실'];
const OBJECTS = {
    entrance: { zone: '현관', name: '현관',       act: '현관 정리',    emoji: '🚪' },
    shoes:    { zone: '현관', name: '신발장',     act: '신발 정리',    emoji: '👟' },
    sink:     { zone: '주방', name: '싱크대',     act: '설거지',       emoji: '🫧' },
    stove:    { zone: '주방', name: '인덕션',     act: '요리',         emoji: '🍳' },
    upper1:   { zone: '주방', name: '상부장 1',   act: '정리',         emoji: '✨' },
    upper2:   { zone: '주방', name: '상부장 2',   act: '정리',         emoji: '✨' },
    lower1:   { zone: '주방', name: '하부장 1',   act: '정리',         emoji: '✨' },
    lower2:   { zone: '주방', name: '하부장 2',   act: '정리',         emoji: '✨' },
    washer:   { zone: '주방', name: '세탁기',     act: '빨래',         emoji: '🧺' },
    fridge:   { zone: '주방', name: '냉장고',     act: '냉장고 정리',  emoji: '🧊' },
    table:    { zone: '거실', name: '식탁',       act: '밥 챙겨 먹기', emoji: '🍚' },
    books:    { zone: '거실', name: '책장',       act: '독서',         emoji: '📚' },
    drawer:   { zone: '거실', name: '서랍장',     act: '정리',         emoji: '🗂️' },
    desk:     { zone: '거실', name: '책상',       act: '공부',         emoji: '✏️' },
    bed:      { zone: '침실', name: '침대',       act: '이불 개기',    emoji: '🛏️' },
    vanity:   { zone: '침실', name: '화장대',     act: '스킨케어',     emoji: '🧴' },
    closet:   { zone: '침실', name: '옷장',       act: '옷 정리',      emoji: '👕' },
    bath:     { zone: '욕실', name: '화장실',     act: '화장실 청소',  emoji: '🛁' }
};

// 부산광역시 동구
const PLACE = { name: '부산 동구', lat: 35.1295, lon: 129.0454 };

// 메뉴에 들어올 때마다 새로 그림 (index.html의 작은 스크립트가 부름)
export function init() {
    const DATA = 'myhome/myhome.json';
    const repo = window.ghdb.repo();
    let db = { log: {} };

    /* ---------------- 방 크기 (도면 비율, 단위 m) ---------------- */
    const W = 3.2, D = 5.3, H = 2.35, T = 0.12;
    const X = x => x - W / 2, Z = z => z - D / 2;     // 도면 좌표(왼쪽 위 0,0) → 장면 좌표

    // 화이트 톤 + 연분홍 포인트만
    const C = {
        wall: 0xfffdfb, base: 0xf3eff0, trim: 0xf2b8c6, skirting: 0xf2eeec,
        white: 0xffffff, off: 0xfaf8f6, soft: 0xf1eeec, gray: 0xdedbd9, steel: 0xd3d7da, dark: 0x4f4b4d,
        pink: 0xf8d3dc, pinkMid: 0xf3b8c7, pinkDeep: 0xe99bb0, leaf: 0xa6d3a0, wood: 0xf0e6dc,
        oak: 0xecdcc8, oakDark: 0xdfcab1, silver: 0xe8ebee
    };

    /* ---------------- 기본 준비 ---------------- */
    const stage = document.getElementById('mh-stage');
    const canvas = document.getElementById('mh-canvas');
    const labelEl = document.getElementById('mh-label');

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(7.5, 8.2, 9.5);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.55, 0.15);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.12;
    controls.minDistance = 7; controls.maxDistance = 17;
    controls.rotateSpeed = 0.7;

    // 조명 (시간/날씨에 따라 아래 applySky에서 바뀜)
    const hemi = new THREE.HemisphereLight(0xffffff, 0xf4e9ec, 1.3); scene.add(hemi);
    const amb = new THREE.AmbientLight(0xffffff, 0.25); scene.add(amb);
    const sun = new THREE.DirectionalLight(0xfff5ea, 0.9);
    sun.position.set(2.5, 7, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -5; sun.shadow.camera.right = 5; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5;
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xf5f3ff, 0.28); fill.position.set(-5, 4, -4); scene.add(fill);
    const roomLamp = new THREE.PointLight(0xffd9b0, 0, 7, 1.4); roomLamp.position.set(0.2, 2.1, 0.4); scene.add(roomLamp);  // 밤에 켜지는 방 불빛

    /* ---------------- 모양 도우미 ---------------- */
    const matCache = {};
    function mat(color, opts) {
        const key = color + JSON.stringify(opts || {});
        if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0 }, opts || {}));
        return matCache[key];
    }
    function rbox(w, h, d, color, r, opts) {
        const rad = Math.min(r == null ? 0.05 : r, Math.min(w, h, d) / 2 - 0.001);
        const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.max(rad, 0.001)), mat(color, opts));
        m.castShadow = true; m.receiveShadow = true;
        return m;
    }
    function at(m, x, y, z) { m.position.set(x, y, z); return m; }
    function block(x0, x1, z0, z1, y0, h, color, r, opts) {
        return at(rbox(x1 - x0, h, z1 - z0, color, r, opts), X((x0 + x1) / 2), y0 + h / 2, Z((z0 + z1) / 2));
    }
    function cyl(rt, rb, h, color, seg) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), mat(color));
        m.castShadow = true; m.receiveShadow = true; return m;
    }
    function sphere(r, color, sx, sy, sz) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat(color));
        m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = true; return m;
    }
    // 손잡이 (가는 막대)
    function handle(x, y, z, vertical, len) {
        const h = rbox(vertical ? 0.025 : (len || 0.16), vertical ? (len || 0.16) : 0.025, 0.025, C.gray, 0.01);
        return at(h, x, y, z);
    }

    const clickable = [];
    function furniture(id, build, wallName) {
        const g = new THREE.Group();
        g.userData.id = id; if (wallName) g.userData.wall = wallName;
        build(g);
        const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
        g.children.forEach(ch => { ch.position.x -= c.x; ch.position.z -= c.z; ch.position.y -= box.min.y; });
        g.position.set(c.x, box.min.y, c.z);
        g.userData.top = box.max.y - box.min.y;
        scene.add(g); clickable.push(g);
        return g;
    }

    /* ---------------- 바닥 + 받침 (연분홍 테두리) ---------------- */
    function plankTexture() {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512;
        const g = c.getContext('2d');
        g.fillStyle = '#f7f2ee'; g.fillRect(0, 0, 512, 512);
        const rows = 8;
        for (let r = 0; r < rows; r++) {
            const y = r * 512 / rows, off = (r % 2) * 128 + (r % 3) * 40;
            g.fillStyle = r % 2 ? '#f4eee9' : '#f8f4f0';
            g.fillRect(0, y + 1, 512, 512 / rows - 2);
            g.fillStyle = '#ebe2dc';
            g.fillRect(0, y, 512, 1.5);
            for (let x = -off; x < 512; x += 256) g.fillRect(x, y, 1.5, 512 / rows);
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 2.6); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
        return t;
    }
    scene.add(at(rbox(W + T * 2 + 0.06, 0.3, D + T * 2 + 0.06, C.base, 0.05), 0, -0.17, 0));
    // 받침 윗면 둘레 연분홍 선
    [[W + T * 2 + 0.08, 0.02, 0, -(D / 2 + T + 0.03)], [W + T * 2 + 0.08, 0.02, 0, D / 2 + T + 0.03]].forEach(([w, d, x, z]) =>
        scene.add(at(rbox(w, 0.025, d, C.trim, 0.008), x, -0.025, z)));
    [-(W / 2 + T + 0.03), W / 2 + T + 0.03].forEach(x => scene.add(at(rbox(0.02, 0.025, D + T * 2 + 0.08, C.trim, 0.008), x, -0.025, 0)));
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, D), new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.9 }));
    floor.receiveShadow = true; at(floor, 0, -0.01, 0); scene.add(floor);

    /* ---------------- 벽 (카메라 쪽 벽은 숨김) ---------------- */
    const walls = [], wallByName = {};
    function wall(name, normal, build) {
        const g = new THREE.Group(); g.userData.normal = normal; build(g); scene.add(g); walls.push(g); wallByName[name] = g; return g;
    }
    function wallSlab(w, h, d) {
        const g = new THREE.Group();
        g.add(at(rbox(w, h, d, C.wall, 0.02), 0, h / 2, 0));
        g.add(at(rbox(w + 0.01, 0.1, d + 0.02, C.skirting, 0.015), 0, 0.05, 0));
        g.add(at(rbox(w + 0.02, 0.025, d + 0.02, C.trim, 0.008), 0, h + 0.012, 0));     // 벽 윗면 연분홍 선
        return g;
    }
    // 위쪽 벽: 환풍구 + 닫힌 수납장 두 개
    wall('N', new THREE.Vector3(0, 0, -1), g => {
        g.add(at(wallSlab(W + T * 2, H, T), 0, 0, Z(0) - T / 2));
        g.add(at(rbox(0.7, 0.2, 0.46, C.white, 0.04), X(0.52), 1.68, Z(0.23)));                         // 후드
        g.add(at(rbox(0.72, 0.035, 0.48, C.soft, 0.012), X(0.52), 1.575, Z(0.24)));
        g.add(at(rbox(0.3, H - 1.78, 0.26, C.white, 0.03), X(0.52), 1.78 + (H - 1.78) / 2, Z(0.13)));  // 덕트
        g.add(at(rbox(0.2, 0.01, 0.06, 0xfff6dc, 0.004, { emissive: 0xfff3cf, emissiveIntensity: 0.7 }), X(0.52), 1.555, Z(0.3)));
    });
    // 아래쪽 벽: 창문 (하늘은 시간/날씨로 바뀜)
    let skyTex, skyCanvas, weatherFX;
    wall('S', new THREE.Vector3(0, 0, 1), g => {
        g.add(at(wallSlab(W + T * 2, H, T), 0, 0, Z(D) + T / 2));
        g.add(at(rbox(1.96, 1.15, 0.08, C.white, 0.04), X(1.71), 1.48, Z(D) - 0.03));
        skyCanvas = document.createElement('canvas'); skyCanvas.width = 256; skyCanvas.height = 144;
        skyTex = new THREE.CanvasTexture(skyCanvas); skyTex.colorSpace = THREE.SRGBColorSpace;
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), new THREE.MeshBasicMaterial({ map: skyTex }));
        at(glass, X(1.71), 1.48, Z(D) - 0.075); glass.rotation.y = Math.PI; g.add(glass);
        g.add(at(rbox(0.04, 1.0, 0.03, C.white, 0.01), X(1.71), 1.48, Z(D) - 0.09));
        g.add(at(rbox(2.1, 0.05, 0.16, C.white, 0.02), X(1.71), 0.9, Z(D) - 0.08));
        [X(0.62), X(2.8)].forEach(cx => g.add(at(rbox(0.26, 1.45, 0.07, C.pink, 0.035), cx, 1.42, Z(D) - 0.12)));
        const rod = cyl(0.015, 0.015, 2.6, C.gray); rod.rotation.z = Math.PI / 2; g.add(at(rod, X(1.71), 2.17, Z(D) - 0.12));
        weatherFX = new THREE.Group(); g.add(weatherFX);
    });
    wall('W', new THREE.Vector3(-1, 0, 0), g => g.add(at(wallSlab(T, H, D), X(0) - T / 2, 0, 0)));
    wall('E', new THREE.Vector3(1, 0, 0), g => g.add(at(wallSlab(T, H, D), X(W) + T / 2, 0, 0)));

    /* ---------------- 부엌 (올 화이트) ---------------- */
    scene.add(block(0, 2.1, 0, 0.62, 0, 0.86, C.white, 0.04));
    scene.add(block(-0.01, 2.11, -0.01, 0.65, 0.86, 0.05, C.off, 0.02));        // 상판
    // 상부장 2개 (따로지만 딱 붙어 있음) / 하부장 2개 — 각각 눌러서 '정리' 기록
    [['upper1', 0.94, 1.51], ['upper2', 1.51, 2.08]].forEach(([id, x0, x1]) => furniture(id, g => {
        g.add(block(x0, x1, 0, 0.34, 1.36, 0.62, C.white, 0.02));
        g.add(block(x0 + 0.015, x1 - 0.015, 0.34, 0.355, 1.375, 0.59, C.off, 0.012));
        g.add(handle(X(id === 'upper1' ? x1 - 0.07 : x0 + 0.07), 1.46, Z(0.37), true, 0.14));
    }, 'N'));
    [['lower1', 0.98, 1.535], ['lower2', 1.535, 2.09]].forEach(([id, x0, x1]) => furniture(id, g => {
        g.add(block(x0 + 0.005, x1 - 0.005, 0.6, 0.635, 0.08, 0.7, C.off, 0.012));
        g.add(handle(X(id === 'lower1' ? x1 - 0.07 : x0 + 0.07), 0.6, Z(0.65), true, 0.14));
    }));
    furniture('stove', g => {
        g.add(block(0.18, 0.86, 0.08, 0.56, 0.91, 0.03, C.dark, 0.012, { roughness: 0.3 }));
        [[0.36, 0.22], [0.66, 0.4]].forEach(([x, z]) => {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.008, 8, 32), mat(0xf3a5b5, { emissive: 0xec8aa0, emissiveIntensity: 0.35 }));
            ring.rotation.x = Math.PI / 2; g.add(at(ring, X(x), 0.945, Z(z)));
        });
    });
    furniture('sink', g => {
        g.add(block(0.98, 1.72, 0.1, 0.52, 0.86, 0.065, C.steel, 0.03, { roughness: 0.3, metalness: 0.25 }));
        g.add(block(1.03, 1.67, 0.14, 0.48, 0.89, 0.03, 0xc5cacf, 0.012, { roughness: 0.3, metalness: 0.25 }));
        g.add(at(cyl(0.022, 0.022, 0.28, C.steel), X(1.35), 1.05, Z(0.06)));
        const spout = cyl(0.02, 0.02, 0.18, C.steel); spout.rotation.x = Math.PI / 2; g.add(at(spout, X(1.35), 1.18, Z(0.14)));
    });
    furniture('washer', g => {
        g.add(block(0.12, 0.84, 0.58, 0.64, 0.06, 0.74, C.white, 0.04));
        const door = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 36), mat(0xe3edf3, { roughness: 0.15 }));
        door.rotation.x = Math.PI / 2; g.add(at(door, X(0.48), 0.4, Z(0.655)));
        g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 10, 36), mat(C.gray)), X(0.48), 0.4, Z(0.665)));
        g.add(at(sphere(0.02, C.pinkDeep), X(0.74), 0.7, Z(0.65)));
    });

    /* ---------------- 현관 / 화장실 ---------------- */
    furniture('entrance', g => {
        g.add(block(2.15, 3.2, 0, 0.3, -0.02, 0.03, 0xe9e6e4, 0.008));              // 현관 바닥 타일
        g.add(at(rbox(0.82, 2.0, 0.06, C.silver, 0.03, { roughness: 0.45 }), X(2.68), 1.0, Z(0) + 0.03));    // 현관문 (옅은 실버)
        g.add(handle(X(2.68) - 0.3, 1.0, Z(0) + 0.08, false, 0.12));
    }, 'N');
    // 신발장: 현관 앞 오른쪽 벽, 싱크대만큼 나와 있음
    furniture('shoes', g => {
        g.add(block(2.58, 3.2, 0.32, 1.12, 0, 1.0, C.white, 0.04));
        [[0.34, 0.715], [0.725, 1.1]].forEach(([z0, z1], i) => {
            g.add(block(2.565, 2.58, z0, z1, 0.06, 0.9, C.off, 0.012));
            g.add(handle(X(2.55), 0.82, Z(i ? z0 + 0.06 : z1 - 0.06), true, 0.14));
        });
    });
    furniture('bath', g => {
        g.add(at(rbox(0.06, 2.0, 0.84, C.oak, 0.03), X(W) - 0.03, 1.0, Z(1.63)));      // 화장실 문 (우드)
        g.add(handle(X(W) - 0.08, 1.0, Z(1.3), false, 0.12));
    }, 'E');

    /* ---------------- 냉장고(아래) + 서랍장 + 책장(위) — 앞면은 부엌 쪽 ---------------- */
    const U0 = 0.04, U1 = 1.0, UZ0 = 1.76, UZ1 = 2.54;
    furniture('fridge', g => {
        g.add(block(U0, U1, UZ0, UZ1, 0, 0.84, C.white, 0.05));
        g.add(block(U0 + 0.04, U1 - 0.04, UZ0 - 0.02, UZ0 + 0.01, 0.05, 0.36, C.off, 0.02));
        g.add(block(U0 + 0.04, U1 - 0.04, UZ0 - 0.02, UZ0 + 0.01, 0.43, 0.37, C.off, 0.02));
        g.add(handle(X(U1 - 0.12), 0.32, Z(UZ0 - 0.035), true, 0.16));
        g.add(handle(X(U1 - 0.12), 0.7, Z(UZ0 - 0.035), true, 0.16));
    });
    furniture('drawer', g => {
        g.add(block(U0, U1, UZ0, UZ1, 0.84, 0.4, C.white, 0.04));
        [0.88, 1.06].forEach(y => {
            g.add(block(U0 + 0.04, U1 - 0.04, UZ0 - 0.02, UZ0 + 0.01, y, 0.15, C.off, 0.02));
            g.add(handle(X((U0 + U1) / 2), y + 0.08, Z(UZ0 - 0.035), false, 0.18));
        });
    });
    furniture('books', g => {
        g.add(block(U0, U1, UZ0, UZ1, 1.24, 0.52, C.white, 0.04));
        g.add(block(U0 + 0.05, U1 - 0.05, UZ0 - 0.005, UZ1 - 0.06, 1.29, 0.42, C.soft, 0.02));
        const cols = [C.pinkMid, C.white, C.pink, C.gray, C.pinkDeep, C.white, C.pink, C.soft, C.pinkMid];
        let x = U0 + 0.08;
        cols.forEach((col, i) => {
            const w = 0.07 + (i % 3) * 0.012, h = 0.26 + (i % 4) * 0.03;
            g.add(at(rbox(w, h, 0.3, col, 0.012), X(x + w / 2), 1.3 + h / 2, Z(UZ0 + 0.2)));
            x += w + 0.01;
        });
    });
    furniture('table', g => {
        g.add(block(1.0, 1.96, 1.88, 2.42, 0.68, 0.05, C.white, 0.02));
        [[1.9, 1.94], [1.9, 2.36]].forEach(([x, z]) => g.add(at(cyl(0.022, 0.022, 0.68, C.soft), X(x), 0.34, Z(z))));
    });

    /* ---------------- 침대 (머리는 창문 쪽) ---------------- */
    furniture('bed', g => {
        g.add(block(0.02, 1.56, 2.62, 5.24, 0, 0.28, C.off, 0.06));
        g.add(block(0.02, 1.56, 5.12, 5.24, 0, 0.82, C.white, 0.05));                  // 머리판
        g.add(block(0.07, 1.51, 2.66, 5.12, 0.28, 0.2, C.white, 0.08));                // 매트리스
        g.add(block(0.05, 1.53, 2.64, 4.4, 0.4, 0.14, C.pink, 0.07));                  // 이불
        g.add(block(0.05, 1.53, 4.26, 4.42, 0.41, 0.15, C.white, 0.06));              // 이불 끝 접힘
        [0.42, 1.14].forEach(x => g.add(at(rbox(0.58, 0.16, 0.36, C.white, 0.08), X(x), 0.56, Z(4.82))));
    });

    /* ---------------- 오른쪽: 화장대 / 책상 / 옷장 ---------------- */
    furniture('vanity', g => {
        g.add(block(2.62, 3.18, 2.3, 3.1, 0.7, 0.05, C.white, 0.02));
        [[2.66, 2.34], [2.66, 3.06]].forEach(([x, z]) => g.add(at(cyl(0.02, 0.02, 0.7, C.soft), X(x), 0.35, Z(z))));
        g.add(block(2.95, 3.16, 2.34, 3.06, 0.3, 0.38, C.white, 0.03));
        [[3.0, 2.5, C.pinkMid, 0.13], [3.04, 2.62, C.white, 0.1], [3.0, 2.85, C.pink, 0.11]].forEach(([x, z, col, h]) =>
            g.add(at(cyl(0.032, 0.036, h, col), X(x), 0.75 + h / 2, Z(z))));
    });
    furniture('desk', g => {
        g.add(block(2.55, 3.18, 3.2, 4.28, 0.72, 0.05, C.oak, 0.02));
        [[2.6, 3.25], [2.6, 4.23], [3.13, 3.25], [3.13, 4.23]].forEach(([x, z]) => g.add(at(cyl(0.022, 0.022, 0.72, C.oakDark), X(x), 0.36, Z(z))));
        g.add(at(rbox(0.3, 0.02, 0.4, C.gray, 0.01), X(2.8), 0.78, Z(3.7)));
        const screen = rbox(0.02, 0.26, 0.4, C.dark, 0.01); screen.rotation.z = -0.25; g.add(at(screen, X(2.98), 0.91, Z(3.7)));
    });
    furniture('closet', g => {
        g.add(block(2.62, 3.18, 4.34, 5.27, 0, 2.0, C.white, 0.05));
        [[4.38, 4.79], [4.82, 5.23]].forEach(([z0, z1]) => {
            g.add(block(2.585, 2.62, z0, z1, 0.08, 1.84, C.off, 0.015));
            g.add(handle(X(2.565), 1.05, Z(z0 < 4.8 ? z1 - 0.06 : z0 + 0.06), true, 0.22));
        });
    });

    // 창가 화분 하나만
    scene.add(at(cyl(0.12, 0.09, 0.22, C.white), X(2.2), 0.11, Z(5.0)));
    [[0, 0.4, 0, 0.17], [-0.07, 0.55, 0.04, 0.13], [0.08, 0.5, -0.04, 0.12]].forEach(([dx, y, dz, r]) =>
        scene.add(at(sphere(r, C.leaf), X(2.2) + dx, y, Z(5.0) + dz)));

    /* ==========================================================================
       하늘 / 날씨 (창문 + 방 밝기)
       ========================================================================== */
    let weather = null;     // Open-Meteo 응답
    let sky = { phase: 'day', kind: 'clear' };
    const WMO = c => c === 0 ? 'clear' : c <= 2 ? 'partly' : c === 3 ? 'cloudy' : c <= 48 ? 'fog'
        : (c >= 71 && c <= 77) || c === 85 || c === 86 ? 'snow' : c >= 95 ? 'storm' : 'rain';
    const KIND_TXT = { clear: '맑음', partly: '구름 조금', cloudy: '흐림', fog: '안개', rain: '비', snow: '눈', storm: '뇌우' };
    const KIND_IC = { clear: '☀️', partly: '⛅', cloudy: '☁️', fog: '🌫️', rain: '🌧️', snow: '❄️', storm: '⛈️' };

    function phaseNow() {
        const now = new Date();
        let rise, set;
        if (weather && weather.daily && weather.daily.sunrise) { rise = new Date(weather.daily.sunrise[0]); set = new Date(weather.daily.sunset[0]); }
        else { rise = new Date(now); rise.setHours(7, 10, 0, 0); set = new Date(now); set.setHours(17, 20, 0, 0); }   // 받기 전 대략값
        const m = 40 * 60000;
        if (now < rise - m || now > set.getTime() + m) return 'night';
        if (Math.abs(now - rise) <= m) return 'dawn';
        if (Math.abs(now - set) <= m) return 'dusk';
        return 'day';
    }

    function drawSky() {
        const g = skyCanvas.getContext('2d'), w = skyCanvas.width, h = skyCanvas.height;
        const P = {
            day:   ['#9fd0f2', '#d8eefb'], dawn: ['#f6c9d5', '#fde8d8'],
            dusk:  ['#d9a6c9', '#f8c7b5'], night: ['#1f2a4a', '#3b4a72']
        }[sky.phase];
        const grey = ['cloudy', 'fog', 'rain', 'storm', 'snow'].includes(sky.kind);
        const top = grey ? (sky.phase === 'night' ? '#2a2f3d' : '#b9c1ca') : P[0];
        const bot = grey ? (sky.phase === 'night' ? '#3e4453' : '#dde2e6') : P[1];
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(1, bot);
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        if (sky.phase === 'night') {
            if (!grey) { g.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 26; i++) g.fillRect((i * 97) % w, (i * 53) % (h * 0.7), 1.5, 1.5); }
            g.fillStyle = grey ? 'rgba(255,250,230,.35)' : '#fff6d8'; g.beginPath(); g.arc(w * 0.72, h * 0.3, 11, 0, 7); g.fill();
        } else if (!grey) {
            g.fillStyle = sky.phase === 'day' ? 'rgba(255,248,215,.95)' : 'rgba(255,225,200,.95)';
            g.beginPath(); g.arc(w * 0.25, sky.phase === 'day' ? h * 0.28 : h * 0.75, 14, 0, 7); g.fill();
        }
        if (sky.kind !== 'clear') {
            g.fillStyle = sky.phase === 'night' ? 'rgba(120,130,150,.55)' : 'rgba(255,255,255,.85)';
            const n = sky.kind === 'partly' ? 2 : 4;
            for (let i = 0; i < n; i++) {
                const cx = (i * 71 + 30) % w, cy = 18 + (i % 2) * 20;
                [[0, 0, 14], [12, -5, 12], [24, 0, 13], [10, 5, 12]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, 7); g.fill(); });
            }
        }
        // 건물 실루엣 살짝 (아래쪽)
        g.fillStyle = sky.phase === 'night' ? 'rgba(20,25,45,.7)' : 'rgba(255,255,255,.55)';
        [[0, 40], [30, 28], [52, 48], [88, 34], [120, 52], [160, 30], [190, 44], [225, 36]].forEach(([x, hh]) => g.fillRect(x, h - hh, 26, hh));
        if (sky.phase === 'night') {
            g.fillStyle = 'rgba(255,220,150,.75)';
            for (let i = 0; i < 14; i++) g.fillRect((i * 37) % w + 6, h - 8 - (i * 13) % 30, 3, 3);
        }
        skyTex.needsUpdate = true;
    }

    // 비/눈 (창문 안쪽에서만 보이게)
    let drops = null;
    function setWeatherFX() {
        weatherFX.clear(); drops = null;
        const kind = sky.kind;
        if (!['rain', 'storm', 'snow'].includes(kind)) return;
        const snow = kind === 'snow', N = snow ? 70 : 90;
        const pos = new Float32Array(N * (snow ? 3 : 6));
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const m = snow ? new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.9 })
            : new THREE.LineBasicMaterial({ color: 0xdfe9f2, transparent: true, opacity: 0.7 });
        const obj = snow ? new THREE.Points(geo, m) : new THREE.LineSegments(geo, m);
        weatherFX.add(obj);
        const seeds = [];
        for (let i = 0; i < N; i++) seeds.push({ x: Math.random(), y: Math.random(), v: snow ? 0.12 + Math.random() * 0.1 : 1.4 + Math.random() * 0.8, p: Math.random() * 6 });
        drops = { snow, seeds, geo, pos };
    }
    function stepWeatherFX(dt) {
        if (!drops) return;
        const x0 = X(0.82), x1 = X(2.6), y0 = 0.98, y1 = 1.98, z = Z(D) - 0.085;
        drops.seeds.forEach((s, i) => {
            s.y -= s.v * dt; if (s.y < 0) { s.y += 1; s.x = Math.random(); }
            const px = x0 + (x1 - x0) * s.x + (drops.snow ? Math.sin(s.p + s.y * 8) * 0.02 : 0), py = y0 + (y1 - y0) * s.y;
            if (drops.snow) { drops.pos[i * 3] = px; drops.pos[i * 3 + 1] = py; drops.pos[i * 3 + 2] = z; }
            else {
                drops.pos.set([px, py, z, px + 0.012, Math.max(y0, py - 0.07), z], i * 6);
            }
        });
        drops.geo.attributes.position.needsUpdate = true;
    }

    function applySky() {
        const phase = phaseNow();
        const kind = weather && weather.current ? WMO(weather.current.weather_code) : 'clear';
        const changedKind = kind !== sky.kind;
        sky = { phase, kind };
        drawSky();
        if (changedKind || !drops) setWeatherFX();
        const grey = ['cloudy', 'fog', 'rain', 'storm', 'snow'].includes(kind);
        const L = {   // 방 밝기
            day:   { hemi: 1.3, sun: 0.9, sunC: 0xfff5ea, amb: 0.25, lamp: 0 },
            dawn:  { hemi: 1.05, sun: 0.6, sunC: 0xffd9c7, amb: 0.22, lamp: 0.3 },
            dusk:  { hemi: 0.95, sun: 0.55, sunC: 0xffc6b0, amb: 0.2, lamp: 0.6 },
            night: { hemi: 0.45, sun: 0.12, sunC: 0x9fb2e6, amb: 0.12, lamp: 2.2 }
        }[phase];
        hemi.intensity = L.hemi * (grey ? 0.88 : 1);
        hemi.color.set(phase === 'night' ? 0xc9d2f0 : 0xffffff);
        sun.intensity = L.sun * (grey ? 0.45 : 1); sun.color.set(L.sunC);
        amb.intensity = L.amb;
        roomLamp.intensity = L.lamp;
        drawWeatherChip();
    }

    async function loadWeather() {
        try {
            const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + PLACE.lat + '&longitude=' + PLACE.lon +
                '&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max' +
                '&timezone=Asia%2FSeoul&forecast_days=7';
            const res = await fetch(url);
            if (!res.ok) throw new Error(res.status);
            weather = await res.json();
        } catch (e) { console.warn('날씨를 못 받았어요', e); }
        applySky();
    }

    function drawWeatherChip() {
        const el = document.getElementById('mh-weather');
        if (!el) return;
        if (!weather || !weather.current) { el.classList.remove('on'); return; }
        const k = WMO(weather.current.weather_code);
        el.innerHTML = KIND_IC[k] + ' <b>' + Math.round(weather.current.temperature_2m) + '°</b> <small>' + PLACE.name + '</small>';
        el.classList.add('on');
    }

    applySky();
    loadWeather();
    const skyTimer = setInterval(() => { if (!canvas.isConnected) { clearInterval(skyTimer); return; } applySky(); }, 5 * 60000);
    const wxTimer = setInterval(() => { if (!canvas.isConnected) { clearInterval(wxTimer); return; } loadWeather(); }, 30 * 60000);

    /* ---------------- 화면 크기 / 렌더 ---------------- */
    function resize() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w / h < 1 ? 34 : 30;
        camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize); ro.observe(stage); resize();

    const camDir = new THREE.Vector3();
    function updateWalls() {
        camDir.copy(camera.position).sub(controls.target).setY(0).normalize();
        walls.forEach(w => { w.visible = w.userData.normal.dot(camDir) < 0.25; });
        clickable.forEach(g => { if (g.userData.wall) g.visible = wallByName[g.userData.wall].visible; });
    }

    /* ---------------- 누르기 / 가리키기 ---------------- */
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    let hovered = null, downAt = null;
    function pick(ev) {
        const r = canvas.getBoundingClientRect();
        ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ptr, camera);
        for (const h of ray.intersectObjects(clickable, true)) {
            let o = h.object;
            while (o && !o.userData.id) o = o.parent;
            if (o && o.visible) return o;
        }
        return null;
    }
    function setHover(g) {
        if (hovered === g) return;
        hovered = g;
        canvas.classList.toggle('is-hover', !!g);
        if (!g) { labelEl.classList.remove('on'); return; }
        const o = OBJECTS[g.userData.id], done = isDone(g.userData.id, todayKey());
        labelEl.innerHTML = o.name + (done ? '<span class="n">오늘 ✓</span>' : '');
        labelEl.classList.add('on');
    }
    canvas.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') setHover(pick(ev)); });
    canvas.addEventListener('pointerleave', () => setHover(null));
    canvas.addEventListener('pointerdown', ev => { downAt = { x: ev.clientX, y: ev.clientY }; closeList(); });
    canvas.addEventListener('pointerup', ev => {
        if (!downAt) return;
        const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y);
        downAt = null;
        if (moved > 8) return;
        const g = pick(ev);
        if (!g) { setHover(null); return; }
        setHover(g);
        g.userData.bounce = 1;
        setTimeout(() => openCard(g.userData.id), 140);
    });

    const tmp = new THREE.Vector3();
    function placeLabel() {
        if (!hovered) return;
        tmp.set(hovered.position.x, hovered.position.y + hovered.userData.top + 0.12, hovered.position.z).project(camera);
        labelEl.style.left = ((tmp.x + 1) / 2 * stage.clientWidth) + 'px';
        labelEl.style.top = ((1 - tmp.y) / 2 * stage.clientHeight) + 'px';
    }

    /* ---------------- 오른쪽 아래 막대: 목록 / 회전 / 확대 ---------------- */
    let camAnim = null;
    const sph = new THREE.Spherical();
    function moveCam(dTheta, zoom) {
        sph.setFromVector3(camera.position.clone().sub(controls.target));
        const r1 = Math.min(controls.maxDistance, Math.max(controls.minDistance, sph.radius * zoom));
        camAnim = { t: 0, th0: sph.theta, th1: sph.theta + dTheta, r0: sph.radius, r1, phi: sph.phi };
    }
    function stepCam(dt) {
        if (!camAnim) return;
        camAnim.t = Math.min(1, camAnim.t + dt * 2.6);
        const e = 1 - Math.pow(1 - camAnim.t, 3);
        sph.set(camAnim.r0 + (camAnim.r1 - camAnim.r0) * e, camAnim.phi, camAnim.th0 + (camAnim.th1 - camAnim.th0) * e);
        camera.position.setFromSpherical(sph).add(controls.target);
        if (camAnim.t >= 1) camAnim = null;
    }
    const listEl = document.getElementById('mh-list');
    function closeList() { listEl.classList.remove('open'); document.querySelector('[data-cam=list]').classList.remove('on'); }
    function toggleList() {
        drawList();
        const open = !listEl.classList.contains('open');
        listEl.classList.toggle('open', open);
        document.querySelector('[data-cam=list]').classList.toggle('on', open);
        // 아래에서부터 차례로 좌르르
        const items = Array.from(listEl.children).reverse();
        items.forEach((s, i) => { s.style.transitionDelay = open ? (i * 25) + 'ms' : '0ms'; });
    }
    document.getElementById('mh-ctrl').addEventListener('click', e => {
        const b = e.target.closest('[data-cam]'); if (!b) return;
        const a = b.dataset.cam;
        if (a === 'list') { toggleList(); return; }
        ({ left: () => moveCam(Math.PI / 4, 1), right: () => moveCam(-Math.PI / 4, 1), out: () => moveCam(0, 1.18), in: () => moveCam(0, 0.85) })[a]();
    });
    listEl.addEventListener('click', e => { const s = e.target.closest('[data-id]'); if (s) { closeList(); openCard(s.dataset.id); } });
    document.getElementById('mh-weather').addEventListener('click', openWeek);

    const clock = new THREE.Clock();
    function tick() {
        if (!canvas.isConnected) { ro.disconnect(); renderer.dispose(); return; }   // 다른 메뉴로 가면 정지
        requestAnimationFrame(tick);
        const dt = Math.min(clock.getDelta(), 0.05);
        stepCam(dt);
        controls.update();
        updateWalls();
        stepWeatherFX(dt);
        clickable.forEach(g => {
            const target = g === hovered ? 1.03 : 1;
            const s = g.scale.x + (target - g.scale.x) * Math.min(1, dt * 12);
            if (g.userData.bounce > 0) {
                g.userData.bounce = Math.max(0, g.userData.bounce - dt * 3.2);
                const b = g.userData.bounce;
                g.scale.set(s * (1 + Math.sin(b * Math.PI) * 0.05), s * (1 - Math.sin(b * Math.PI * 2) * 0.07), s * (1 + Math.sin(b * Math.PI) * 0.05));
            } else g.scale.setScalar(s);
        });
        placeLabel();
        renderer.render(scene, camera);
    }
    document.getElementById('mh-loading').remove();
    tick();


    /* ==========================================================================
       기록 (해빗 트래커)
       ========================================================================== */
    const pad = n => String(n).padStart(2, '0');
    const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const todayKey = () => keyOf(new Date());
    const rec = (id, k) => (db.log[id] || {})[k];
    const isDone = (id, k) => !!(rec(id, k) && rec(id, k).done);
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const MON_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    /* 저장 형식 (myhome/README.md 참고) — 나중에 리포트/통계에서 그대로 불러 쓰기 좋게
       { version: 1, updated_at, place, zones, objects: { id: {zone,name,act,emoji} },
         log: { id: { 'YYYY-MM-DD': { done: true, memo: '...', at: '기록한 시각' } } } } */
    function stamp() { const d = new Date(), o = -d.getTimezoneOffset(); return new Date(d.getTime() + o * 60000).toISOString().slice(0, 19) + (o >= 0 ? '+' : '-') + pad(Math.floor(Math.abs(o) / 60)) + ':' + pad(Math.abs(o) % 60); }
    function normalize(d) {
        d = d && typeof d === 'object' ? d : {};
        d.log = d.log || {};
        Object.keys(d.log).forEach(id => Object.keys(d.log[id]).forEach(k => {     // 예전 짧은 키(d/m) → done/memo
            const r = d.log[id][k];
            if ('d' in r) { if (r.d) r.done = true; delete r.d; }
            if ('m' in r) { if (r.m) r.memo = r.m; delete r.m; }
        }));
        d.version = 1;
        d.place = PLACE.name;
        d.zones = ZONES;
        d.objects = JSON.parse(JSON.stringify(OBJECTS));
        return d;
    }
    async function load() {
        try { db = normalize(await repo.readJSON(DATA, { log: {} })); } catch (e) { console.error(e); }
        drawList();
        if (card) drawCard();
    }
    // 다른 기기에서 바꾼 기록도 보이게: 이 화면으로 돌아오면 다시 불러옴
    const onVisible = () => {
        if (!canvas.isConnected) { document.removeEventListener('visibilitychange', onVisible); return; }
        if (document.visibilityState === 'visible' && !pending && !(document.activeElement && document.activeElement.classList.contains('mh-memo-text'))) load();
    };
    document.addEventListener('visibilitychange', onVisible);

    // 저장: 화면 먼저, GitHub은 뒤에서
    let pending = 0;
    function setPending(n) {
        pending = n;
        const el = document.getElementById('mh-saving');
        if (el) { el.textContent = pending ? '저장 중…' : ''; el.classList.toggle('on', !!pending); }
    }
    function save(message, fn) {
        fn(db);
        if (!window.ghdb.hasToken()) { alert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); load().then(() => card && drawCard()); return; }
        setPending(pending + 1);
        const j = {}; j[DATA] = { mutate: cur => { cur = normalize(cur); fn(cur); cur.updated_at = stamp(); return cur; }, fallback: { log: {} } };
        repo.commit(message, {}, j).then(res => {
            setPending(pending - 1);
            if (!pending && res && res[DATA]) { db = normalize(res[DATA]); drawList(); if (card) drawCard(); }
        }, e => {
            setPending(pending - 1);
            alert('저장하지 못했어요.\n' + (e.message || e));
            load().then(() => card && drawCard());
        });
    }
    function setRec(id, k, patch) {
        db.log[id] = db.log[id] || {};
        const cur = Object.assign({}, db.log[id][k] || {}, patch);
        if (!cur.done && !cur.memo) delete db.log[id][k]; else db.log[id][k] = cur;
    }

    function drawList() {
        const tday = todayKey();
        document.getElementById('mh-list').innerHTML = ZONES.map(z =>
            '<em>' + z + '</em>' + Object.keys(OBJECTS).filter(id => OBJECTS[id].zone === z).map(id =>
                '<span data-id="' + id + '" class="' + (isDone(id, tday) ? 'done' : '') + '">' + OBJECTS[id].name + '</span>').join('')
        ).join('');
    }

    /* ---------------- 카드 ---------------- */
    let card = null;   // { id, y, m, sel }
    const bg = document.getElementById('mh-card-bg'), cardEl = document.getElementById('mh-card');

    function openCard(id) {
        const now = new Date();
        card = { id, y: now.getFullYear(), m: now.getMonth(), sel: todayKey() };
        bg.style.display = 'flex';
        drawCard();
    }
    function closeCard() { bg.style.display = 'none'; card = null; drawList(); }
    bg.addEventListener('click', e => { if (e.target === bg) closeCard(); });

    function streak(id) {
        let n = 0; const d = new Date();
        if (!isDone(id, keyOf(d))) d.setDate(d.getDate() - 1);   // 오늘 아직이면 어제부터 셈
        while (isDone(id, keyOf(d))) { n++; d.setDate(d.getDate() - 1); }
        return n;
    }

    function drawCard() {
        const o = OBJECTS[card.id], y = card.y, m = card.m, t = todayKey();
        const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate();
        let monthCount = 0;
        let cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(w => '<div class="mh-wd">' + w + '</div>').join('');
        for (let i = 0; i < first; i++) cells += '<div class="mh-day empty"></div>';
        for (let d = 1; d <= last; d++) {
            const k = y + '-' + pad(m + 1) + '-' + pad(d), r = rec(card.id, k) || {};
            if (r.done) monthCount++;
            const cls = ['mh-day', r.done ? 'done' : '', k === t ? 'is-today' : '', k > t ? 'future' : '', k === card.sel ? 'sel' : '', r.memo ? 'has-memo' : ''].join(' ');
            cells += '<div class="' + cls + '" data-k="' + k + '">' + (r.done ? o.emoji : d) + '</div>';
        }
        const sel = card.sel, sr = rec(card.id, sel) || {}, sd = new Date(sel + 'T00:00:00');
        const canStamp = sel <= t;
        cardEl.innerHTML =
            '<div class="mh-head"><span class="mh-title"><b>' + esc(o.name) + '</b> · ' + MONTH_EN[m] + '</span>' +
            '<span class="mh-today">today · ' + MON_EN[new Date().getMonth()] + ' ' + new Date().getDate() + '</span></div>' +
            '<div class="mh-sub"><span class="mh-nav" data-nav="-1">‹</span><span>' + o.emoji + ' ' + esc(o.act) + ' · ' + y + '.' + pad(m + 1) + '</span><span class="mh-nav" data-nav="1">›</span></div>' +
            '<div class="mh-grid">' + cells + '</div>' +
            '<div class="mh-memo"><span class="mh-memo-date">' + MON_EN[sd.getMonth()] + ' ' + sd.getDate() + '</span>' +
            '<textarea class="mh-memo-text" rows="1" placeholder="메모를 남겨요…">' + esc(sr.memo || '') + '</textarea></div>' +
            '<div class="mh-foot"><span class="mh-stat">이번 달 ' + monthCount + '번 · 연속 ' + streak(card.id) + '일</span>' +
            '<span><button class="mh-stamp' + (sr.done ? ' on' : '') + '"' + (canStamp ? '' : ' disabled') + '>' + o.emoji + ' ' + (sr.done ? '했어요' : esc(o.act) + ' 했어요?') + '</button>' +
            '<button class="mh-close">닫기</button></span></div>';
        const ta = cardEl.querySelector('.mh-memo-text');
        const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
        fit(); ta.addEventListener('input', fit);
        ta.addEventListener('blur', () => saveMemo(ta.value));
        ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } });
    }

    function saveMemo(text) {
        if (!card) return;
        const id = card.id, k = card.sel, v = text.trim(), cur = (rec(id, k) || {}).memo || '';
        if (v === cur) return;
        save('myhome: ' + OBJECTS[id].name + ' ' + k + ' 메모', d => {
            d.log[id] = d.log[id] || {};
            const r = Object.assign({}, d.log[id][k] || {}); if (v) r.memo = v; else delete r.memo;
            r.at = stamp();
            if (!r.done && !r.memo) delete d.log[id][k]; else d.log[id][k] = r;
        });
        drawCard();
    }
    function toggleStamp(k) {
        const id = card.id, on = !isDone(id, k);
        save('myhome: ' + OBJECTS[id].name + ' ' + k + (on ? ' ✓' : ' 취소'), d => {
            d.log[id] = d.log[id] || {};
            const r = Object.assign({}, d.log[id][k] || {}); if (on) r.done = true; else delete r.done;
            r.at = stamp();
            if (!r.done && !r.memo) delete d.log[id][k]; else d.log[id][k] = r;
        });
        drawCard();
    }

    cardEl.addEventListener('click', e => {
        if (!card) { if (e.target.closest('.mh-close')) closeCard(); return; }
        const nav = e.target.closest('[data-nav]');
        if (nav) { const d = new Date(card.y, card.m + Number(nav.dataset.nav), 1); card.y = d.getFullYear(); card.m = d.getMonth(); drawCard(); return; }
        const day = e.target.closest('.mh-day[data-k]');
        if (day) {
            const k = day.dataset.k;
            if (k > todayKey()) return;
            // 고른 날을 한 번 더 누르면 도장 찍기/지우기
            if (card.sel === k) toggleStamp(k); else { card.sel = k; drawCard(); }
            return;
        }
        if (e.target.closest('.mh-stamp')) { toggleStamp(card.sel); return; }
        if (e.target.closest('.mh-close')) closeCard();
    });

    /* ---------------- 일주일 날씨 ---------------- */
    function openWeek() {
        if (!weather || !weather.daily) return;
        const d = weather.daily, WK = ['일', '월', '화', '수', '목', '금', '토'];
        const nowK = WMO(weather.current.weather_code);
        let rows = '';
        d.time.forEach((day, i) => {
            const dt = new Date(day + 'T00:00:00'), k = WMO(d.weather_code[i]);
            const pr = d.precipitation_probability_max ? d.precipitation_probability_max[i] : null;
            rows += '<div class="mh-wk-row"><span class="mh-wk-day">' + (i === 0 ? '오늘' : WK[dt.getDay()]) +
                '<small>' + (dt.getMonth() + 1) + '.' + dt.getDate() + '</small></span>' +
                '<span class="mh-wk-ic">' + KIND_IC[k] + '</span>' +
                '<span class="mh-wk-txt">' + KIND_TXT[k] + (pr != null && pr >= 30 ? ' · ' + pr + '%' : '') + '</span>' +
                '<span class="mh-wk-t"><span class="lo">' + Math.round(d.temperature_2m_min[i]) + '°</span><span class="hi">' + Math.round(d.temperature_2m_max[i]) + '°</span></span></div>';
        });
        const rise = d.sunrise[0].slice(11, 16), set = d.sunset[0].slice(11, 16);
        card = null;
        cardEl.innerHTML =
            '<div class="mh-head"><span class="mh-title"><b>' + PLACE.name + '</b> · WEEK</span><span class="mh-today">해 ' + rise + ' – ' + set + '</span></div>' +
            '<div class="mh-wk-now"><b>' + Math.round(weather.current.temperature_2m) + '°</b>' + KIND_IC[nowK] + ' ' + KIND_TXT[nowK] + '</div>' +
            rows +
            '<div class="mh-foot"><span class="mh-stat">Open-Meteo</span><button class="mh-close">닫기</button></div>';
        bg.style.display = 'flex';
    }

    load();
}
