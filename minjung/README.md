# 김민정 기록 형식

`minjung/minjung.json` — 홈페이지 **김민정** 메뉴에서 남긴 모든 기록.
화면에서 추가·수정·삭제하면 이 파일도 똑같이 바뀌어요 (저장할 때마다 커밋 하나).

- 사진: `minjung/images/outfit/` (오늘의 옷), `minjung/images/icons/` (메뉴 아이콘)
- 방 배경·캐릭터 그림: `minjung/assets/` (바꾸려면 같은 이름으로 덮어쓰기)
  - `living-mobile.webp` 모바일용 거실 · `living-pc.webp` PC용 거실 · `bedroom.webp` 침실 · `character.webp` 캐릭터(배경 투명)

## 공통 규칙

기록 하나하나는 모두 이 네 가지를 가져요.

| 필드 | 뜻 |
| --- | --- |
| `id` | 기록 이름표 (지우거나 고칠 때 씀) |
| `date` | 날짜 `YYYY-MM-DD` (한국 시간) |
| `time` | 시간 `HH:MM` — 처음엔 저장한 시각, 화면에서 고칠 수 있음 |
| `at` | 마지막으로 이 기록을 바꾼 실제 시각 (+09:00 포함) |

빈 칸(메모 없음 등)은 키 자체를 저장하지 않아요.

```json
{
  "version": 1,
  "updated_at": "2026-11-22T14:30:12+09:00",
  "profile": [ ... ],
  "icons": { ... },
  "hp": [ ... ], "lines": [ ... ], "library": [ ... ],
  "condition": [ ... ], "beauty": [ ... ], "outfit": [ ... ], "diary": [ ... ],
  "symptom_tags": ["배아픔", "두통"],
  "beauty_steps": { "morning": [...], "night": [...], "etc": [...] }
}
```

## 하트 (HP)

`hp` — 오른쪽 위 하트. 화면에는 가장 최근 기록이 보여요.

```json
{ "id": "hpm3x1a2b", "date": "2026-11-22", "time": "09:10", "v": 3, "memo": "잠을 못 잠", "at": "..." }
```

`v` = 꽉 찬 하트 개수 (0~5).

## 대사 (속마음)

`lines` — 대사창에 나오는 말. 가장 최근 대사가 화면에 나와요.

```json
{ "id": "ln...", "date": "2026-11-22", "time": "14:30", "text": "오늘은 좀 피곤하다…", "at": "..." }
```

예전 **손 끝에 남는 것**(oneline) 카테고리의 글 77개도 여기로 옮겼어요. 그런 기록에는 `"from": "oneline-<예전 번호>"`가 붙어 있어요 (글 속 HTML은 줄바꿈만 남기고 글자만).

## Profile

`profile` — 순서대로 보여 줄 항목 목록 (항목 이름도 바꿀 수 있음).

```json
[ { "id": "pf0", "label": "이름", "value": "김민정" }, { "id": "pf1", "label": "생년월일", "value": "2002년생" } ]
```

## Library

화면에서는 아래 메뉴 **Menu → Library** 로 열어요. 탭: All · Book · YouTube · Movie · Drama · Anime · Webtoon · Game · Song · Show · etc.
(예전 '흐린 날의 고백' 카테고리를 없애고 쓸모 있던 기능 — 작품 검색, 표지, 만든 사람·연도, 태그, N회차 — 을 여기로 옮겼어요.)

`library`

```json
{ "id": "lb...", "type": "movie", "title": "노트북", "creator": "닉 카사베츠", "year": "2004",
  "cover": "https://image.tmdb.org/t/p/w200/....jpg", "status": "done", "rating": 5, "tags": ["로맨스"],
  "memo": "...", "date": "2026-11-22", "time": "20:00", "at": "..." }
```

| 필드 | 값 |
| --- | --- |
| `type` | `book` · `youtube` · `movie` · `drama` · `anime` · `webtoon` · `game` · `song` · `show` · `etc` |
| `status` | `want` 보고 싶음 · `now` 보는 중 · `done` 다 봄 |
| `rating` | 하트 1~5 (없으면 키 없음) |
| `creator` · `year` | 만든 사람(감독·작가·채널·가수) · 연도 |
| `cover` | 표지. 검색으로 고르면 바깥 주소(https://…), 직접 올리면 `minjung/images/covers/…` |
| `url` | YouTube 링크 (표지가 없으면 썸네일을 씀) |
| `tags` | 태그 목록 (`#` 없이) |

- 작품 검색: 영화·드라마·애니는 TMDB, 책은 카카오 책 검색.
- 같은 종류·같은 제목을 여러 번 기록하면 날짜 순서대로 `1회차`, `2회차`… 로 보여요 (저장은 따로 안 함).

## Condition (몸 상태)

`condition` — 하루에 여러 번, 시간대별로 기록. `type`으로 나뉘어요.
화면에서는 Condition을 누르면 **Meal · Medicine** / **Symptom · Mood** 두 창 중 하나를 골라요 (저장은 둘 다 이 목록 하나).

```json
{ "id": "cd...", "type": "meal",     "date": "2026-11-22", "time": "08:20", "slot": "breakfast", "memo": "토스트" }
{ "id": "cd...", "type": "medicine", "date": "2026-11-22", "time": "09:00", "name": "타이레놀", "memo": "1알" }
{ "id": "cd...", "type": "symptom",  "date": "2026-11-22", "time": "09:10", "tags": ["두통"], "level": 3, "memo": "오른쪽" }
{ "id": "cd...", "type": "mood",     "date": "2026-11-22", "time": "20:00", "mood": "tired", "memo": "..." }
```

| 필드 | 값 |
| --- | --- |
| `slot` (meal) | `breakfast` · `lunch` · `dinner` · `snack` · `night` |
| `tags` (symptom) | `symptom_tags` 중에서 (화면에서 `+ tag`로 추가) |
| `level` (symptom) | 아픈 정도 1~5 |
| `mood` | `love` · `good` · `okay` · `meh` · `tired` · `sad` · `anxious` · `angry` |

## Daily — Beauty

`beauty` — 루틴 기록. `beauty_steps`는 루틴 단계 목록(화면의 `edit steps`로 고침).

```json
{ "id": "bt...", "slot": "night", "date": "2026-11-22", "time": "23:40", "steps": ["클렌징", "토너", "크림"], "memo": "..." }
```

`slot`: `morning` · `night` · `etc` · `shower` (Shower는 탭 없이 + 버튼으로만 추가, All 탭에서 모아 보기)

## Daily — Outfit

`outfit` — 오늘의 옷 사진.

```json
{ "id": "of...", "date": "2026-11-22", "time": "10:05", "img": "minjung/images/outfit/1795000000000_ab12c.jpg", "memo": "..." }
```

사진을 지우면 이미지 파일도 같이 지워져요.

## Diary

`diary`

```json
{ "id": "dy...", "date": "2026-11-22", "time": "23:50", "title": "...", "body": "..." }
```

To Do 탭은 이 파일이 아니라 기존 투두(`data/todos.json`)를 그대로 읽고 체크해요.

## 설정 (첫 화면 꾸미기)

`settings` — 첫 화면 배경을 **꾹 누르면** 나오는 Room 메뉴에서 바꿔요.

```json
"settings": {
  "bg_off": false,
  "backgrounds": [ { "id": "living", "mobile": "minjung/assets/living-mobile.webp", "pc": "minjung/assets/living-pc.webp" } ],
  "character": "minjung/assets/character.webp",
  "layout":   { "mobile": { "x": 50, "h": 80 }, "pc": { "x": 50, "h": 90 } },
  "stickers": { "mobile": [ { "id": "st...", "img": "minjung/images/stickers/....png", "x": 30, "y": 24, "w": 28 } ], "pc": [] }
}
```

| 필드 | 뜻 |
| --- | --- |
| `bg_off` | `true`면 방 그림과 캐릭터를 끄고 점무늬 바탕 + 스티커만 보임 |
| `backgrounds` | 옆으로 밀어 넘기는 배경 순서. 모바일용·PC용 그림 따로 (`id`가 `bedroom`이면 밤에 그걸로 시작) |
| `character` | 캐릭터 그림 (배경 투명한 PNG 추천) |
| `layout.mobile` / `layout.pc` | 캐릭터 가운데 위치 `x`(%) · 높이 `h`(화면 높이의 %). 바닥에 붙어 있어서 아래 빈 공간 없음 |
| `stickers.mobile` / `stickers.pc` | 스티커 목록. 가운데 위치 `x`·`y`(%) · 너비 `w`(화면 너비의 %) |

모바일(폭 744px 미만)과 PC·아이패드는 배치를 따로 저장해요.
새로 올린 그림: `minjung/images/stickers/`, `minjung/images/character/`, `minjung/images/room/`

## 아이콘

`icons` — 메뉴 아이콘을 내 이미지로 바꾼 것. 키는 `profile` · `condition` · `daily` · `diary` · `menu` (아래 메뉴), `food` · `state` (Condition 안의 두 창), `library`.

```json
"icons": { "profile": "minjung/images/icons/1795000000000_ab12c.png" }
```

## 통계 낼 때

- 이번 달 두통 횟수 = `condition`에서 `type == "symptom"`이고 `tags`에 `"두통"`이 있고 `date`가 이번 달인 것의 개수
- 하루 평균 HP = `hp`를 `date`로 묶어 `v` 평균
- 시간 순서 = `date` + `time` 으로 정렬
