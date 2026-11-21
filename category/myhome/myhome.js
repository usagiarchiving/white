/* ==========================================================================
   마이홈 — 내 방 디오라마 + 가구별 해빗 트래커
   - 방: three.js (vendor/three), 좌우 360도 회전, 카메라 쪽 벽은 자동으로 숨김
   - 기록: 이 저장소의 myhome/myhome.json  { log: { 가구id: { 'YYYY-MM-DD': { d: 1, m: '메모' } } } }
   ========================================================================== */
import * as THREE from '../../vendor/three/three.module.min.js';
import { OrbitControls } from '../../vendor/three/OrbitControls.js';
import { RoundedBoxGeometry } from '../../vendor/three/RoundedBoxGeometry.js';

/* ---------------- 가구 설정 (이름/기록할 행동/도장) — 나중에 가구마다 규칙 바꿀 곳 ---------------- */
const OBJECTS = {
    entrance: { name: '현관',     act: '현관 정리',   emoji: '👟' },
    sink:     { name: '싱크대',   act: '설거지',      emoji: '🍽️' },
    stove:    { name: '인덕션',   act: '요리',        emoji: '🍳' },
    washer:   { name: '세탁기',   act: '빨래',        emoji: '🫧' },
    bath:     { name: '화장실',   act: '화장실 청소', emoji: '🛁' },
    books:    { name: '책장',     act: '독서',        emoji: '📚' },
    drawer:   { name: '서랍장',   act: '정리',        emoji: '🧺' },
    table:    { name: '식탁',     act: '밥 챙겨 먹기', emoji: '🍚' },
    bed:      { name: '침대',     act: '이불 개기',   emoji: '🛏️' },
    vanity:   { name: '화장대',   act: '스킨케어',    emoji: '🧴' },
    desk:     { name: '책상',     act: '공부',        emoji: '✏️' },
    closet:   { name: '옷장',     act: '옷 정리',     emoji: '👕' }
};

// 메뉴에 들어올 때마다 새로 그림 (index.html의 작은 스크립트가 부름)
export function init() {
    const DATA = 'myhome/myhome.json';
    const repo = window.ghdb.repo();
    let db = { log: {} };

    /* ---------------- 방 크기 (도면 비율, 단위 m) ---------------- */
    const W = 3.2, D = 5.3, H = 2.35, T = 0.12;      // 가로, 세로, 벽 높이, 벽 두께
    const X = x => x - W / 2, Z = z => z - D / 2;    // 도면 좌표(왼쪽 위 0,0) → 장면 좌표

    const C = {
        wall: 0xf8f4ee, wallBand: 0xefe6da, floor: 0xead6b8, floorLine: 0xdcc39f,
        cream: 0xfbf8f2, wood: 0xdcb48c, woodDark: 0xc49a72, pink: 0xf5c6cf, pinkDeep: 0xec9fb0,
        mint: 0xbfe3d4, sky: 0xcfe7f6, yellow: 0xf9e3a2, lav: 0xd9cff0, gray: 0xd8d5d0, dark: 0x6f6a66, leaf: 0x9fd29a
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(7.5, 8.2, 9.5);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.55, 0.15);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minPolarAngle = 0.55;
    controls.maxPolarAngle = 1.12;
    controls.minDistance = 7;
    controls.maxDistance = 17;
    controls.rotateSpeed = 0.7;

    scene.add(new THREE.HemisphereLight(0xfff7ec, 0xd9c6ad, 1.15));
    const sun = new THREE.DirectionalLight(0xfff1dc, 1.6);
    sun.position.set(2.5, 7, 6);            // 창문(아래쪽) 방향에서 들어오는 빛
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -5; sun.shadow.camera.right = 5; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -5;
    sun.shadow.radius = 4; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xe8f0ff, 0.35);
    fill.position.set(-5, 4, -4);
    scene.add(fill);

    /* ---------------- 모양 도우미 ---------------- */
    const matCache = {};
    function mat(color, opts) {
        const key = color + JSON.stringify(opts || {});
        if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0 }, opts || {}));
        return matCache[key];
    }
    // 둥근 상자. 크기 w,h,d / 위치 x,y,z(아랫면 기준 y)
    function rbox(w, h, d, color, r, opts) {
        const rad = Math.min(r == null ? 0.05 : r, Math.min(w, h, d) / 2 - 0.001);
        const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.max(rad, 0.001)), mat(color, opts));
        m.castShadow = true; m.receiveShadow = true;
        return m;
    }
    function at(m, x, y, z) { m.position.set(x, y, z); return m; }
    // 도면 사각형(x0~x1, z0~z1)에 높이 h짜리 둥근 상자를 바닥 y0 위에 놓기
    function block(x0, x1, z0, z1, y0, h, color, r, opts) {
        const m = rbox(x1 - x0, h, z1 - z0, color, r, opts);
        return at(m, X((x0 + x1) / 2), y0 + h / 2, Z((z0 + z1) / 2));
    }
    function cyl(rt, rb, h, color, seg) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), mat(color));
        m.castShadow = true; m.receiveShadow = true; return m;
    }
    function sphere(r, color, sx, sy, sz) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), mat(color));
        m.scale.set(sx || 1, sy || 1, sz || 1); m.castShadow = true; return m;
    }

    const clickable = [];   // 누를 수 있는 가구 그룹들
    function furniture(id, build) {
        const g = new THREE.Group();
        g.userData.id = id;
        build(g);
        // 그룹 중심을 아랫면 가운데로 (눌렀을 때 통통 튀는 효과 기준점)
        const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3());
        g.children.forEach(ch => { ch.position.x -= c.x; ch.position.z -= c.z; ch.position.y -= box.min.y; });
        g.position.set(c.x, box.min.y, c.z);
        g.userData.top = box.max.y - box.min.y;
        scene.add(g); clickable.push(g);
        return g;
    }

    /* ---------------- 바닥 ---------------- */
    function plankTexture() {
        const c = document.createElement('canvas'); c.width = 512; c.height = 512;
        const g = c.getContext('2d');
        g.fillStyle = '#ead6b8'; g.fillRect(0, 0, 512, 512);
        const rows = 8;
        for (let r = 0; r < rows; r++) {
            const y = r * 512 / rows, off = (r % 2) * 128 + (r % 3) * 40;
            g.fillStyle = r % 2 ? '#e6d0b0' : '#ecd9bd';
            g.fillRect(0, y + 2, 512, 512 / rows - 4);
            g.fillStyle = '#d9bf9a';
            g.fillRect(0, y, 512, 2);
            for (let x = -off; x < 512; x += 256) g.fillRect(x, y, 2, 512 / rows);
        }
        const t = new THREE.CanvasTexture(c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.6, 2.6); t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        return t;
    }
    const floor = rbox(W + T * 2, 0.16, D + T * 2, 0xffffff, 0.05);
    floor.material = new THREE.MeshStandardMaterial({ map: plankTexture(), roughness: 0.9 });
    at(floor, 0, -0.08, 0);
    scene.add(floor);

    /* ---------------- 벽 (카메라 쪽 벽은 숨김) ---------------- */
    const walls = [], wallByName = {};
    function wall(name, normal, build) {
        const g = new THREE.Group(); g.userData.normal = normal; build(g); scene.add(g); walls.push(g); wallByName[name] = g; return g;
    }
    function wallSlab(w, h, d) {
        const g = new THREE.Group();
        const m = rbox(w, h, d, C.wall, 0.03); at(m, 0, h / 2, 0); g.add(m);
        // 아래쪽 걸레받이 띠
        const band = rbox(w + 0.01, 0.12, d + 0.02, C.wallBand, 0.02); at(band, 0, 0.06, 0); g.add(band);
        return g;
    }
    // 위쪽 벽 (부엌/현관)
    wall('N', new THREE.Vector3(0, 0, -1), g => {
        const s = wallSlab(W + T * 2, H, T); at(s, 0, 0, Z(0) - T / 2); g.add(s);
        // 현관 문
        const door = rbox(0.82, 2.0, 0.06, 0xf3e3cf, 0.03); at(door, X(2.68), 1.0, Z(0) + 0.03); g.add(door);
        const knob = sphere(0.035, 0xc9a56b); at(knob, X(2.68) - 0.3, 1.0, Z(0) + 0.08); g.add(knob);
        // 부엌 선반 + 소품
        const shelf = rbox(1.9, 0.06, 0.26, C.wood, 0.02); at(shelf, X(1.05), 1.62, Z(0.13)); g.add(shelf);
        [[0.35, C.pink], [0.55, C.mint], [0.75, C.yellow]].forEach(([x, col]) => {
            const jar = cyl(0.06, 0.06, 0.16, col); at(jar, X(x), 1.73, Z(0.13)); g.add(jar);
            const lid = cyl(0.065, 0.065, 0.03, C.woodDark); at(lid, X(x), 1.82, Z(0.13)); g.add(lid);
        });
        for (let i = 0; i < 3; i++) { const plate = cyl(0.11, 0.11, 0.025, C.cream); at(plate, X(1.35), 1.665 + i * 0.03, Z(0.13)); g.add(plate); }
        const pot = sphere(0.09, C.sky, 1, 0.8, 1); at(pot, X(1.75), 1.72, Z(0.13)); g.add(pot);
    });
    // 아래쪽 벽 (창문)
    wall('S', new THREE.Vector3(0, 0, 1), g => {
        const s = wallSlab(W + T * 2, H, T); at(s, 0, 0, Z(D) + T / 2); g.add(s);
        const frame = rbox(1.96, 1.15, 0.08, 0xffffff, 0.04); at(frame, X(1.71), 1.48, Z(D) - 0.03); g.add(frame);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0), mat(0xbfe2f7, { emissive: 0xbfe2f7, emissiveIntensity: 0.55, roughness: 0.2 }));
        at(glass, X(1.71), 1.48, Z(D) - 0.075); glass.rotation.y = Math.PI; g.add(glass);
        const bar = rbox(0.04, 1.0, 0.03, 0xffffff, 0.01); at(bar, X(1.71), 1.48, Z(D) - 0.09); g.add(bar);
        const sill = rbox(2.1, 0.05, 0.16, 0xffffff, 0.02); at(sill, X(1.71), 0.9, Z(D) - 0.08); g.add(sill);
        // 커튼
        [X(0.62), X(2.8)].forEach(cx => { const cu = rbox(0.28, 1.45, 0.08, C.pink, 0.04); at(cu, cx, 1.42, Z(D) - 0.12); g.add(cu); });
        const rod = cyl(0.02, 0.02, 2.6, C.woodDark); rod.rotation.z = Math.PI / 2; at(rod, X(1.71), 2.17, Z(D) - 0.12); g.add(rod);
    });
    // 왼쪽 벽
    wall('W', new THREE.Vector3(-1, 0, 0), g => {
        const s = wallSlab(T, H, D); at(s, X(0) - T / 2, 0, 0); g.add(s);
        // 침대 위 액자
        const fr = rbox(0.05, 0.42, 0.56, C.woodDark, 0.02); at(fr, X(0) + 0.03, 1.45, Z(3.9)); g.add(fr);
        const art = rbox(0.02, 0.34, 0.48, C.lav, 0.01); at(art, X(0) + 0.06, 1.45, Z(3.9)); g.add(art);
    });
    // 오른쪽 벽 (화장실 문, 화장대 거울)
    wall('E', new THREE.Vector3(1, 0, 0), g => {
        const s = wallSlab(T, H, D); at(s, X(W) + T / 2, 0, 0); g.add(s);
        const mirror = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), mat(0xdfeef7, { roughness: 0.15, emissive: 0xdfeef7, emissiveIntensity: 0.3 }));
        mirror.scale.set(1, 1.3, 1); mirror.rotation.y = -Math.PI / 2; at(mirror, X(W) - 0.02, 1.38, Z(2.7)); g.add(mirror);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 10, 40), mat(C.pinkDeep));
        rim.scale.set(1, 1.3, 1); rim.rotation.y = -Math.PI / 2; at(rim, X(W) - 0.02, 1.38, Z(2.7)); g.add(rim);
    });

    /* ---------------- 가구 ---------------- */
    // 부엌 조리대 몸통 (누를 수 없는 부분)
    scene.add(block(0, 2.1, 0, 0.62, 0, 0.86, C.cream, 0.05));
    scene.add(block(-0.01, 2.11, -0.01, 0.65, 0.86, 0.06, C.wood, 0.025));
    // 오른쪽 수납문 두 짝
    [1.0, 1.55].forEach(x => {
        const d = block(x, x + 0.5, 0.6, 0.64, 0.08, 0.7, 0xf4eee4, 0.03); scene.add(d);
        const k = sphere(0.025, C.woodDark); at(k, X(x + 0.42), 0.62, Z(0.655)); scene.add(k);
    });

    furniture('stove', g => {
        g.add(block(0.18, 0.86, 0.08, 0.56, 0.92, 0.04, 0x55504c, 0.015));
        [[0.36, 0.22], [0.66, 0.4]].forEach(([x, z]) => {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 32), mat(0xef8f7f, { emissive: 0xe0604f, emissiveIntensity: 0.4 }));
            ring.rotation.x = Math.PI / 2; at(ring, X(x), 0.965, Z(z)); g.add(ring);
        });
        const pan = cyl(0.12, 0.1, 0.07, 0x8c8781); at(pan, X(0.36), 1.0, Z(0.22)); g.add(pan);
    });
    furniture('sink', g => {
        g.add(block(0.98, 1.72, 0.1, 0.52, 0.86, 0.075, 0xc9ced3, 0.03, { roughness: 0.35, metalness: 0.3 }));
        g.add(block(1.03, 1.67, 0.14, 0.48, 0.9, 0.035, 0xb7bdc3, 0.015, { roughness: 0.3, metalness: 0.3 }));
        const neck = cyl(0.025, 0.025, 0.3, 0xd9dde1); at(neck, X(1.35), 1.07, Z(0.06)); g.add(neck);
        const spout = cyl(0.022, 0.022, 0.2, 0xd9dde1); spout.rotation.x = Math.PI / 2; at(spout, X(1.35), 1.21, Z(0.15)); g.add(spout);
        const sponge = rbox(0.1, 0.05, 0.07, C.yellow, 0.015); at(sponge, X(1.8), 0.945, Z(0.2)); g.add(sponge);
        const cup = cyl(0.05, 0.04, 0.1, C.pink); at(cup, X(1.85), 0.97, Z(0.4)); g.add(cup);
    });
    furniture('washer', g => {
        g.add(block(0.12, 0.84, 0.58, 0.64, 0.06, 0.74, 0xfdfdfc, 0.04));
        const door = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 36), mat(0xcfe7f6, { roughness: 0.2, emissive: 0xbcdcf2, emissiveIntensity: 0.25 }));
        door.rotation.x = Math.PI / 2; at(door, X(0.48), 0.4, Z(0.65)); g.add(door);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.03, 10, 36), mat(C.gray));
        at(ring, X(0.48), 0.4, Z(0.665)); g.add(ring);
        const btn = sphere(0.025, C.pinkDeep); at(btn, X(0.72), 0.7, Z(0.65)); g.add(btn);
    });
    furniture('entrance', g => {
        g.add(block(2.15, 3.2, 0, 0.3, -0.03, 0.04, 0xcdc7c0, 0.01));
        const mat1 = block(2.3, 3.05, 0.32, 0.72, 0, 0.02, C.mint, 0.01); g.add(mat1);
        [[2.5, 0.48], [2.72, 0.52]].forEach(([x, z]) => {
            const shoe = rbox(0.11, 0.08, 0.26, C.pinkDeep, 0.04); at(shoe, X(x), 0.06, Z(z)); g.add(shoe);
        });
        const umb = cyl(0.03, 0.03, 0.8, C.sky); umb.rotation.z = 0.15; at(umb, X(3.08), 0.42, Z(0.4)); g.add(umb);
    });
    furniture('bath', g => {
        g.userData.wall = 'E';
        const door = rbox(0.06, 2.0, 0.84, 0xf3e3cf, 0.03); at(door, X(W) - 0.03, 1.0, Z(1.63)); g.add(door);
        const knob = sphere(0.035, 0xc9a56b); at(knob, X(W) - 0.08, 1.0, Z(1.3)); g.add(knob);
        const sign = rbox(0.02, 0.16, 0.16, C.sky, 0.03); at(sign, X(W) - 0.07, 1.55, Z(1.63)); g.add(sign);
    });

    // 책장(위) + 서랍장(아래) — 한 덩어리 수납장을 둘로 나눠 누름
    furniture('drawer', g => {
        g.add(block(0.04, 1.0, 1.76, 2.54, 0, 0.62, C.cream, 0.05));
        [0.08, 0.36].forEach(y => {
            g.add(block(0.08, 0.96, 2.52, 2.56, y + 0.04, 0.22, 0xf6efe4, 0.03));
            const k = sphere(0.03, C.woodDark); at(k, X(0.52), y + 0.15, Z(2.575)); g.add(k);
        });
    });
    furniture('books', g => {
        g.add(block(0.04, 1.0, 1.76, 2.54, 0.62, 0.66, C.cream, 0.05));
        g.add(block(0.08, 0.96, 1.8, 2.5, 0.7, 0.5, 0xefe5d6, 0.03));
        const cols = [C.pink, C.mint, C.sky, C.yellow, C.lav, C.pinkDeep, C.mint, C.yellow];
        let x = 0.12;
        cols.forEach((col, i) => {
            const w = 0.07 + (i % 3) * 0.015, h = 0.3 + (i % 4) * 0.04;
            const b = rbox(w, h, 0.36, col, 0.015); at(b, X(x + w / 2), 0.72 + h / 2, Z(2.3)); g.add(b); x += w + 0.012;
        });
        const plant = sphere(0.13, C.leaf); at(plant, X(0.82), 1.4, Z(2.15)); g.add(plant);
        const pot = cyl(0.08, 0.06, 0.12, C.pink); at(pot, X(0.82), 1.34, Z(2.15)); g.add(pot);
    });
    furniture('table', g => {
        g.add(block(1.0, 1.96, 1.88, 2.42, 0.68, 0.06, C.wood, 0.025));
        [[1.88, 1.94], [1.88, 2.36]].forEach(([x, z]) => { const l = cyl(0.03, 0.03, 0.68, C.woodDark); at(l, X(x), 0.34, Z(z)); g.add(l); });
        const mug = cyl(0.05, 0.045, 0.1, C.sky); at(mug, X(1.5), 0.79, Z(2.1)); g.add(mug);
        const bowl = sphere(0.08, C.cream, 1, 0.5, 1); at(bowl, X(1.25), 0.76, Z(2.2)); g.add(bowl);
        const stool = cyl(0.17, 0.15, 0.06, C.pink); at(stool, X(1.6), 0.46, Z(2.75)); g.add(stool);
        const leg = cyl(0.03, 0.04, 0.44, C.woodDark); at(leg, X(1.6), 0.22, Z(2.75)); g.add(leg);
    });
    furniture('bed', g => {
        g.add(block(0.02, 1.56, 2.62, 5.24, 0, 0.3, C.wood, 0.06));
        g.add(block(0.02, 1.56, 2.6, 2.72, 0, 0.85, C.woodDark, 0.05));                // 머리판
        g.add(block(0.07, 1.51, 2.72, 5.2, 0.3, 0.2, 0xffffff, 0.08));                  // 매트리스
        g.add(block(0.05, 1.53, 3.45, 5.22, 0.42, 0.14, C.pink, 0.07));                 // 이불
        g.add(block(0.05, 1.53, 3.45, 3.62, 0.43, 0.15, 0xffffff, 0.06));              // 이불 끝 접힘
        [[0.42], [1.14]].forEach(([x]) => { const p = rbox(0.58, 0.16, 0.36, 0xfffaf2, 0.08); at(p, X(x), 0.58, Z(2.98)); g.add(p); });
        const bear = sphere(0.12, 0xe8cfae); at(bear, X(1.25), 0.64, Z(3.3)); g.add(bear);
        [-0.07, 0.07].forEach(dx => { const ear = sphere(0.04, 0xe8cfae); at(ear, X(1.25) + dx, 0.75, Z(3.3)); g.add(ear); });
    });
    furniture('vanity', g => {
        g.add(block(2.62, 3.18, 2.3, 3.1, 0.7, 0.06, C.cream, 0.025));
        [[2.66, 2.34], [2.66, 3.06]].forEach(([x, z]) => { const l = cyl(0.025, 0.025, 0.7, C.woodDark); at(l, X(x), 0.35, Z(z)); g.add(l); });
        g.add(block(2.95, 3.16, 2.34, 3.06, 0.3, 0.38, C.cream, 0.03));
        [[3.0, 2.5, C.pink, 0.14], [3.04, 2.62, C.mint, 0.1], [3.0, 2.85, C.lav, 0.12]].forEach(([x, z, col, h]) => {
            const b = cyl(0.035, 0.04, h, col); at(b, X(x), 0.76 + h / 2, Z(z)); g.add(b);
        });
        const seat = cyl(0.17, 0.17, 0.12, C.pinkDeep); at(seat, X(2.35), 0.46, Z(2.7)); g.add(seat);
        const sleg = cyl(0.04, 0.05, 0.4, C.woodDark); at(sleg, X(2.35), 0.2, Z(2.7)); g.add(sleg);
    });
    furniture('desk', g => {
        g.add(block(2.55, 3.18, 3.2, 4.28, 0.72, 0.06, C.wood, 0.025));
        g.add(block(2.6, 3.16, 3.24, 3.5, 0, 0.72, C.cream, 0.04));
        g.add(block(2.6, 3.16, 3.98, 4.24, 0, 0.72, C.cream, 0.04));
        const lap = rbox(0.3, 0.02, 0.4, C.gray, 0.01); at(lap, X(2.8), 0.79, Z(3.7)); g.add(lap);
        const screen = rbox(0.02, 0.26, 0.4, C.dark, 0.01); screen.rotation.z = -0.25; at(screen, X(2.98), 0.92, Z(3.7)); g.add(screen);
        const lampPole = cyl(0.015, 0.015, 0.4, C.woodDark); at(lampPole, X(3.05), 0.98, Z(4.12)); g.add(lampPole);
        const shade = cyl(0.06, 0.12, 0.12, C.yellow); at(shade, X(3.0), 1.2, Z(4.12)); g.add(shade);
        const bulb = new THREE.PointLight(0xffe2b0, 0.6, 1.6); at(bulb, X(3.0), 1.12, Z(4.12)); g.add(bulb);
        const chair = rbox(0.42, 0.08, 0.42, C.mint, 0.04); at(chair, X(2.28), 0.46, Z(3.72)); g.add(chair);
        const back = rbox(0.08, 0.42, 0.42, C.mint, 0.04); at(back, X(2.04), 0.72, Z(3.72)); g.add(back);
        const cl = cyl(0.03, 0.04, 0.42, C.woodDark); at(cl, X(2.28), 0.21, Z(3.72)); g.add(cl);
    });
    furniture('closet', g => {
        g.add(block(2.62, 3.18, 4.34, 5.27, 0, 2.0, C.cream, 0.05));
        [[4.38, 4.79], [4.82, 5.23]].forEach(([z0, z1]) => {
            g.add(block(2.58, 2.62, z0, z1, 0.08, 1.84, 0xf4ede2, 0.02));
            const h = rbox(0.03, 0.22, 0.03, C.woodDark, 0.012); at(h, X(2.565), 1.05, Z(z0 < 4.8 ? z1 - 0.06 : z0 + 0.06)); g.add(h);
        });
        const box = rbox(0.4, 0.22, 0.5, C.sky, 0.05); at(box, X(2.9), 2.11, Z(4.8)); g.add(box);
    });

    // 꾸밈 (누를 수 없음): 동그란 러그, 화분
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 48), mat(C.yellow));
    rug.scale.set(1, 1, 1.35); rug.receiveShadow = true; at(rug, X(2.0), 0.01, Z(3.6)); scene.add(rug);
    const rug2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.022, 48), mat(0xfbeec7));
    rug2.scale.set(1, 1, 1.35); rug2.receiveShadow = true; at(rug2, X(2.0), 0.012, Z(3.6)); scene.add(rug2);
    const bigPot = cyl(0.13, 0.1, 0.24, C.cream); at(bigPot, X(2.2), 0.12, Z(5.0)); scene.add(bigPot);
    [[0, 0.42, 0, 0.2], [-0.08, 0.6, 0.04, 0.15], [0.09, 0.55, -0.05, 0.14]].forEach(([dx, y, dz, r]) => {
        const l = sphere(r, C.leaf); at(l, X(2.2) + dx, y, Z(5.0) + dz); scene.add(l);
    });

    /* ---------------- 화면 크기 / 렌더 ---------------- */
    function resize() {
        const w = stage.clientWidth, h = stage.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // 화면이 좁을수록 조금 멀리서 봄
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
        const hits = ray.intersectObjects(clickable, true);
        for (const h of hits) {
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
        labelEl.innerHTML = '<span class="e">' + o.emoji + '</span>' + o.name + (done ? '<span class="n">오늘 ✓</span>' : '');
        labelEl.classList.add('on');
    }
    canvas.addEventListener('pointermove', ev => { if (ev.pointerType === 'mouse') setHover(pick(ev)); });
    canvas.addEventListener('pointerleave', () => setHover(null));
    canvas.addEventListener('pointerdown', ev => { downAt = { x: ev.clientX, y: ev.clientY, t: Date.now() }; });
    canvas.addEventListener('pointerup', ev => {
        if (!downAt) return;
        const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y);
        downAt = null;
        if (moved > 8) return;                       // 돌리던 중이면 무시
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

    const clock = new THREE.Clock();
    function tick() {
        if (!canvas.isConnected) { ro.disconnect(); renderer.dispose(); return; }   // 다른 메뉴로 가면 정지
        requestAnimationFrame(tick);
        const dt = Math.min(clock.getDelta(), 0.05);
        controls.update();
        updateWalls();
        clickable.forEach(g => {
            // 가리키면 살짝 커지고, 누르면 통통
            const target = g === hovered ? 1.035 : 1;
            let s = g.scale.x + (target - g.scale.x) * Math.min(1, dt * 12);
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
    const isDone = (id, k) => !!(rec(id, k) && rec(id, k).d);
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const MON_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    async function load() {
        try {
            const d = await repo.readJSON(DATA, { log: {} });
            db = d && d.log ? d : { log: {} };
        } catch (e) { console.error(e); }
        drawLegend();
    }

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
        const j = {}; j[DATA] = { mutate: cur => { cur = cur && cur.log ? cur : { log: {} }; fn(cur); return cur; }, fallback: { log: {} } };
        repo.commit(message, {}, j).then(res => {
            setPending(pending - 1);
            if (!pending && res && res[DATA]) { db = res[DATA]; drawLegend(); if (card) drawCard(); }
        }, e => {
            setPending(pending - 1);
            alert('저장하지 못했어요.\n' + (e.message || e));
            load().then(() => card && drawCard());
        });
    }
    function setRec(id, k, patch) {
        db.log[id] = db.log[id] || {};
        const cur = Object.assign({}, db.log[id][k] || {}, patch);
        if (!cur.d && !cur.m) delete db.log[id][k]; else db.log[id][k] = cur;
    }

    function drawLegend() {
        const t = todayKey();
        document.getElementById('mh-legend').innerHTML = Object.keys(OBJECTS).map(id =>
            '<span data-id="' + id + '" class="' + (isDone(id, t) ? 'done' : '') + '">' + OBJECTS[id].emoji + ' ' + OBJECTS[id].name + (isDone(id, t) ? ' ✓' : '') + '</span>'
        ).join('');
    }
    document.getElementById('mh-legend').addEventListener('click', e => {
        const s = e.target.closest('[data-id]'); if (s) openCard(s.dataset.id);
    });

    /* ---------------- 카드 ---------------- */
    let card = null;   // { id, y, m, sel }
    const bg = document.getElementById('mh-card-bg'), cardEl = document.getElementById('mh-card');

    function openCard(id) {
        const now = new Date();
        card = { id, y: now.getFullYear(), m: now.getMonth(), sel: todayKey() };
        bg.style.display = 'flex';
        drawCard();
    }
    function closeCard() { bg.style.display = 'none'; card = null; drawLegend(); }
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
            if (r.d) monthCount++;
            const cls = ['mh-day', r.d ? 'done' : '', k === t ? 'is-today' : '', k > t ? 'future' : '', k === card.sel ? 'sel' : '', r.m ? 'has-memo' : ''].join(' ');
            cells += '<div class="' + cls + '" data-k="' + k + '">' + (r.d ? o.emoji : d) + '</div>';
        }
        const sel = card.sel, sr = rec(card.id, sel) || {}, sd = new Date(sel + 'T00:00:00');
        const canStamp = sel <= t;
        cardEl.innerHTML =
            '<div class="mh-head"><span class="mh-title"><b>' + esc(o.name) + '</b> · ' + MONTH_EN[m] + '</span>' +
            '<span class="mh-today">today · ' + MON_EN[new Date().getMonth()] + ' ' + new Date().getDate() + '</span></div>' +
            '<div class="mh-sub"><span class="mh-nav" data-nav="-1">‹</span><span>' + o.emoji + ' ' + esc(o.act) + ' · ' + y + '.' + pad(m + 1) + '</span><span class="mh-nav" data-nav="1">›</span></div>' +
            '<div class="mh-grid">' + cells + '</div>' +
            '<div class="mh-memo"><span class="mh-memo-date">' + MON_EN[sd.getMonth()] + ' ' + sd.getDate() + '</span>' +
            '<textarea class="mh-memo-text" rows="1" placeholder="메모를 남겨요…">' + esc(sr.m || '') + '</textarea></div>' +
            '<div class="mh-foot"><span class="mh-stat">이번 달 ' + monthCount + '번 · 연속 ' + streak(card.id) + '일</span>' +
            '<span><button class="mh-stamp' + (sr.d ? ' on' : '') + '"' + (canStamp ? '' : ' disabled') + '>' + o.emoji + ' ' + (sr.d ? '했어요' : esc(o.act) + ' 했어요?') + '</button>' +
            '<button class="mh-close">닫기</button></span></div>';
        const ta = cardEl.querySelector('.mh-memo-text');
        const fit = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
        fit(); ta.addEventListener('input', fit);
        ta.addEventListener('blur', () => saveMemo(ta.value));
        ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } });
    }

    function saveMemo(text) {
        if (!card) return;
        const id = card.id, k = card.sel, v = text.trim(), cur = (rec(id, k) || {}).m || '';
        if (v === cur) return;
        save('myhome: ' + OBJECTS[id].name + ' ' + k + ' 메모', d => {
            d.log[id] = d.log[id] || {};
            const r = Object.assign({}, d.log[id][k] || {}); if (v) r.m = v; else delete r.m;
            if (!r.d && !r.m) delete d.log[id][k]; else d.log[id][k] = r;
        });
        drawCard();
    }
    function toggleStamp(k) {
        const id = card.id, on = !isDone(id, k);
        save('myhome: ' + OBJECTS[id].name + ' ' + k + (on ? ' ✓' : ' 취소'), d => {
            d.log[id] = d.log[id] || {};
            const r = Object.assign({}, d.log[id][k] || {}); if (on) r.d = 1; else delete r.d;
            if (!r.d && !r.m) delete d.log[id][k]; else d.log[id][k] = r;
        });
        drawCard();
    }

    cardEl.addEventListener('click', e => {
        if (!card) return;
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

    load();
}
