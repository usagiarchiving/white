"""하시온의 메시지 · 편지 · 답장 만들기 (GitHub Actions에서 실행)

  python letter.py letter  [--date YYYY-MM-DD] [--force] --out p.json   # 밤 편지 (하루 한 통)
  python letter.py message [--slot morning|lunch|evening]  --out p.json   # 아침·점심·저녁 메시지
  python letter.py chat                                     --out p.json   # 내가 보낸 메시지에 답장
  python letter.py reply   --date YYYY-MM-DD                --out p.json   # 편지에 쓴 내 답장에 답글
  python letter.py apply p.json      # 만든 결과를 최신 minjung/letters.json 에 덧붙임 (같은 건 두 번 안 붙음)
  python letter.py preview [--date]  # AI 없이 모은 하루 기록만 보기
  python letter.py receipt [--date] [--force] --out p.json   # 다이어리 영수증 밑 한 줄 코멘트 (밤 11시)

API 키: 환경변수 GEMINI_API_KEY (저장소 Settings → Secrets and variables → Actions)
캐릭터·모델: minjung/sion.json
"""
import argparse
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

KST = timezone(timedelta(hours=9))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STORE = 'minjung/letters.json'
CONFIG = 'minjung/sion.json'
SLOTS = {'morning': '아침', 'tripam': '아침', 'remind': '일정 전', 'lunch': '점심', 'evening': '저녁', 'night': '밤', 'dawn': '새벽'}
# 먼저 보내는 메시지: 시간 창 안에서 하루 한 번, 시각은 랜덤 (30분마다 확인). 새벽은 가끔만
WINDOWS = {'lunch': (11.5, 14.0), 'evening': (17.0, 20.5), 'night': (21.0, 23.5), 'dawn': (1.0, 3.5)}
DAWN_CHANCE = 0.25
TRIP_WINDOW = ('tripam', (8.5, 11.0))     # 여행·캠핑 날엔 아침부터 선톡
WEEK = '월화수목금토일'
KEEP_CHAT_DAYS = 90


# ---------------------------------------------------------------- 파일
def path(p):
    return p if os.path.isabs(p) else os.path.join(ROOT, p)


def load(p, fallback):
    try:
        with open(path(p), encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f'[읽기 건너뜀] {p}: {e}', file=sys.stderr)
        return fallback


def write(p, data):
    with open(path(p), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')


def load_store():
    s = load(STORE, {}) or {}
    s.setdefault('letters', {})
    s.setdefault('chat', [])
    s.setdefault('memory', {'summary': '', 'upto': ''})
    return s


def now():
    return datetime.now(KST)


def stamp(t=None):
    return (t or now()).isoformat(timespec='seconds')


def new_id(prefix):
    return prefix + format(int(time.time() * 1000), 'x') + os.urandom(2).hex()


def letter_day(t=None):
    """새벽 5시 전은 아직 '어제'의 밤"""
    return ((t or now()) - timedelta(hours=5)).strftime('%Y-%m-%d')


def strip_html(s):
    s = re.sub(r'<br\s*/?>|</div>|</p>', '\n', s or '', flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\n{3,}', '\n\n', html.unescape(s)).strip()


def clip(s, n):
    s = (s or '').strip()
    return s if len(s) <= n else s[:n] + '…'


def date_label(day):
    d = datetime.strptime(day, '%Y-%m-%d')
    return f'{d.year}년 {d.month}월 {d.day}일 {WEEK[d.weekday()]}요일'


# ---------------------------------------------------------------- 민정의 하루 기록 모으기
def gather(day, upto=None):
    """day 하루 동안 민정이 남긴 기록을 글로. upto(HH:MM)가 있으면 그 시각까지만"""
    out = []

    def ok_time(t):
        return not upto or not t or t <= upto

    def add(title, lines):
        lines = [l for l in lines if l]
        if lines:
            out.append(f'## {title}\n' + '\n'.join(lines))

    mj = load('minjung/minjung.json', {})
    on = lambda arr: sorted([x for x in (arr or []) if isinstance(x, dict) and x.get('date') == day and ok_time(x.get('time'))],
                            key=lambda x: x.get('time') or '')
    add('혼잣말', [f"- {x.get('time','')} {clip(x.get('text'), 300)}" for x in on(mj.get('lines'))])
    add('일기', [f"- {x.get('time','')} {('['+x['title']+'] ') if x.get('title') else ''}{clip(x.get('body'), 1500)}" for x in on(mj.get('diary'))])
    slot_ko = {'breakfast': '아침', 'lunch': '점심', 'dinner': '저녁', 'snack': '간식', 'night': '야식'}
    type_ko = {'meal': '식사', 'mood': '기분', 'symptom': '증상', 'medicine': '약'}

    def cond(x):
        t = x.get('type')
        head = slot_ko.get(x.get('slot'), '식사') if t == 'meal' else type_ko.get(t, t or '')
        extra = [x.get('mood'), ', '.join(x.get('tags') or []), x.get('name'), clip(x.get('memo'), 200)]
        return f"- {x.get('time','')} {head}: " + ' / '.join(e for e in extra if e)
    add('컨디션·식사', [cond(x) for x in on(mj.get('condition'))])
    add('기력(HP, 1~5)', [f"- {x.get('time','')} {x.get('v')}" for x in on(mj.get('hp'))])
    add('스킨케어', [f"- {x.get('time','')} {', '.join(x.get('steps') or [])}" for x in on(mj.get('beauty'))])
    add('옷', ['- 오늘의 옷 사진을 남김' for _ in on(mj.get('outfit'))][:1])
    qlog = (mj.get('quest_log') or {}).get(day) or {}
    qname = {q.get('id'): q.get('title') for q in mj.get('quests') or []}
    if isinstance(qlog, dict):
        add('오늘의 퀘스트', [f"- {qname.get(k, k)}: {'완료' if v else '미완'}" for k, v in qlog.items()])

    todos = load('data/todos.json', [])
    tl = []
    for t in todos if isinstance(todos, list) else []:
        if t.get('target_date') == day or t.get('completed_date') == day:
            subs = [s.get('content') for s in t.get('subtasks') or [] if s.get('is_completed')]
            tl.append(f"- [{'x' if t.get('is_completed') else ' '}] {t.get('content')}" + (f" (한 것: {', '.join(subs)})" if subs else ''))
    add('할 일', tl)

    cal = load('diary/calendar.json', {})
    ev = [e for e in cal.get('events') or [] if (e.get('date') or '') <= day <= (e.get('endDate') or e.get('date') or '') and ok_time(e.get('start'))]
    ev.sort(key=lambda e: e.get('start') or '')
    add('일정·활동(ATracker는 실제로 한 활동 기록)', [
        f"- {(e.get('start','')+'~'+e.get('end','')) if e.get('start') else '종일'} [{e.get('cal')}] {e.get('title')}{'' if str(e.get('cal', '')).startswith('AT') else wtag(e)}"
        + (f" ({clip(e['note'], 80)})" if e.get('note') and 'Hash ID' not in e['note'] else '') for e in ev])

    dy = load('diary/diary.json', {})
    d = (dy.get('days') or {}).get(day) or {}
    dl = []
    for k, v in d.items():
        if k in ('photo', 'thumb', 'sticker') or (isinstance(v, str) and v.startswith('diary/')):
            continue
        dl.append(f'- {k}: {clip(strip_html(v) if isinstance(v, str) else json.dumps(v, ensure_ascii=False), 800)}')
    if d.get('photo'):
        dl.append('- 사진 한 장을 붙였음')
    for dd in dy.get('ddays') or []:
        try:
            left = (datetime.strptime(dd['date'], '%Y-%m-%d').date() - datetime.strptime(day, '%Y-%m-%d').date()).days
        except (KeyError, ValueError):
            continue
        if 0 <= left <= 14:
            dl.append(f"- D-{left if left else 'DAY'}: {dd.get('title')} ({dd['date']})")
    add('다이어리', dl)

    memos = load('diary/memos.json', {})
    add('메모', [f"- {x.get('time','')} {('['+x['title']+'] ') if x.get('title') else ''}{clip(strip_html(x.get('html')), 600)}"
               for x in memos.get('items') or [] if x.get('date') == day and ok_time(x.get('time'))])

    mh = load('myhome/myhome.json', {})
    objs = mh.get('objects') or {}
    hl = []
    for oid, days in (mh.get('log') or {}).items():
        r = (days or {}).get(day)
        if r and r.get('count'):
            o = objs.get(oid) or {}
            hl.append(f"- {o.get('name', oid)} {o.get('act','')} {r['count']}번" + (f" — {r['memo']}" if r.get('memo') else ''))
    add('집안일', hl)
    return '\n\n'.join(out)


# ---------------------------------------------------------------- Gemini
SAFETY = [{'category': c, 'threshold': 'BLOCK_ONLY_HIGH'} for c in (
    'HARM_CATEGORY_HARASSMENT', 'HARM_CATEGORY_HATE_SPEECH', 'HARM_CATEGORY_DANGEROUS_CONTENT', 'HARM_CATEGORY_SEXUALLY_EXPLICIT')]


KEY_NAMES = ['GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GEMINI_API_KEY_4']
SPENT = set()   # 이번 실행에서 한도가 찬 (키, 모델) — 다음 호출 때 바로 건너뜀
NO_THINK = set()   # thinkingLevel 을 모르는 모델


def api_keys(first=None):
    """메인 키 + 서브 키 (넣은 것만, 순서대로). first: 그 키를 맨 앞에"""
    out = []
    for n in ([first] if first else []) + KEY_NAMES:
        k = os.environ.get(n, '').strip()
        if k and k not in [x for _, x in out]:
            out.append((n, k))
    return out


def gemini(models, system, prompt, max_tokens=4096, temperature=0.95, json_mode=False, think='high', key_first=None, fast=False):
    """좋은 모델부터, 키를 차례로 써 봄. 한도가 차면(429) 다음 키로, 그 모델을 모든 키가 못 쓰면 다음 모델로"""
    keys = api_keys(key_first)
    if not keys:
        sys.exit('GEMINI_API_KEY가 없어요. 저장소 Settings → Secrets and variables → Actions에 넣어 주세요.')
    body = {
        'systemInstruction': {'parts': [{'text': system}]},
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': temperature, 'maxOutputTokens': max_tokens},
        'safetySettings': SAFETY,
    }
    if json_mode:
        body['generationConfig']['responseMimeType'] = 'application/json'
    # 생각(thinking)은 높게. 모델이 thinkingLevel 을 모르면 빼고 다시
    errors = []
    for model in (models + models if fast else models):
        if fast and model == models[0] and errors:
            time.sleep(5)       # 통화: 한 바퀴 다 막히면 잠깐 쉬고 한 번 더
            print('[다시] 한 바퀴 더')
        skip_model = False
        body['generationConfig'].pop('thinkingConfig', None)
        if think and model not in NO_THINK:
            body['generationConfig']['thinkingConfig'] = {'thinkingLevel': think}
        for name, key in keys:
            if skip_model:
                break
            if (name, model) in SPENT:
                continue
            for attempt in range(3):
                req = urllib.request.Request(
                    f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                    data=json.dumps(body).encode(), method='POST',
                    headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
                try:
                    with urllib.request.urlopen(req, timeout=40 if fast else 180) as r:
                        data = json.load(r)
                    cand = (data.get('candidates') or [{}])[0]
                    text = ''.join(p.get('text', '') for p in (cand.get('content') or {}).get('parts') or [] if not p.get('thought')).strip()
                    if text:
                        print(f'[모델] {model} · {name}')
                        return text, model
                    errors.append(f'{model} · {name}: 빈 응답 ({cand.get("finishReason") or data.get("promptFeedback")})')
                    skip_model = True       # 막힘·길이 초과는 키를 바꿔도 같음 → 다음 모델로
                    break
                except urllib.error.HTTPError as e:
                    msg = e.read().decode(errors='replace')[:300]
                    errors.append(f'{model} · {name}: HTTP {e.code} {msg}')
                    if e.code == 400 and 'thinkingConfig' in body['generationConfig'] and 'think' in msg.lower():
                        del body['generationConfig']['thinkingConfig']   # 이 모델은 thinkingLevel 을 모름
                        NO_THINK.add(model)
                        continue
                    if e.code == 400 and 'api key' in msg.lower():   # 키가 틀림 → 다음 키
                        SPENT.add((name, model))
                        break
                    if e.code in (400, 404):    # 모델 이름이 틀렸거나 없음 → 키를 바꿔도 같음
                        skip_model = True
                        break
                    if e.code == 429:
                        # 분당 한도면 잠깐 기다렸다 한 번 더, 하루 한도면 바로 다음 키
                        if not fast and attempt == 0 and 'PerDay' not in msg and 'per day' not in msg.lower():
                            time.sleep(20)
                            continue
                        SPENT.add((name, model))
                        print(f'[한도] {name} · {model} → 다음 키')
                        break
                    if e.code in (500, 503) and fast:   # 서버가 붐빔 → 이 모델은 키를 바꿔도 같음, 바로 다음 모델
                        skip_model = True
                        break
                    if e.code in (500, 503) and attempt == 0:
                        time.sleep(8)
                        continue
                    if e.code in (500, 503):    # 그래도 붐빔 → 이 모델은 키를 바꿔도 같음, 다음 모델로
                        skip_model = True
                        break
                    if e.code in (401, 403):        # 키가 틀렸거나 막힘 → 다음 키
                        SPENT.add((name, model))
                    break
                except Exception as e:
                    errors.append(f'{model} · {name}: {e}')
                    break
    sys.exit('AI 호출 실패\n' + '\n'.join(errors))


# BANG → AI 칸에서 고치는 설정 (minjung/sion.json 의 ai)
THINK_DEFAULT = {'chat': 'high', 'proactive': 'high', 'letter': 'high', 'call': 'medium'}


def AI(cfg, k, d=None):
    v = (cfg.get('ai') or {}).get(k)
    return d if v in (None, '') else v


def TH(cfg, kind):
    v = str(AI(cfg, 'think_' + kind, THINK_DEFAULT[kind])).lower()
    return v if v in ('low', 'medium', 'high') else THINK_DEFAULT[kind]


def num(v, d):
    try:
        return float(v)
    except (TypeError, ValueError):
        return d


def slot_on(cfg, slot):
    return str(AI(cfg, 'slot_' + slot, 'on')) != 'off'


PROMPT_TITLES = [('profile', ''), ('personality', '성격'), ('relationship', '관계'), ('speech', '말투'),
                 ('examples', '말투 예시'), ('rules', '절대 규칙'), ('writing', '지금 하는 일 (메시지·편지 쓰는 규칙)')]


def P(cfg, key, default=''):
    """minjung/sion.json 의 prompt 칸 (BANG에서 고침)"""
    return str((cfg.get('prompt') or {}).get(key) or default).strip()


def system_prompt(cfg):
    if cfg.get('persona') and not cfg.get('prompt'):   # 예전 형식
        persona = cfg['persona'] if isinstance(cfg['persona'], str) else '\n'.join(cfg['persona'])
        return persona
    parts = []
    for k, title in PROMPT_TITLES:
        v = P(cfg, k)
        if v:
            parts.append((title + '\n' if title else '') + v)
    parts.append('일정 규칙\n' + SCHED_RULE)
    return '\n\n'.join(parts)


PHOTO = re.compile(r'\(\s*사진\s*[:：]\s*([^()]+?)\s*\)')
PHOTO_RULE = ('- 아주 가끔(대화 몇 번에 한 번 정도) 사진을 보낼 수 있어. 그때는 말풍선 하나를 통째로 (사진: 무엇을 찍은 사진인지 짧은 설명) 형식으로 써. '
              '괄호는 사진에만 써.')


def photo_rule(cfg):
    return P(cfg, 'photo', PHOTO_RULE)


def clean(text):
    """행동 묘사(*…*, 사진이 아닌 괄호 줄)를 지우고 말만 남김"""
    text = re.sub(r'\*[^*\n]+\*', '', text)
    lines = []
    for l in text.split('\n'):
        t = l.strip()
        if re.fullmatch(r'\([^()]*\)', t) and not PHOTO.fullmatch(t):
            continue
        lines.append(l)
    return '\n'.join(lines).strip()


def bubbles(text, limit=4):
    """메시지 답을 말풍선 여러 개로 (줄바꿈 기준, 사진은 따로 한 칸)"""
    text = PHOTO.sub(lambda m: f'\n(사진: {m.group(1).strip()})\n', clean(text))
    parts = [p.strip().strip('"“”').strip() for p in re.split(r'\n+', text) if p.strip().strip('"“”').strip()]
    return enforce_bubbles(parts, limit) or [text.strip() or '…']


SENT_END = re.compile(r'(?<=[.!?…~])\s+(?=\S)')


def enforce_bubbles(parts, limit=4):
    """메시지 규칙: 첫 말풍선은 한 문장, 말풍선 하나에 한 문장(두 문장짜리는 하나만), 최대 limit 개"""
    out, two_used = [], False
    for p in parts:
        if PHOTO.fullmatch(p):
            out.append(p)
            continue
        sents = [x.strip() for x in SENT_END.split(p) if x.strip()]
        while sents:
            if out and not two_used and len(sents) >= 2:
                out.append(sents[0] + ' ' + sents[1])
                two_used = True
                sents = sents[2:]
            else:
                out.append(sents.pop(0))
    return out[:limit]


def chat_history(store, n=24, days=3):
    """최근 대화 — 단기 기억 위주: 최근 days일 안의 것만, 최대 n개"""
    cut = (now() - timedelta(days=days)).isoformat()
    rows = [r for r in store['chat'] if r['at'] >= cut][-n:]
    who = lambda r: '시온' if r['from'] == 'ai' else '민정'

    def line(r):
        if r.get('kind') == 'call':   # 통화 기록
            what = '부재중 전화' if r.get('status') == 'missed' else f"통화 {r.get('text', '')}"
            return f"[{r['at'][5:16].replace('T', ' ')}] ({who(r)}이(가) 건 {what})"
        return f"[{r['at'][5:16].replace('T', ' ')}] {who(r)}: {r['text']}"
    return '\n'.join(line(r) for r in rows)


def recent_letters(store, before, n=1):
    keys = sorted(k for k in store['letters'] if k < before)[-n:]
    return '\n\n'.join(f"[{k}]\n{clip(store['letters'][k]['body'], 500)}" for k in keys)


WITH_SION = re.compile(r'시온')
SCHED_RULE = ("- 캘린더 일정은 '(시온과 함께)' 표시가 없으면 민정 혼자(또는 다른 사람과) 간 거야. 시온은 같이 안 갔어. "
              "단 민정이 메시지에서 같이 갔다고 하면 그 말을 따라.")


def with_sion(e):
    return bool(WITH_SION.search(str(e.get('title', '')) + ' ' + str(e.get('note', '') or '')))


def wtag(e):
    return ' (시온과 함께)' if with_sion(e) else ''


def upcoming(day, days=3):
    """다가오는 일정: 내일~days일 캘린더(ATracker 빼고), 마감 할 일, 7일 안 디데이"""
    d0 = datetime.strptime(day, '%Y-%m-%d').date()
    keys = [(d0 + timedelta(days=i)).isoformat() for i in range(1, days + 1)]
    out = []
    cal = load('diary/calendar.json', {})
    for e in sorted(cal.get('events') or [], key=lambda e: (e.get('date') or '', e.get('start') or '')):
        if (e.get('date') in keys) and not str(e.get('cal', '')).startswith('AT'):
            out.append(f"- {e['date'][5:]} {e.get('start') or '종일'} {e.get('title')}{wtag(e)}")
    todos = load('data/todos.json', [])
    for t in todos if isinstance(todos, list) else []:
        if not t.get('is_completed') and t.get('target_date') in keys:
            out.append(f"- {t['target_date'][5:]} 할 일: {t.get('content')}")
    dy = load('diary/diary.json', {})
    for dd in dy.get('ddays') or []:
        try:
            left = (datetime.strptime(dd['date'], '%Y-%m-%d').date() - d0).days
        except (KeyError, ValueError):
            continue
        if 1 <= left <= 7:
            out.append(f"- D-{left} {dd.get('title')}")
    return '\n'.join(out)


# ---------------------------------------------------------------- 여행 · 캠핑 (이런 날엔 시온과 떨어져 있음)
TRIP_KW = re.compile(r'여행|캠핑|글램핑|비행기|항공|공항|출국|입국|귀국|숙소|호텔|펜션|료칸|리조트|트립|trip|travel', re.I)
FLIGHT_KW = re.compile(r'비행기|항공|공항|출국|입국|귀국|flight', re.I)


def trip_on(day):
    """day 가 여행·캠핑 중이면 그 일정 이름, 아니면 None
    - 여러 날에 걸친 일정(캠핑 1박 등) → 그 기간
    - 가는 비행기와 돌아오는 비행기(2주 안) → 그 사이
    - 하루짜리 일정 → 그날 (할 일 · 다이어리에 적힌 것도)"""
    cal = load('diary/calendar.json', {})
    evs = [e for e in cal.get('events') or [] if not str(e.get('cal', '')).startswith('AT') and TRIP_KW.search(str(e.get('title', '')))]
    for e in evs:
        if (e.get('date') or '') <= day <= (e.get('endDate') or e.get('date') or ''):
            return e.get('title')
    flights = sorted((e for e in evs if FLIGHT_KW.search(str(e.get('title', '')))), key=lambda e: e.get('date') or '')
    for a, b in zip(flights, flights[1:]):
        try:
            gap = (datetime.strptime(b['date'], '%Y-%m-%d') - datetime.strptime(a['date'], '%Y-%m-%d')).days
        except (KeyError, ValueError):
            continue
        if 0 < gap <= 14 and a['date'] <= day <= b['date']:
            return '여행 (' + a['date'][5:] + ' ~ ' + b['date'][5:] + ')'
    todos = load('data/todos.json', [])
    for t in todos if isinstance(todos, list) else []:
        if t.get('target_date') == day and TRIP_KW.search(str(t.get('content', ''))):
            return t.get('content')
    d = ((load('diary/diary.json', {}).get('days') or {}).get(day) or {})
    if TRIP_KW.search(json.dumps(d, ensure_ascii=False)):
        return '여행'
    return None


def trip_note(cfg, day):
    """프롬프트에 붙일 여행 중 안내 (아니면 빈 문자열)"""
    tr = trip_on(day)
    if not tr:
        return ''
    return (f"# 오늘은 따로 있는 날\n민정은 지금 '{tr}' 일정으로 밖에 나가 있고, 시온은 같이 가지 않았어 (떨어져 있음). "
            f"같이 있는 것처럼 말하지 마.\n{P(cfg, 'trip', '')}\n\n")


# ---------------------------------------------------------------- 오늘의 알림 (날씨 · 오하아사 · 일정)
WMO = [((0,), '맑음'), ((1, 2), '구름 조금'), ((3,), '흐림'), ((45, 48), '안개'), ((51, 53, 55, 56, 57), '이슬비'),
       ((61, 63, 65, 66, 67), '비'), ((71, 73, 75, 77, 85, 86), '눈'), ((80, 81, 82), '소나기'), ((95, 96, 99), '뇌우')]
SIGNS = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리']


def wdesc(code):
    return next((n for cs, n in WMO if code in cs), '')


def weather(cfg):
    pl = cfg.get('place') or {'name': '부산 동구', 'lat': 35.1295, 'lon': 129.0454}
    url = (f"https://api.open-meteo.com/v1/forecast?latitude={pl['lat']}&longitude={pl['lon']}"
           '&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
           '&timezone=Asia%2FSeoul&forecast_days=2')
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            w = json.load(r)
        d = w['daily']
        day = lambda i: {'code': d['weather_code'][i], 'desc': wdesc(d['weather_code'][i]), 'max': round(d['temperature_2m_max'][i]),
                         'min': round(d['temperature_2m_min'][i]), 'rain': d['precipitation_probability_max'][i]}
        return dict(day(0), place=pl['name'], now=round(w['current']['temperature_2m']), tomorrow=day(1))
    except Exception as e:
        print(f'[날씨 건너뜀] {e}', file=sys.stderr)
        return None


def my_sign():
    """김민정 프로필 생년월일 → 별자리 번호(1=양자리)"""
    mj = load('minjung/minjung.json', {})
    v = next((x.get('value') for x in mj.get('profile') or [] if x.get('label') == '생년월일'), '') or ''
    m = re.search(r'(\d{4})\D+(\d{1,2})\D+(\d{1,2})', v)
    md = int(m.group(2)) * 100 + int(m.group(3)) if m else 411
    start = [321, 420, 521, 622, 723, 823, 923, 1024, 1123, 1222, 120, 219]
    for i in range(11, -1, -1):
        st, nx = start[i], start[(i + 1) % 12]
        if (md >= st and md < nx) if st < nx else (md >= st or md < nx):
            return i + 1
    return 1


def fortune(day):
    """오하아사: 바로 받아 보고, 안 되면 저장소의 diary/ohaasa.json"""
    raw = None
    try:
        req = urllib.request.Request('https://www.asahi.co.jp/data/ohaasa2020/horoscope.json', headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = json.load(r)
    except Exception as e:
        print(f'[운세 직접 받기 실패] {e}', file=sys.stderr)
    raw = raw or load('diary/ohaasa.json', None)
    top = raw[0] if isinstance(raw, list) and raw else raw if isinstance(raw, dict) else None
    if not top or str(top.get('onair_date', '')) != day.replace('-', ''):
        return None
    sign = my_sign()
    for d in top.get('detail') or []:
        if int(d.get('horoscope_st') or 0) == sign:
            lines = [x.strip() for x in str(d.get('horoscope_text', '')).split('\t') if x.strip()]
            return {'rank': int(d.get('ranking_no') or 0), 'sign': SIGNS[sign - 1], 'jp': lines}
    return None


def schedule_today(day):
    cal = load('diary/calendar.json', {})
    ev = [e for e in cal.get('events') or [] if (e.get('date') or '') <= day <= (e.get('endDate') or e.get('date') or '')
          and not str(e.get('cal', '')).startswith('AT')]
    ev.sort(key=lambda e: e.get('start') or '')
    todos = load('data/todos.json', [])
    # 오늘 할 일 전부 (끝낸 것도 done 으로 같이 — 화면에서 줄 긋고 아래로)
    td = [{'id': t.get('id'), 'text': t.get('content'), 'done': bool(t.get('is_completed'))}
          for t in (todos if isinstance(todos, list) else []) if t.get('target_date') == day]
    dy = load('diary/diary.json', {})
    dd = []
    for x in dy.get('ddays') or []:
        try:
            left = (datetime.strptime(x['date'], '%Y-%m-%d').date() - datetime.strptime(day, '%Y-%m-%d').date()).days
        except (KeyError, ValueError):
            continue
        if 0 <= left <= 14:
            dd.append({'title': x.get('title'), 'left': left})
    return ([dict({'time': (e.get('start', '') + ('~' + e['end'] if e.get('end') else '')) if e.get('start') else '종일', 'title': e.get('title'), 'cal': e.get('cal')}, **({'with': True} if with_sion(e) else {})) for e in ev],
            td, dd)


def sion_lines(b):
    """오늘의 알림 속 시온 아침 메시지 (사이트에서 고치면 {text, fav} 모양)"""
    return [x if isinstance(x, str) else str(x.get('text', '')) for x in (b or {}).get('sion') or [] if x]


def brief_text(b):
    """프롬프트에 넣을 오늘의 알림 요약"""
    out = []
    if sion_lines(b):
        out.append(f"- 아침에 시온이 보낸 메시지: {' / '.join(sion_lines(b))}")
    w = b.get('weather')
    if w:
        out.append(f"- 날씨({w['place']}): 지금 {w['now']}°, {w['desc']}, 최고 {w['max']}° 최저 {w['min']}°, 비 올 확률 {w['rain']}%")
    f = b.get('fortune')
    if f:
        out.append(f"- 오하아사 운세({f['sign']}): 12위 중 {f['rank']}위 · {' / '.join(f['jp'])}")
    for e in b.get('schedule') or []:
        out.append(f"- 일정 {e['time']} {e['title']}" + (' (시온과 함께)' if e.get('with') else ''))
    for t in b.get('todos') or []:
        t = t if isinstance(t, dict) else {'text': t}
        out.append(f"- 할 일: {t.get('text')}" + (' (끝냄)' if t.get('done') else ''))
    for d in b.get('ddays') or []:
        out.append(f"- D-{d['left'] or 'DAY'} {d['title']}")
    if b.get('special'):
        out.insert(0, f"- 오늘은 기념일: {', '.join(b['special'])}")
    return '\n'.join(out)


def memory(store):
    return store['memory'].get('summary') or '(아직 없음)'


# ---------------------------------------------------------------- 밤 편지
def make_letter(store, cfg, day, force):
    if day in store['letters'] and not force:
        print(f'{day} 편지는 이미 있어요. (다시 쓰려면 force)')
        return None
    r = cfg['recipient']
    prompt = (f"오늘은 {date_label(day)}. 자기 전, {r}에게 남길 오늘의 편지를 써 줘.\n\n"
              f"# {r}에 대해 기억하는 것\n{memory(store)}\n\n"
              f"# 최근에 쓴 편지 (같은 말 되풀이하지 않기)\n{recent_letters(store, day) or '(없음)'}\n\n"
              f"{trip_note(cfg, day)}"
              f"# 오늘 주고받은 메시지\n{chat_history(store, 20, days=1) or '(없음)'}\n\n"
              f"# 내일부터 사흘 일정 (내일 챙길 것)\n{upcoming(day) or '(없음)'}\n\n"
              f"# 오늘 {r}의 기록\n{gather(day) or '(오늘은 남긴 기록이 거의 없음)'}\n\n"
              f"# 쓰는 법\n{P(cfg, 'letter', '손편지. 600~1000자. 마지막은 잘 자라는 말로.')}\n- 서명 없이 편지 본문만 출력.")
    body, model = gemini(cfg['models']['letter'], system_prompt(cfg), prompt, max_tokens=8192, think=TH(cfg, 'letter'))
    body = clean(body)
    patch = {'letter': {'date': day, 'body': body, 'at': stamp(), 'model': model, 'replies': []}, 'force': force}
    mem = make_memory(store, cfg, day, body)
    if mem:
        patch['memory'] = mem
    return patch


def make_memory(store, cfg, day, new_body):
    every = int(cfg.get('memory_every') or 3)
    upto = store['memory'].get('upto') or ''
    letters = dict(store['letters'])
    letters[day] = {'body': new_body, 'replies': (store['letters'].get(day) or {}).get('replies', [])}
    new = sorted(k for k in letters if k > upto)
    if len(new) < every:
        return None
    chunk = '\n\n'.join(f"[{k}]\n{letters[k]['body']}" + ''.join(
        f"\n  ({'민정' if x['from'] == 'me' else '시온'}) {x['text']}" for x in letters[k].get('replies', [])) for k in new)
    prompt = (f"아래는 기존 기억과 최근 {len(new)}일의 편지·답장이야. 하시온이 아내 {cfg['recipient']}에게 메시지와 편지를 쓸 때 참고할 "
              "짧은 기억을 500자 안쪽으로 다시 정리해 줘. 오래된 일은 과감히 빼고, 요즘 며칠의 상태와 앞으로 있을 일(날짜 포함) 위주로. "
              "민정이 직접 고친 내용(기존 기억)은 존중해. 짧은 문장 목록으로, 사실로 드러난 것만.\n\n"
              f"# 기존 기억\n{store['memory'].get('summary') or '(없음)'}\n\n# 최근 편지\n{chunk}")
    try:
        summary, _ = gemini(cfg['models']['light'], '너는 기록을 간결하게 정리하는 비서야.', prompt, temperature=0.3)
    except SystemExit as e:
        print(f'[기억 정리 건너뜀] {e}', file=sys.stderr)
        return None
    return {'summary': summary, 'upto': new[-1], 'at': stamp(), 'from': new[0]}


# ---------------------------------------------------------------- 아침·점심·저녁 메시지
def make_message(store, cfg, slot):
    t = now()
    day = t.strftime('%Y-%m-%d')
    if not slot:
        slot = 'morning' if 5 <= t.hour < 11 else 'lunch' if 11 <= t.hour < 16 else 'evening' if t.hour < 21 else 'night'
    if slot == 'morning':
        return make_morning(store, cfg, t, day)
    if any(r.get('slot') == slot and r['at'][:10] == day for r in store['chat']):
        print(f'{day} {SLOTS[slot]} 메시지는 이미 있어요.')
        return None
    yesterday = (t - timedelta(days=1)).strftime('%Y-%m-%d')
    focus = P(cfg, slot, {'lunch': '점심 무렵 안부.', 'evening': '저녁 안부.', 'night': '밤 안부.', 'dawn': '새벽에 문득.', 'tripam': '여행 중인 민정에게 아침 연락.'}.get(slot, ''))
    prompt = (f"지금은 {date_label(day)} {t.strftime('%H:%M')}. 민정에게 {SLOTS[slot]} 메시지를 먼저 보내 (선톡).\n{focus}\n"
              f"{P(cfg, 'proactive', '')}\n\n"
              f"{trip_note(cfg, day)}"
              f"# 기억\n{memory(store)}\n\n"
              f"# 어젯밤 편지\n{clip((store['letters'].get(yesterday) or {}).get('body'), 400) or '(없음)'}\n\n"
              f"# 오늘 주고받은 메시지 (참고만. 이어서 답하는 게 아니라 새로 먼저 보내는 메시지야)\n{chat_history(store, 8, days=0.5) or '(없음)'}\n\n"
              f"# 오늘의 알림 (날씨·운세·일정)\n{brief_text((store.get('briefs') or {}).get(day) or {}) or '(없음)'}\n\n"
              f"# 다가오는 일정\n{upcoming(day) or '(없음)'}\n\n"
              f"# 오늘 지금까지 민정의 기록\n{gather(day, upto=t.strftime('%H:%M')) or '(아직 없음)'}\n\n"
              f"# 쓰는 법\n- 말풍선마다 줄을 바꿔. 메시지 본문만.\n{photo_rule(cfg)}")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=4096, think=TH(cfg, 'proactive'))
    at = stamp(t)
    return {'chat': [{'id': new_id('s'), 'from': 'ai', 'text': b, 'at': at, 'slot': slot, 'model': model} for b in bubbles(text, 4)]}


# ---------------------------------------------------------------- 기념일 (아침 메시지는 무조건 이 이야기)
FIXED_DAYS = {'01-01': '새해 첫날', '02-14': '밸런타인데이', '03-14': '화이트데이', '05-05': '어린이날', '10-31': '핼러윈',
              '11-11': '빼빼로데이', '12-24': '크리스마스 이브', '12-25': '크리스마스', '12-31': '한 해의 마지막 날'}
LUNAR_DAYS = {'2026-02-17': '설날', '2027-02-07': '설날', '2028-01-27': '설날', '2029-02-13': '설날', '2030-02-03': '설날',
              '2026-09-25': '추석', '2027-09-15': '추석', '2028-10-03': '추석', '2029-09-22': '추석', '2030-09-12': '추석'}


def specials(cfg, day):
    out = []
    if LUNAR_DAYS.get(day):
        out.append(LUNAR_DAYS[day])
    if FIXED_DAYS.get(day[5:]):
        out.append(FIXED_DAYS[day[5:]])
    try:
        d0 = datetime.strptime(cfg.get('since') or '2026-01-02', '%Y-%m-%d').date()
        d = datetime.strptime(day, '%Y-%m-%d').date()
        n = (d - d0).days + 1
        if n > 1 and n % 100 == 0:
            out.append(f'시온과 함께한 지 {n}일')
        if d != d0 and (d.month, d.day) == (d0.month, d0.day):
            out.append(f'시온과 만난 지 {d.year - d0.year}주년')
    except ValueError:
        pass
    mj = load('minjung/minjung.json', {})
    v = next((x.get('value') for x in mj.get('profile') or [] if x.get('label') == '생년월일'), '') or ''
    m = re.search(r'(\d{4})\D+(\d{1,2})\D+(\d{1,2})', v)
    if m and f'{int(m.group(2)):02d}-{int(m.group(3)):02d}' == day[5:]:
        out.append('민정의 생일')
    return out


# ---------------------------------------------------------------- 일정 5분 전 (내가 미리 넣은 일정만. ATracker·하루 종일은 빼고)
REMIND_AHEAD = 36      # 30분마다 확인 → 다음 확인 전까지 올 일정을 미리 잡아 둠 (분)


def due_events(store, t, cfg=None):
    cfg = cfg or load(CONFIG, {}) or {}
    if not slot_on(cfg, 'remind'):
        return []
    """앞으로 REMIND_AHEAD 분 안에 '5분 전'이 오는 일정 (아직 알리지 않은 것)"""
    day = t.strftime('%Y-%m-%d')
    done = set(store.get('reminded') or [])
    cal = load('diary/calendar.json', {})
    out = []
    for e in cal.get('events') or []:
        if e.get('date') != day or not e.get('start') or str(e.get('cal', '')).startswith('AT'):
            continue
        try:
            st = datetime.strptime(day + ' ' + e['start'][:5], '%Y-%m-%d %H:%M').replace(tzinfo=KST)
        except ValueError:
            continue
        key = f"{day} {e['start'][:5]} {e.get('title')}"
        if key in done or st <= t:
            continue
        if (st - timedelta(minutes=num(AI(cfg, 'remind_min'), 5)) - t).total_seconds() <= REMIND_AHEAD * 60:
            out.append((st, key, e))
    return sorted(out, key=lambda x: x[0])


def make_remind(store, cfg):
    """다음 일정 5분 전까지 기다렸다가 메시지 (15분 안에 이어지는 일정은 한 번에)"""
    due = due_events(store, now(), cfg)
    if not due:
        print('곧 시작하는 일정 없음')
        return None
    first = due[0][0]
    group = [x for x in due if (x[0] - first).total_seconds() <= 15 * 60]
    wait = (first - timedelta(minutes=num(AI(cfg, 'remind_min'), 5)) - now()).total_seconds()
    if wait > 0:
        print(f'{int(wait)}초 기다렸다가 보냄')
        time.sleep(wait)
    t = now()
    day = t.strftime('%Y-%m-%d')
    lines = '\n'.join(f"- {st.strftime('%H:%M')} {e.get('title')}"
                      + (f" (메모: {clip(e['note'], 120)})" if e.get('note') and 'Hash ID' not in e['note'] else '')
                      + (' — 시온도 같이 감' if with_sion(e) else ' — 시온은 같이 안 감') for st, _, e in group)
    prompt = (f"지금은 {date_label(day)} {t.strftime('%H:%M')}. 민정의 일정이 곧({int(num(AI(cfg, 'remind_min'), 5))}분쯤 뒤) 시작해. 그 일정에 맞춰 먼저 메시지를 보내.\n"
              f"# 곧 시작하는 일정\n{lines}\n\n"
              f"{P(cfg, 'remind', '일정 이름과 메모를 보고 그 일에 맞는 짧은 말. 같이 안 가는 일정이면 떨어져서 응원하거나 챙겨 주는 말, 같이 가는 일정이면 같이 가는 사람으로서. 시간 알려 주는 알람처럼 딱딱하게 말하지 마.')}\n\n"
              f"{trip_note(cfg, day)}"
              f"# 기억\n{memory(store)}\n\n"
              f"# 최근 메시지 (참고)\n{chat_history(store, 8, days=0.5) or '(없음)'}\n\n"
              f"# 오늘의 알림\n{brief_text((store.get('briefs') or {}).get(day) or {}) or '(없음)'}\n\n"
              f"# 쓰는 법\n- 말풍선 1~3개. 말풍선마다 줄을 바꿔. 메시지 본문만.")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=4096, think=TH(cfg, 'proactive'))
    at = stamp(t)
    return {'chat': [{'id': new_id('s'), 'from': 'ai', 'text': b, 'at': at, 'slot': 'remind', 'model': model} for b in bubbles(text, 3)],
            'reminded': [k for _, k, _ in group]}


def make_tick(store, cfg):
    """30분마다: 날씨 확인 + (오늘 알림이 없으면 8시 이후 만들기) + 시간 창 안에서 랜덤하게 선톡 하나"""
    import random
    t = now()
    day = t.strftime('%Y-%m-%d')
    h = t.hour + t.minute / 60
    patch = {}
    if due_events(store, t, cfg) and os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
            f.write('remind=1\n')     # → 따로 기다렸다가 5분 전에 보내는 작업(remind)이 뜸
        print('곧 시작하는 일정 있음 → remind')
    w = make_weather(store, cfg)
    if w:
        patch.update(w)
    # 밤 11시~새벽 5시: 그날 다이어리 영수증 한 줄 코멘트가 아직 없으면 남김
    if h >= 23 or h < 5:
        try:
            r = make_receipt(store, cfg, letter_day(t), False)
            if r:
                patch.update(r)
        except Exception as e:
            print(f'[영수증 코멘트 실패] {e}')
    if h >= 8 and not (store.get('briefs') or {}).get(day):
        m = make_morning(store, cfg, t, day)
        if m:
            patch.update(m)
        return patch or None
    # 새벽(1~3시)은 그 '밤'의 날짜 기준, 25% 정도의 날만
    sday = (t - timedelta(hours=5)).strftime('%Y-%m-%d') if h < 5 else day
    wins = dict(WINDOWS)
    if trip_on(day):
        wins[TRIP_WINDOW[0]] = TRIP_WINDOW[1]
    for slot, (a, b) in wins.items():
        if not (a <= h < b):
            continue
        if not slot_on(cfg, 'trip' if slot == 'tripam' else slot):
            print(f'{SLOTS[slot]} 선톡은 꺼져 있음')
            break
        if slot == 'dawn' and random.Random(sday + 'dawn').random() >= num(AI(cfg, 'dawn_chance'), DAWN_CHANCE * 100) / 100:
            print('오늘 새벽은 조용히')
            break
        if any(r.get('slot') == slot and (r['at'][:10] == day) for r in store['chat']):
            print(f'{SLOTS[slot]} 선톡은 오늘 이미 보냄')
            break
        last = store['chat'][-1] if store['chat'] else None
        if last and (t - datetime.fromisoformat(last['at'])).total_seconds() < 25 * 60:
            print('방금 대화 중이라 선톡은 미룸')
            break
        left = max(1, int((b - h) * 2))          # 이 창에 남은 확인 횟수 → 남은 동안 고르게 한 번
        if random.random() < 1 / left:
            m = make_message(store, cfg, slot)
            if m:
                patch.setdefault('chat', []).extend(m['chat'])
        else:
            print(f'{SLOTS[slot]} 선톡은 조금 이따가 (확률 1/{left})')
        break
    return patch or None


def make_morning(store, cfg, t, day):
    """아침: 오늘의 알림(날씨·운세·일정) + 시온 아침 메시지를 AI 한 번으로. 운세 번역도 같이"""
    old = (store.get('briefs') or {}).get(day)
    sent = bool(old and old.get('sion'))   # 아침 메시지는 오늘의 알림(Daily 카드)에만, 대화창에는 안 넣음
    fo = fortune(day)
    if old and sent and (old.get('fortune') or not fo):
        print(f'{day} 아침 알림·메시지는 이미 있어요.')
        return None
    sched, todos, ddays = schedule_today(day)
    b = {'date': day, 'at': stamp(t), 'weather': weather(cfg), 'fortune': fo, 'schedule': sched, 'todos': todos, 'ddays': ddays}
    sp = specials(cfg, day)
    if sp:
        b['special'] = sp
    if old and sent:
        # 메시지는 이미 보냈고 운세만 늦게 나온 경우: 번역만 (짧은 호출 하나)
        text, _ = gemini(cfg['models']['light'], '너는 일본어를 자연스러운 한국어로 옮기는 번역가야.',
                         '아래 오하아사 운세 문장들을 한 줄씩 자연스러운 한국어로 옮겨. 마지막 줄은 행운의 아이템이야. JSON 배열(문자열)만 출력.\n' + '\n'.join(fo['jp']),
                         max_tokens=512, temperature=0.3, json_mode=True)
        fo['ko'] = parse_json(text, list) or []
        return {'brief': dict(old, fortune=fo, weather=old.get('weather') or b['weather'])}
    prompt = (f"지금은 {date_label(day)} {t.strftime('%H:%M')}. 민정에게 아침 메시지를 먼저 보내.\n"
              f"{P(cfg, 'morning', '나른한 아침 인사. 오늘의 알림에서 필요한 것 한두 개만 짚어.')}\n"
              + (f"- 오늘은 {', '.join(sp)}. 아침 메시지는 무조건 이 기념일 이야기로 해. 기념일 이야기가 중심이고 날씨·운세는 곁들일 때만.\n" if sp else '')
              + "\n"
              f"{trip_note(cfg, day)}"
              f"# 오늘의 알림\n{brief_text(b) or '(없음)'}\n\n"
              f"# 기억\n{memory(store)}\n\n"
              f"# 어젯밤 편지\n{clip((store['letters'].get((t - timedelta(days=1)).strftime('%Y-%m-%d')) or {}).get('body'), 300) or '(없음)'}\n\n"
              "# 출력 (JSON 하나만)\n"
              '{"messages": ["말풍선1", "말풍선2"], "fortune_ko": ["운세 문장을 한 줄씩 자연스러운 한국어로", "...", "행운의 아이템"]}\n'
              "- messages: 실제 메신저 말풍선들 (위 지시대로).\n"
              "- fortune_ko: 운세가 없으면 빈 배열.")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=4096, json_mode=True, think=TH(cfg, 'proactive'))
    out = parse_json(text, dict) or {'messages': [text]}
    if fo:
        fo['ko'] = [x for x in out.get('fortune_ko') or [] if isinstance(x, str)]
    msgs = []
    for m in out.get('messages') or []:
        msgs += bubbles(str(m), 3)
    msgs = msgs[:3] or ['…좋은 아침, 내 토끼.']
    b['sion'] = msgs
    b['model'] = model
    return {'brief': b, 'brief_new': True}


# ---------------------------------------------------------------- 날씨가 바뀌면 (AI 안 씀)
SEVERE = [('뇌우', (95, 96, 99)), ('눈', (71, 73, 75, 77, 85, 86)), ('비', (51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82))]
WX_LINES = {
    '비': '{h}쯤 비 온대요. 우산 챙겨요, 내 토끼.',
    '눈': '{h}쯤 눈 온대요. 따뜻하게 입고, 미끄러우니까 천천히 걸어요.',
    '뇌우': '{h}쯤 천둥 친대요. 밖이면 일찍 들어와요.',
}


def make_weather(store, cfg):
    """몇 시간 안에 비·눈·뇌우가 오면(아침 예보에 없던 것) 알림 + 오늘의 알림 카드 고치기"""
    t = now()
    day = t.strftime('%Y-%m-%d')
    b = (store.get('briefs') or {}).get(day)
    if not b or not (7 <= t.hour < 23) or t.minute >= 30:   # 날씨는 한 시간에 한 번만
        print('오늘의 알림이 없거나 밤이라 건너뜀')
        return None
    pl = cfg.get('place') or {'name': '부산 동구', 'lat': 35.1295, 'lon': 129.0454}
    url = (f"https://api.open-meteo.com/v1/forecast?latitude={pl['lat']}&longitude={pl['lon']}"
           '&current=temperature_2m,weather_code&hourly=weather_code,precipitation_probability&forecast_hours=4&timezone=Asia%2FSeoul')
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            w = json.load(r)
    except Exception as e:
        print(f'[날씨 건너뜀] {e}', file=sys.stderr)
        return None
    hr = w.get('hourly') or {}
    hit = None
    for i, code in enumerate(hr.get('weather_code') or []):
        prob = (hr.get('precipitation_probability') or [None] * 99)[i]
        kind = next((k for k, cs in SEVERE if code in cs), None)
        if kind and (prob is None or prob >= 50):
            hit = (kind, int(hr['time'][i][11:13]))
            break
    if not hit:
        print('특별한 날씨 없음')
        return None
    kind, h = hit
    mw = b.get('weather') or {}
    already = [a.get('kind') for a in b.get('alerts') or []]
    if kind in already or (kind == mw.get('desc') or (kind == '비' and mw.get('desc') in ('비', '소나기', '이슬비'))) and (mw.get('rain') or 0) >= 60:
        print(f'{kind}: 이미 알렸거나 아침 예보에 있던 날씨')
        return None
    text = WX_LINES[kind].format(h=f"{'오전' if h < 12 else '오후'} {h % 12 or 12}시")
    alert = {'kind': kind, 'hour': h, 'at': stamp(t), 'text': text}
    nb = dict(b)
    nb['alerts'] = (b.get('alerts') or []) + [alert]
    cur = w.get('current') or {}
    if mw and cur:
        nb['weather'] = dict(mw, now=round(cur.get('temperature_2m', mw.get('now', 0))), desc=wdesc(cur.get('weather_code')) or mw.get('desc'))
    return {'brief': nb, 'alert': alert}


def parse_json(text, kind):
    try:
        v = json.loads(text)
    except Exception:
        m = re.search(r'[\[{].*[\]}]', text or '', re.S)
        try:
            v = json.loads(m.group(0)) if m else None
        except Exception:
            v = None
    return v if isinstance(v, kind) else None


# ---------------------------------------------------------------- 내 메시지에 답장
def make_chat(store, cfg):
    chat = store['chat']
    if not chat or chat[-1]['from'] != 'me':
        print('답할 메시지가 없어요.')
        return None
    t = now()
    day = t.strftime('%Y-%m-%d')
    # 오늘 답장 횟수 (말풍선 수가 아니라 답장 한 번 = 같은 시각에 보낸 말풍선 묶음)
    today_ai = len({r['at'] for r in chat if r['from'] == 'ai' and r['at'][:10] == day and not r.get('slot') and r.get('kind') != 'call'})
    if today_ai >= int(cfg.get('max_chat_replies_per_day') or 60):
        print('오늘 답장 한도를 넘었어요.')
        return None
    ringing = any(c.get('status') in ('ringing', 'live') for c in store.get('calls') or [])
    prompt = (f"지금은 {date_label(day)} {t.strftime('%H:%M')}. 민정이 메시지를 보냈어. 이어서 답장해.\n\n"
              f"{trip_note(cfg, day)}"
              f"# 기억\n{memory(store)}\n\n"
              f"# 오늘 민정의 기록 (참고)\n{clip(gather(day, upto=t.strftime('%H:%M')), 2500) or '(아직 없음)'}\n\n"
              f"# 오늘의 알림·다가오는 일정\n{brief_text((store.get('briefs') or {}).get(day) or {})}\n{upcoming(day)}\n\n"
              f"# 대화 (마지막이 방금 온 메시지)\n{chat_history(store, 16)}\n\n"
              f"# 쓰는 법\n{P(cfg, 'chat', '짧은 말풍선 1~4개.')}\n- 말풍선마다 줄을 바꿔. 메시지 본문만.\n{photo_rule(cfg)}\n"
              + ('' if ringing else f"{P(cfg, 'callmsg', CALL_RULE)}\n"))
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=4096, think=TH(cfg, 'chat'))
    at = stamp(t)
    ring = bool(re.search(r'\[\s*전화\s*\]', text)) and not ringing
    text = re.sub(r'\[\s*전화\s*\]', '', text).strip() or '…잠깐만요.'
    patch = {'chat': [{'id': new_id('c'), 'from': 'ai', 'text': b, 'at': at, 'model': model} for b in bubbles(text, 4)]}
    if ring:
        patch['call_new'] = {'id': new_id('k'), 'dir': 'in', 'status': 'ringing', 'at': stamp(), 'lines': []}
    return patch


# ---------------------------------------------------------------- 전화 (말은 글자로: 시온 대사를 만들고, 화면이 띄우거나 읽어 줌)
CALL_RULE = ("- 민정이 전화하고 싶어 하거나, 목소리 듣고 싶다고 하거나, 지금은 통화가 더 어울릴 때만 시온이 전화를 걸 수 있어. "
             "그럴 땐 메시지 마지막 줄에 [전화] 라고만 써. 평소엔 쓰지 마.")


def make_call(store, cfg, call_id):
    c = next((x for x in store.get('calls') or [] if x.get('id') == call_id), None)
    if not c or c.get('status') != 'live':
        print('통화 중이 아니에요.')
        return None
    lines = c.get('lines') or []
    if lines and lines[-1]['from'] == 'ai':
        print('민정 차례예요.')
        return None
    t = now()
    day = t.strftime('%Y-%m-%d')
    who = lambda r: '시온' if r['from'] == 'ai' else '민정'
    talk = '\n'.join(f"{who(r)}: {r['text']}" for r in lines[-20:])
    if not lines:
        start = '시온이 전화를 걸었고 민정이 방금 받았어. 먼저 말해.' if c.get('dir') == 'in' else '민정이 전화를 걸었고 시온이 방금 받았어. 받으면서 먼저 말해.'
    else:
        start = '민정의 마지막 말에 이어서 대답해.'
    prompt = (f"지금은 {date_label(day)} {t.strftime('%H:%M')}. 민정과 전화 통화 중이야. {start}\n\n"
              f"{trip_note(cfg, day)}"
              f"# 기억\n{memory(store)}\n\n"
              f"# 오늘의 알림·다가오는 일정\n{brief_text((store.get('briefs') or {}).get(day) or {})}\n{upcoming(day)}\n\n"
              f"# 오늘 민정의 기록 (참고)\n{clip(gather(day, upto=t.strftime('%H:%M')), 1500) or '(아직 없음)'}\n\n"
              f"# 최근 메시지\n{chat_history(store, 8, days=1) or '(없음)'}\n\n"
              f"# 지금까지 통화\n{talk or '(방금 연결됨)'}\n\n"
              f"# 말하는 법\n{P(cfg, 'call', '전화로 말하는 대사만. 한두 문장. 숨소리나 행동 묘사, 괄호 금지.')}\n- 시온이 지금 할 말만 출력.")
    # 통화: 생각 보통, 4번 키부터, 막히면 기다리지 않고 바로 다른 모델로
    models = list(dict.fromkeys(cfg['models']['light'] + cfg['models']['letter']))
    text, model = gemini(models, system_prompt(cfg), prompt, max_tokens=2048, think=TH(cfg, 'call'), key_first='GEMINI_API_KEY' + ('' if str(AI(cfg, 'call_key', '4')) == '1' else '_' + str(AI(cfg, 'call_key', '4'))), fast=True)
    text = re.sub(r'\s{2,}', ' ', re.sub(r'[(（][^)）]*[)）]', '', clean(text)).replace('\n', ' ')).strip() or '…여보?'   # 통화엔 괄호 묘사 없이
    return {'call_line': {'id': call_id, 'item': {'id': new_id('l'), 'from': 'ai', 'text': text, 'at': stamp(t), 'model': model}}}


# ---------------------------------------------------------------- 편지 답장에 답글
def make_reply(store, cfg, day):
    lt = store['letters'].get(day)
    if not lt:
        sys.exit(f'{day} 편지가 없어요.')
    replies = lt.get('replies', [])
    if not replies or replies[-1]['from'] != 'me':
        print('답할 답장이 없어요.')
        return None
    if sum(1 for r in replies if r['from'] == 'ai') >= int(cfg.get('max_letter_replies') or 5):
        print('이 편지에는 답글을 더 달지 않아요.')
        return None
    thread = '\n'.join(f"{'민정' if r['from'] == 'me' else '시온'}: {r['text']}" for r in replies)
    prompt = (f"{date_label(day)} 밤에 네가 쓴 편지와, 민정이 거기에 단 답장이야. 마지막 답장에 짧게 답글을 써.\n\n"
              f"# 네 편지\n{lt['body']}\n\n# 답장\n{thread}\n\n"
              f"# 쓰는 법\n{P(cfg, 'reply', '짧은 추신. 2~5문장.')}\n- 본문만.")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=4096, think=TH(cfg, 'letter'))
    text = clean(text)
    return {'reply': {'date': day, 'item': {'id': new_id('r'), 'from': 'ai', 'text': text, 'at': stamp(), 'model': model}}}


# ---------------------------------------------------------------- 결과 덧붙이기 (최신 파일 기준, 두 번 실행해도 같음)
RECEIPT = 'diary/receipt.json'


def make_receipt(store, cfg, day, force):
    """다이어리 '오늘의 영수증' 맨 아래에 들어갈 시온의 한 줄 코멘트"""
    old = (load(RECEIPT, {}) or {}).get('notes') or {}
    if day in old and not force:
        print(f'{day} 영수증 코멘트는 이미 있어요.')
        return None
    rec = gather(day)
    prompt = (f"지금은 {date_label(day)} 밤. 민정의 다이어리에 '오늘의 영수증'(오늘 한 일 목록)이 있어. "
              f"그 영수증 맨 아래에 들어갈 한 줄 코멘트를 남겨.\n\n"
              f"# 기억\n{memory(store)}\n\n"
              f"# 오늘 민정의 기록\n{rec or '(기록 없음)'}\n\n"
              f"# 쓰는 법\n- 딱 한 줄, 40자 안쪽. 오늘 한 일 중 하나를 콕 집어 다정하게.\n"
              f"- 따옴표·이모지·해시태그·괄호 없이 코멘트 본문만.")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=1024)
    line = next((l.strip().strip('"“”').strip() for l in clean(text).split('\n') if l.strip().strip('"“”').strip()), '')
    if not line:
        return None
    return {'receipt': {'date': day, 'text': clip(line, 80), 'at': stamp(), 'model': model}}


def apply_receipt(patch):
    r = patch.get('receipt')
    if not r:
        return
    data = load(RECEIPT, {}) or {}
    data.setdefault('notes', {})[r['date']] = {k: r[k] for k in ('text', 'at', 'model')}
    data['updated_at'] = stamp()
    write(RECEIPT, data)


def apply(store, patch):
    calls = store.setdefault('calls', [])
    if patch.get('call_new') and not any(c.get('id') == patch['call_new']['id'] for c in calls):
        calls.append(patch['call_new'])
    cl = patch.get('call_line')
    if cl:
        c = next((x for x in calls if x.get('id') == cl['id']), None)
        if c is not None and cl['item']['id'] not in {x.get('id') for x in c.setdefault('lines', [])}:
            c['lines'].append(cl['item'])
    store['calls'] = calls[-200:]
    lt = patch.get('letter')
    if lt:
        old = store['letters'].get(lt['date'])
        if not old or patch.get('force'):
            store['letters'][lt['date']] = lt
    if patch.get('memory'):
        old = store.get('memory') or {}
        if old.get('summary'):
            log = store.setdefault('memory_log', [])
            if not any(x.get('summary') == old['summary'] for x in log):
                log.append({k: old[k] for k in ('summary', 'upto', 'at', 'from', 'edited') if k in old})
            store['memory_log'] = log[-40:]
        store['memory'] = patch['memory']
    if patch.get('reminded'):
        store['reminded'] = (list(dict.fromkeys((store.get('reminded') or []) + patch['reminded'])))[-60:]
    if patch.get('brief'):
        b = patch['brief']
        briefs = store.setdefault('briefs', {})
        briefs[b['date']] = b
        # 오늘의 알림은 Daily 아카이브로 계속 보관 (지우는 건 사이트에서)
    ids = {r.get('id') for r in store['chat']}
    for r in patch.get('chat') or []:
        if r['id'] not in ids:
            store['chat'].append(r)
    rp = patch.get('reply')
    if rp and rp['date'] in store['letters']:
        reps = store['letters'][rp['date']].setdefault('replies', [])
        if rp['item']['id'] not in {x.get('id') for x in reps}:
            reps.append(rp['item'])
    cut = (now() - timedelta(days=KEEP_CHAT_DAYS)).strftime('%Y-%m-%d')
    store['chat'] = [r for r in store['chat'] if r['at'][:10] >= cut]
    store['chat'].sort(key=lambda r: r['at'])
    store['updated_at'] = stamp()
    return store


# ---------------------------------------------------------------- 웹앱 알림 (Web Push, RFC 8291 · 8292)
PUSH_SUBS = 'minjung/push.json'


def b64u(b):
    import base64
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def unb64u(s):
    import base64
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def push_encrypt(payload, p256dh, auth):
    """aes128gcm 암호화 (받는 기기 키로)"""
    import hashlib
    import hmac
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    hm = lambda k, m: hmac.new(k, m, hashlib.sha256).digest()
    ua_pub = unb64u(p256dh)
    ua_key = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), ua_pub)
    as_priv = ec.generate_private_key(ec.SECP256R1())
    as_pub = as_priv.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    secret = as_priv.exchange(ec.ECDH(), ua_key)
    ikm = hm(hm(unb64u(auth), secret), b'WebPush: info\x00' + ua_pub + as_pub + b'\x01')[:32]
    salt = os.urandom(16)
    prk = hm(salt, ikm)
    cek = hm(prk, b'Content-Encoding: aes128gcm\x00\x01')[:16]
    nonce = hm(prk, b'Content-Encoding: nonce\x00\x01')[:12]
    body = AESGCM(cek).encrypt(nonce, payload + b'\x02', None)
    return salt + (4096).to_bytes(4, 'big') + bytes([len(as_pub)]) + as_pub + body


def vapid_header(endpoint, private_b64):
    """보내는 쪽 확인용 서명 (VAPID)"""
    from urllib.parse import urlparse
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    key = ec.derive_private_key(int.from_bytes(unb64u(private_b64), 'big'), ec.SECP256R1())
    pub = key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
    u = urlparse(endpoint)
    claims = {'aud': f'{u.scheme}://{u.netloc}', 'exp': int(time.time()) + 12 * 3600,
              'sub': os.environ.get('VAPID_SUBJECT') or 'mailto:push@example.com'}
    signing = b64u(json.dumps({'typ': 'JWT', 'alg': 'ES256'}).encode()) + '.' + b64u(json.dumps(claims).encode())
    r, s_ = decode_dss_signature(key.sign(signing.encode(), ec.ECDSA(hashes.SHA256())))
    jwt = signing + '.' + b64u(r.to_bytes(32, 'big') + s_.to_bytes(32, 'big'))
    return f'vapid t={jwt}, k={b64u(pub)}'


def notices_of(patch, cfg):
    """결과에서 알림 글 만들기 — 말풍선 하나에 알림 하나"""
    title = cfg.get('contact') or cfg.get('name') or '시온'
    out = []
    if patch.get('call_new'):
        out.append({'title': title, 'body': '📞 전화가 와요', 'tab': 'Call', 'tag': 'sion-call-' + patch['call_new']['id']})
    if patch.get('alert'):
        a = patch['alert']
        out.append({'title': title, 'body': a['text'], 'tab': 'Notice', 'tag': 'sion-wx-' + a['at']})
    if patch.get('brief_new'):
        b = patch['brief']
        out += [{'title': title, 'body': '사진' if PHOTO.fullmatch(t) else clip(t, 180), 'tab': 'Notice', 'tag': f"sion-am-{b['date']}-{i}"} for i, t in enumerate(sion_lines(b))]
    out += [{'title': title, 'body': '사진' if PHOTO.fullmatch(r['text']) else clip(r['text'], 180), 'tab': 'Message', 'tag': 'sion-' + r['id']}
            for r in patch.get('chat') or [] if r['from'] == 'ai']
    if patch.get('letter'):
        out.append({'title': title, 'body': '편지가 도착했어요 ♡', 'tab': 'Letter', 'tag': 'sion-letter'})
    if patch.get('reply'):
        out.append({'title': title, 'body': clip(patch['reply']['item']['text'], 180), 'tab': 'Letter', 'tag': 'sion-' + patch['reply']['item']['id']})
    return out


def notify(patch, cfg):
    key = os.environ.get('VAPID_PRIVATE_KEY', '').strip()
    subs = (load(PUSH_SUBS, {}) or {}).get('subs') or []
    notes = notices_of(patch, cfg)
    if not notes or not subs:
        print('알림 보낼 것 없음')
        return
    if not key:
        print('VAPID_PRIVATE_KEY가 없어서 알림은 건너뜀')
        return
    # 알림 아이콘 = BANG에서 넣은 시온 프로필 사진 (사이트 주소로)
    photo = cfg.get('photo')
    if photo:
        repo = os.environ.get('GITHUB_REPOSITORY', '/')
        owner, name = repo.split('/', 1)
        base = f'https://{owner}.github.io/' + ('' if name.endswith('.github.io') else name + '/')
        for n in notes:
            n['icon'] = photo if photo.startswith('http') else base + photo
    for i, note in enumerate(notes):
        if i:
            time.sleep(1.2)   # 순서대로 도착하게
        data = json.dumps(note, ensure_ascii=False).encode()
        for sub in subs:
            try:
                req = urllib.request.Request(sub['endpoint'], data=push_encrypt(data, sub['keys']['p256dh'], sub['keys']['auth']), method='POST', headers={
                    'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', 'TTL': '86400', 'Urgency': 'high',
                    'Authorization': vapid_header(sub['endpoint'], key)})
                with urllib.request.urlopen(req, timeout=30) as r:
                    print(f'[알림] {r.status}')
            except urllib.error.HTTPError as e:
                print(f'[알림 실패] HTTP {e.code} {e.read().decode(errors="replace")[:200]}')
            except Exception as e:
                print(f'[알림 실패] {e}')


# ----------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['letter', 'message', 'chat', 'reply', 'weather', 'tick', 'remind', 'call', 'receipt', 'apply', 'notify', 'preview'])
    ap.add_argument('patch', nargs='?')
    ap.add_argument('--date')
    ap.add_argument('--slot', choices=list(SLOTS) + [''], default='')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--out')
    ap.add_argument('--id', default='')
    a = ap.parse_args()

    if a.mode == 'preview':
        print(gather(a.date or letter_day()))
        return
    if a.mode == 'apply':
        patch = load(a.patch, None)
        if not patch:
            print('덧붙일 결과가 없어요.')
            return
        apply_receipt(patch)
        if set(patch) - {'receipt'}:
            write(STORE, apply(load_store(), patch))
        print('저장했어요.')
        return

    cfg = load(CONFIG, None)
    if not cfg:
        sys.exit(f'{CONFIG}을 읽지 못했어요.')
    if a.mode == 'notify':
        patch = load(a.patch, None)
        if patch:
            notify(patch, cfg)
        return
    store = load_store()
    if a.mode == 'letter':
        patch = make_letter(store, cfg, a.date or letter_day(), a.force)
    elif a.mode == 'message':
        patch = make_message(store, cfg, a.slot)
    elif a.mode == 'chat':
        patch = make_chat(store, cfg)
    elif a.mode == 'weather':
        patch = make_weather(store, cfg)
    elif a.mode == 'call':
        patch = make_call(store, cfg, a.id)
    elif a.mode == 'tick':
        patch = make_tick(store, cfg)
    elif a.mode == 'remind':
        patch = make_remind(store, cfg)
    elif a.mode == 'receipt':
        patch = make_receipt(store, cfg, a.date or letter_day(), a.force)
    else:
        patch = make_reply(store, cfg, a.date or letter_day())
    if patch and a.out:
        write(a.out, patch)
        print('만들었어요.')


if __name__ == '__main__':
    main()
