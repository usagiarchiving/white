"""하시온의 메시지 · 편지 · 답장 만들기 (GitHub Actions에서 실행)

  python letter.py letter  [--date YYYY-MM-DD] [--force] --out p.json   # 밤 편지 (하루 한 통)
  python letter.py message [--slot morning|lunch|evening]  --out p.json   # 아침·점심·저녁 메시지
  python letter.py chat                                     --out p.json   # 내가 보낸 메시지에 답장
  python letter.py reply   --date YYYY-MM-DD                --out p.json   # 편지에 쓴 내 답장에 답글
  python letter.py apply p.json      # 만든 결과를 최신 minjung/letters.json 에 덧붙임 (같은 건 두 번 안 붙음)
  python letter.py preview [--date]  # AI 없이 모은 하루 기록만 보기

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
SLOTS = {'morning': '아침', 'lunch': '점심', 'evening': '저녁'}
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
        f"- {(e.get('start','')+'~'+e.get('end','')) if e.get('start') else '종일'} [{e.get('cal')}] {e.get('title')}"
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


def gemini(models, system, prompt, max_tokens=4096, temperature=0.95):
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not key:
        sys.exit('GEMINI_API_KEY가 없어요. 저장소 Settings → Secrets and variables → Actions에 넣어 주세요.')
    body = {
        'systemInstruction': {'parts': [{'text': system}]},
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': temperature, 'maxOutputTokens': max_tokens},
        'safetySettings': SAFETY,
    }
    errors = []
    for model in models:
        for attempt in range(2):
            req = urllib.request.Request(
                f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
                data=json.dumps(body).encode(), method='POST',
                headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
            try:
                with urllib.request.urlopen(req, timeout=180) as r:
                    data = json.load(r)
                cand = (data.get('candidates') or [{}])[0]
                text = ''.join(p.get('text', '') for p in (cand.get('content') or {}).get('parts') or [] if not p.get('thought')).strip()
                if text:
                    print(f'[모델] {model}')
                    return text, model
                errors.append(f'{model}: 빈 응답 ({cand.get("finishReason") or data.get("promptFeedback")})')
                break
            except urllib.error.HTTPError as e:
                errors.append(f'{model}: HTTP {e.code} {e.read().decode(errors="replace")[:300]}')
                if e.code in (429, 500, 503) and attempt == 0:
                    time.sleep(20)
                    continue
                break
            except Exception as e:
                errors.append(f'{model}: {e}')
                break
    sys.exit('AI 호출 실패\n' + '\n'.join(errors))


def system_prompt(cfg):
    persona = cfg['persona'] if isinstance(cfg['persona'], str) else '\n'.join(cfg['persona'])
    return (persona + '\n\n'
            '지금 하는 일\n'
            f"- 너는 아내 {cfg['recipient']}에게 휴대폰 메시지나 편지를 보내고 있어. 시온 본인의 말만 쓴다. 지문·행동 묘사·따옴표 없이 보내는 글 그대로.\n"
            f"- 너는 {cfg['recipient']}가 남긴 기록(혼잣말, 식사, 일정, 할 일, 일기 등)을 다 보고 있는 남편이다. 기록에 있는 일은 자연스럽게 알고 있는 듯 말하되, 기록을 나열하거나 보고하듯 요약하지 마.\n"
            '- 기록에 없는 사건·사람·감정을 사실처럼 지어내지 마. 시온 자신의 하루(임무, 낮잠 등)는 가볍게 곁들여도 된다.\n'
            '- 아프거나 지친 기록이 있으면 시온다운 방식으로 챙겨. 의학적 조언은 하지 마.\n'
            '- 행동·표정·상황 서술은 절대 금지. *별표*나 (괄호)로 행동을 묘사하지 말고, 휴대폰으로 실제로 보내는 글자만 써.\n'
            '- 민정이 답장을 안 했거나 늦게 했어도 그걸 따지거나 "왜 답이 없냐"고 묻지 마. 메시지가 끊기는 건 자연스러운 일이야.\n'
            '- 지난 대화는 참고만 해. 같은 이야기를 또 해도 되지만 예전 주제를 오래 끌고 가지 말고, 지금 시각과 지금 기록을 중심으로 말해.\n'
            '- 마크다운(#, **, - 목록)과 이모지는 쓰지 마.')


PHOTO = re.compile(r'\(\s*사진\s*[:：]\s*([^()]+?)\s*\)')
PHOTO_RULE = ('- 아주 가끔(대화 몇 번에 한 번 정도) 사진을 보낼 수 있어. 그때는 말풍선 하나를 통째로 (사진: 무엇을 찍은 사진인지 짧은 설명) 형식으로 써. '
              '괄호는 사진에만 써.')


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
    if len(parts) > limit:
        parts = parts[:limit - 1] + [' '.join(parts[limit - 1:])]
    return parts or [text.strip() or '…']


def chat_history(store, n=24):
    rows = store['chat'][-n:]
    who = lambda r: '시온' if r['from'] == 'ai' else '민정'
    return '\n'.join(f"[{r['at'][5:16].replace('T', ' ')}] {who(r)}: {r['text']}" for r in rows)


def recent_letters(store, before, n=3):
    keys = sorted(k for k in store['letters'] if k < before)[-n:]
    return '\n\n'.join(f"[{k}]\n{clip(store['letters'][k]['body'], 500)}" for k in keys)


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
              f"# 오늘 주고받은 메시지\n{chat_history(store) or '(없음)'}\n\n"
              f"# 오늘 {r}의 기록\n{gather(day) or '(오늘은 남긴 기록이 거의 없음)'}\n\n"
              f"# 쓰는 법\n- 손편지. 길이 {cfg.get('letter_length', '600~1000자')}. 메시지보다는 조금 더 솔직하고 깊게.\n"
              "- 첫 줄은 호칭(여보, 내 토끼 등)으로 시작해 평범한 문단으로.\n"
              "- 오늘 기록 중 마음에 걸린 것 두세 가지를 골라 시온의 시선으로 이야기해.\n"
              "- 마지막은 잘 자라는 말로 끝내고 서명은 쓰지 마(화면에서 따로 붙음). 편지 본문만 출력.")
    body, model = gemini(cfg['models']['letter'], system_prompt(cfg), prompt, max_tokens=8192)
    body = clean(body)
    patch = {'letter': {'date': day, 'body': body, 'at': stamp(), 'model': model, 'replies': []}, 'force': force}
    mem = make_memory(store, cfg, day, body)
    if mem:
        patch['memory'] = mem
    return patch


def make_memory(store, cfg, day, new_body):
    every = int(cfg.get('memory_every') or 7)
    upto = store['memory'].get('upto') or ''
    letters = dict(store['letters'])
    letters[day] = {'body': new_body, 'replies': (store['letters'].get(day) or {}).get('replies', [])}
    new = sorted(k for k in letters if k > upto)
    if len(new) < every:
        return None
    chunk = '\n\n'.join(f"[{k}]\n{letters[k]['body']}" + ''.join(
        f"\n  ({'민정' if x['from'] == 'me' else '시온'}) {x['text']}" for x in letters[k].get('replies', [])) for k in new)
    prompt = (f"아래는 기존 기억과 최근 {len(new)}일의 편지·답장, 그리고 최근 메시지야. 하시온이 아내 {cfg['recipient']}에게 "
              "앞으로 메시지와 편지를 쓸 때 참고할 기억을 800자 안쪽으로 다시 정리해 줘. 반복되는 생활 패턴, 좋아하는 것, 고민, "
              "진행 중인 일(시험·전시 등은 날짜 포함), 둘 사이에 생긴 약속이나 농담을 짧은 문장 목록으로. 사실로 드러난 것만.\n\n"
              f"# 기존 기억\n{store['memory'].get('summary') or '(없음)'}\n\n# 최근 편지\n{chunk}\n\n# 최근 메시지\n{chat_history(store, 40)}")
    try:
        summary, _ = gemini(cfg['models']['light'], '너는 기록을 간결하게 정리하는 비서야.', prompt, temperature=0.3)
    except SystemExit as e:
        print(f'[기억 정리 건너뜀] {e}', file=sys.stderr)
        return None
    return {'summary': summary, 'upto': new[-1], 'at': stamp()}


# ---------------------------------------------------------------- 아침·점심·저녁 메시지
def make_message(store, cfg, slot):
    t = now()
    day = t.strftime('%Y-%m-%d')
    if not slot:
        slot = 'morning' if 5 <= t.hour < 11 else 'lunch' if 11 <= t.hour < 16 else 'evening'
    if any(r.get('slot') == slot and r['at'][:10] == day for r in store['chat']):
        print(f'{day} {SLOTS[slot]} 메시지는 이미 있어요.')
        return None
    yesterday = (t - timedelta(days=1)).strftime('%Y-%m-%d')
    focus = {
        'morning': '아침. 막 일어났을 민정에게 보내는 나른한 아침 인사. 오늘 일정·할 일·디데이가 있으면 슬쩍 짚어.',
        'lunch': '점심 무렵. 지금까지 남긴 기록(식사, 혼잣말, 기분)을 보고 안부. 밥 먹었는지, 뭘 먹었는지.',
        'evening': '저녁. 하루를 마쳐 가는 민정에게. 언제 들어오는지, 보고 싶다는 마음. 밤엔 편지가 따로 가니 짧게.',
    }[slot]
    prompt = (f"지금은 {date_label(day)} {t.strftime('%H:%M')}. 민정에게 {SLOTS[slot]} 메시지를 먼저 보내.\n{focus}\n\n"
              f"# 기억\n{memory(store)}\n\n"
              f"# 어젯밤 편지\n{clip((store['letters'].get(yesterday) or {}).get('body'), 400) or '(없음)'}\n\n"
              f"# 최근 메시지 (참고만. 이어서 답하는 게 아니라 새로 먼저 보내는 메시지야)\n{chat_history(store, 8) or '(없음)'}\n\n"
              f"# 오늘 지금까지 민정의 기록\n{gather(day, upto=t.strftime('%H:%M')) or '(아직 없음)'}\n\n"
              f"# 쓰는 법\n- 실제 메신저처럼 짧은 말풍선 1~3개. 말풍선마다 줄을 바꿔. 전체 100자 안쪽. 메시지 본문만.\n{PHOTO_RULE}")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=1024)
    at = stamp(t)
    return {'chat': [{'id': new_id('s'), 'from': 'ai', 'text': b, 'at': at, 'slot': slot, 'model': model} for b in bubbles(text, 3)]}


# ---------------------------------------------------------------- 내 메시지에 답장
def make_chat(store, cfg):
    chat = store['chat']
    if not chat or chat[-1]['from'] != 'me':
        print('답할 메시지가 없어요.')
        return None
    t = now()
    day = t.strftime('%Y-%m-%d')
    today_ai = sum(1 for r in chat if r['from'] == 'ai' and r['at'][:10] == day and not r.get('slot'))
    if today_ai >= int(cfg.get('max_chat_replies_per_day') or 30):
        print('오늘 답장 한도를 넘었어요.')
        return None
    prompt = (f"지금은 {date_label(day)} {t.strftime('%H:%M')}. 민정이 메시지를 보냈어. 이어서 답장해.\n\n"
              f"# 기억\n{memory(store)}\n\n"
              f"# 오늘 민정의 기록 (참고)\n{clip(gather(day, upto=t.strftime('%H:%M')), 2500) or '(아직 없음)'}\n\n"
              f"# 대화 (마지막이 방금 온 메시지)\n{chat_history(store, 30)}\n\n"
              f"# 쓰는 법\n- 실제 메신저처럼 짧은 말풍선 1~4개. 말풍선마다 줄을 바꿔. 마지막 메시지에 직접 반응. 메시지 본문만.\n{PHOTO_RULE}")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=1024)
    at = stamp(t)
    return {'chat': [{'id': new_id('c'), 'from': 'ai', 'text': b, 'at': at, 'model': model} for b in bubbles(text, 4)]}


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
              "# 쓰는 법\n- 2~5문장, 300자 안쪽. 편지에 이어 쓰는 짧은 추신 같은 느낌. 본문만.")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=2048)
    text = clean(text)
    return {'reply': {'date': day, 'item': {'id': new_id('r'), 'from': 'ai', 'text': text, 'at': stamp(), 'model': model}}}


# ---------------------------------------------------------------- 결과 덧붙이기 (최신 파일 기준, 두 번 실행해도 같음)
def apply(store, patch):
    lt = patch.get('letter')
    if lt:
        old = store['letters'].get(lt['date'])
        if not old or patch.get('force'):
            store['letters'][lt['date']] = lt
    if patch.get('memory'):
        store['memory'] = patch['memory']
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


def notice_of(patch, cfg):
    """결과에서 알림 글 만들기"""
    title = cfg.get('contact') or cfg.get('name') or '시온'
    chat = [r for r in patch.get('chat') or [] if r['from'] == 'ai']
    if chat:
        body = '\n'.join('사진' if PHOTO.fullmatch(r['text']) else r['text'] for r in chat)
        return {'title': title, 'body': clip(body, 180), 'tab': 'Message', 'tag': 'sion-msg'}
    if patch.get('letter'):
        return {'title': title, 'body': '편지가 도착했어요 ♡', 'tab': 'Letter', 'tag': 'sion-letter'}
    if patch.get('reply'):
        return {'title': title, 'body': clip(patch['reply']['item']['text'], 180), 'tab': 'Letter', 'tag': 'sion-letter'}
    return None


def notify(patch, cfg):
    key = os.environ.get('VAPID_PRIVATE_KEY', '').strip()
    subs = (load(PUSH_SUBS, {}) or {}).get('subs') or []
    note = notice_of(patch, cfg)
    if not note or not subs:
        print('알림 보낼 것 없음')
        return
    if not key:
        print('VAPID_PRIVATE_KEY가 없어서 알림은 건너뜀')
        return
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
    ap.add_argument('mode', choices=['letter', 'message', 'chat', 'reply', 'apply', 'notify', 'preview'])
    ap.add_argument('patch', nargs='?')
    ap.add_argument('--date')
    ap.add_argument('--slot', choices=list(SLOTS) + [''], default='')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--out')
    a = ap.parse_args()

    if a.mode == 'preview':
        print(gather(a.date or letter_day()))
        return
    if a.mode == 'apply':
        patch = load(a.patch, None)
        if not patch:
            print('덧붙일 결과가 없어요.')
            return
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
    else:
        patch = make_reply(store, cfg, a.date or letter_day())
    if patch and a.out:
        write(a.out, patch)
        print('만들었어요.')


if __name__ == '__main__':
    main()
