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

## Profile

`profile` — 순서대로 보여 줄 항목 목록 (항목 이름도 바꿀 수 있음).

```json
[ { "id": "pf0", "label": "이름", "value": "김민정" }, { "id": "pf1", "label": "생년월일", "value": "2002년생" } ]
```

## Library (Book / YouTube / Movie)

`library`

```json
{ "id": "lb...", "type": "youtube", "title": "...", "url": "https://youtu.be/...", "status": "done", "rating": 4, "memo": "...", "date": "...", "time": "...", "at": "..." }
```

| 필드 | 값 |
| --- | --- |
| `type` | `book` · `youtube` · `movie` |
| `status` | `want` 보고 싶음 · `now` 보는 중 · `done` 다 봄 |
| `rating` | 하트 1~5 (없으면 키 없음) |

## Condition (몸 상태)

`condition` — 하루에 여러 번, 시간대별로 기록. `type`으로 나뉘어요.

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

`slot`: `morning` · `night` · `etc`

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

## 아이콘

`icons` — 메뉴 아이콘을 내 이미지로 바꾼 것. 키는 `profile` · `condition` · `daily` · `diary` · `menu`.

```json
"icons": { "profile": "minjung/images/icons/1795000000000_ab12c.png" }
```

## 통계 낼 때

- 이번 달 두통 횟수 = `condition`에서 `type == "symptom"`이고 `tags`에 `"두통"`이 있고 `date`가 이번 달인 것의 개수
- 하루 평균 HP = `hp`를 `date`로 묶어 `v` 평균
- 시간 순서 = `date` + `time` 으로 정렬
