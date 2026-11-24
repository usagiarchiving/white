"""편지 · 시간대별 메시지 · 답장 만들기 (GitHub Actions에서 실행)

사용:
  python letter.py letter [--date YYYY-MM-DD] [--force]   # 오늘 편지 (하루 한 통)
  python letter.py message [--slot morning|lunch|evening] # 시간대별 짧은 메시지 (slot 없으면 지금 시각으로)
  python letter.py reply --date YYYY-MM-DD                 # 내 답장에 캐릭터 답글

API 키: 환경변수 GEMINI_API_KEY (저장소 Settings → Secrets → Actions)
결과: letters/letters.json 에 저장 (커밋은 워크플로가 함)
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
STORE = os.path.join(ROOT, 'letters', 'letters.json')
CONFIG = os.path.join(ROOT, 'letters', 'config.json')
SLOTS = {'morning': '아침', 'lunch': '점심', 'evening': '저녁'}
WEEK = '월화수목금토일'


# ---------------------------------------------------------------- 파일
def load(path, fallback):
    try:
        with open(os.path.join(ROOT, path) if not os.path.isabs(path) else path, encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f'[읽기 건너뜀] {path}: {e}', file=sys.stderr)
        return fallback


def save_store(store):
    store['updated_at'] = now().isoformat(timespec='seconds')
    with open(STORE, 'w', encoding='utf-8') as f:
        json.dump(store, f, ensure_ascii=False, indent=1)
        f.write('\n')


def now():
    return datetime.now(KST)


def letter_day(t=None):
    """새벽 5시 전에 부르면 아직 '어제'의 밤으로 침"""
    t = t or now()
    return (t - timedelta(hours=5)).strftime('%Y-%m-%d')


def strip_html(s):
    s = re.sub(r'<br\s*/?>|</div>|</p>', '\n', s or '', flags=re.I)
    s = re.sub(r'<[^>]+>', '', s)
    return re.sub(r'\n{3,}', '\n\n', html.unescape(s)).strip()


def clip(s, n):
    s = (s or '').strip()
    return s if len(s) <= n else s[:n] + '…'


# ---------------------------------------------------------------- 하루 기록 모으기
def gather(day, upto=None):
    """day(YYYY-MM-DD) 하루의 기록을 사람이 읽는 글로. upto(HH:MM)가 있으면 그 시각까지만"""
    out = []

    def ok_time(t):
        return not upto or not t or t <= upto

    def add(title, lines):
        lines = [l for l in lines if l]
        if lines:
            out.append(f'## {title}\n' + '\n'.join(lines))

    # 김민정(생활 기록)
    mj = load('minjung/minjung.json', {})
    on = lambda arr: sorted([x for x in (arr or []) if isinstance(x, dict) and x.get('date') == day and ok_time(x.get('time'))],
                            key=lambda x: x.get('time') or '')
    add('혼잣말', [f"- {x.get('time','')} {clip(x.get('text'), 300)}" for x in on(mj.get('lines'))])
    add('일기', [f"- {x.get('time','')} {('['+x['title']+'] ') if x.get('title') else ''}{clip(x.get('body'), 1500)}" for x in on(mj.get('diary'))])
    slot_ko = {'breakfast': '아침', 'lunch': '점심', 'dinner': '저녁', 'snack': '간식'}
    type_ko = {'meal': '식사', 'mood': '기분', 'symptom': '증상', 'medicine': '약'}

    def cond(x):
        t = x.get('type')
        head = slot_ko.get(x.get('slot')) if t == 'meal' else type_ko.get(t, t or '')
        extra = [x.get('mood'), ', '.join(x.get('tags') or []), x.get('name'), clip(x.get('memo'), 200)]
        return f"- {x.get('time','')} {head}: " + ' / '.join(e for e in extra if e)
    add('컨디션·식사', [cond(x) for x in on(mj.get('condition'))])
    add('기력(HP, 1~5)', [f"- {x.get('time','')} {x.get('v')}" for x in on(mj.get('hp'))])
    add('스킨케어', [f"- {x.get('time','')} {', '.join(x.get('steps') or [])}" for x in on(mj.get('beauty'))])
    add('옷', [f"- {clip(json.dumps({k: v for k, v in x.items() if k not in ('id','at','date')}, ensure_ascii=False), 200)}" for x in on(mj.get('outfit'))])
    qlog = (mj.get('quest_log') or {}).get(day) or {}
    qname = {q.get('id'): q.get('title') for q in mj.get('quests') or []}
    if isinstance(qlog, dict):
        add('오늘의 퀘스트', [f"- {qname.get(k, k)}: {'완료' if v else '미완'}" for k, v in qlog.items()])

    # 할 일
    todos = load('data/todos.json', [])
    tl = []
    for t in todos if isinstance(todos, list) else []:
        if t.get('target_date') == day or t.get('completed_date') == day:
            subs = [s.get('content') for s in t.get('subtasks') or [] if s.get('is_completed')]
            tl.append(f"- [{'x' if t.get('is_completed') else ' '}] {t.get('content')}" + (f" (한 것: {', '.join(subs)})" if subs else ''))
    add('할 일', tl)

    # 캘린더 (+ ATracker 활동 기록)
    cal = load('diary/calendar.json', {})
    ev = [e for e in cal.get('events') or [] if e.get('date') <= day <= (e.get('endDate') or e.get('date')) and ok_time(e.get('start'))]
    ev.sort(key=lambda e: e.get('start') or '')
    add('일정·활동', [f"- {(e.get('start','')+'~'+e.get('end','')) if e.get('start') else '종일'} [{e.get('cal')}] {e.get('title')}"
                     + (f" ({clip(e['note'], 80)})" if e.get('note') and 'Hash ID' not in e['note'] else '') for e in ev])

    # 다이어리
    dy = load('diary/diary.json', {})
    d = (dy.get('days') or {}).get(day) or {}
    dl = []
    for k, v in d.items():
        if k in ('photo', 'thumb', 'sticker'):
            continue
        if k == 'photo' or (isinstance(v, str) and v.startswith('diary/')):
            continue
        dl.append(f'- {k}: {clip(strip_html(v) if isinstance(v, str) else json.dumps(v, ensure_ascii=False), 800)}')
    if d.get('photo'):
        dl.append('- (사진 한 장을 붙였음)')
    mood = (dy.get('mood') or {}).get(day[:7])
    if mood:
        dl.append(f'- 이번 달 한 줄: {mood}')
    for dd in dy.get('ddays') or []:
        try:
            left = (datetime.strptime(dd['date'], '%Y-%m-%d').date() - datetime.strptime(day, '%Y-%m-%d').date()).days
        except (KeyError, ValueError):
            continue
        if 0 <= left <= 14:
            dl.append(f"- D-{left if left else 'DAY'}: {dd.get('title')} ({dd['date']})")
    add('다이어리', dl)

    # 메모
    memos = load('diary/memos.json', {})
    add('메모', [f"- {x.get('time','')} {('['+x['title']+'] ') if x.get('title') else ''}{clip(strip_html(x.get('html')), 600)}"
               for x in memos.get('items') or [] if x.get('date') == day and ok_time(x.get('time'))])

    # 마이홈 (집안일)
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
def gemini(models, system, prompt, max_tokens=4096, temperature=0.9):
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not key:
        sys.exit('GEMINI_API_KEY가 없어요. 저장소 Settings → Secrets and variables → Actions에 넣어 주세요.')
    body = {
        'systemInstruction': {'parts': [{'text': system}]},
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {'temperature': temperature, 'maxOutputTokens': max_tokens},
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
                errors.append(f'{model}: 빈 응답 ({cand.get("finishReason")})')
                break
            except urllib.error.HTTPError as e:
                msg = e.read().decode(errors='replace')[:300]
                errors.append(f'{model}: HTTP {e.code} {msg}')
                if e.code in (429, 500, 503) and attempt == 0:
                    time.sleep(20)
                    continue
                break
            except Exception as e:  # 네트워크 등
                errors.append(f'{model}: {e}')
                break
    sys.exit('AI 호출 실패\n' + '\n'.join(errors))


def system_prompt(cfg):
    c = cfg['character']
    return (f"너는 '{c['name']}'(이)야. {c['persona']}\n"
            f"편지를 받는 사람: {cfg['recipient']}.\n"
            f"문체: {c['style']}\n"
            "규칙:\n"
            "- 주어진 기록에 있는 일만 사실로 말해. 기록에 없는 사건·사람·감정을 지어내지 마.\n"
            "- 기록을 나열하거나 요약 보고하지 말고, 그중 마음이 가는 몇 가지를 골라 대화하듯 이야기해.\n"
            "- 기록이 거의 없는 날엔 캐묻지 말고 가볍게 안부를 건네.\n"
            "- 건강·식사·잠 이야기는 걱정하는 친구의 말투로 짧게. 의학적 조언은 하지 마.\n"
            "- 마크다운 문법(#, **, - 목록)은 쓰지 마. 평범한 문단으로만.")


def recent_letters(store, before, n=3):
    keys = sorted(k for k in store['letters'] if k < before)[-n:]
    return '\n\n'.join(f"[{k}]\n{clip(store['letters'][k]['body'], 600)}" for k in keys)


def date_label(day):
    d = datetime.strptime(day, '%Y-%m-%d')
    return f'{d.year}년 {d.month}월 {d.day}일 {WEEK[d.weekday()]}요일'


# ---------------------------------------------------------------- 편지
def make_letter(store, cfg, day, force):
    if day in store['letters'] and not force:
        print(f'{day} 편지는 이미 있어요. (다시 쓰려면 force)')
        return False
    record = gather(day) or '(오늘은 남긴 기록이 거의 없음)'
    mem = store.get('memory', {}).get('summary') or '(아직 없음)'
    msgs = store['messages'].get(day) or {}
    sent = '\n'.join(f"- {SLOTS[s]}: {msgs[s]['text']}" for s in SLOTS if s in msgs)
    prompt = (f"오늘은 {date_label(day)}. 자기 전에 {cfg['recipient']}에게 보낼 오늘의 편지를 써 줘.\n\n"
              f"# {cfg['recipient']}에 대해 기억하는 것\n{mem}\n\n"
              f"# 최근에 보낸 편지 (같은 말 되풀이하지 않기)\n{recent_letters(store, day) or '(없음)'}\n\n"
              f"# 오늘 낮에 내가 보낸 짧은 메시지\n{sent or '(없음)'}\n\n"
              f"# 오늘의 기록\n{record}\n\n"
              f"# 쓰는 법\n- 길이 {cfg.get('letter_length', '700~1200자')}.\n"
              f"- 첫 줄은 '{cfg['recipient']}에게' 같은 호칭으로 시작.\n"
              "- 마지막은 잘 자라는 인사로 끝내고, 서명은 쓰지 마(화면에서 따로 붙임).\n"
              "- 편지 본문만 출력해.")
    body, model = gemini(cfg['models']['letter'], system_prompt(cfg), prompt, max_tokens=8192)
    old = store['letters'].get(day) or {}
    store['letters'][day] = {
        'date': day, 'body': body, 'at': now().isoformat(timespec='seconds'), 'model': model,
        'replies': [] if force else old.get('replies', []),
    }
    update_memory(store, cfg)
    return True


def update_memory(store, cfg):
    """확정 편지가 memory_every 통 쌓일 때마다 기억 요약을 새로 함"""
    every = int(cfg.get('memory_every') or 7)
    upto = store['memory'].get('upto') or ''
    new = sorted(k for k in store['letters'] if k > upto)
    if len(new) < every:
        return
    chunk = '\n\n'.join(f"[{k}]\n{store['letters'][k]['body']}" +
                        ''.join(f"\n  ({'나' if r['from']=='me' else '답글'}) {r['text']}" for r in store['letters'][k].get('replies', []))
                        for k in new)
    prompt = (f"아래는 기존 기억과 최근 {len(new)}통의 편지·답장이야. {cfg['recipient']}에 대해 앞으로 편지를 쓸 때 참고할 기억을 "
              "800자 안쪽으로 다시 정리해 줘. 반복되는 일상, 좋아하는 것, 고민, 진행 중인 일(시험·전시 등 날짜 포함), 관계를 짧은 문장 목록으로. "
              "편지에 쓰인 추측이 아니라 사실로 드러난 것만.\n\n"
              f"# 기존 기억\n{store['memory'].get('summary') or '(없음)'}\n\n# 최근 편지\n{chunk}")
    try:
        summary, _ = gemini(cfg['models']['light'], '너는 기록을 간결하게 정리하는 비서야.', prompt, temperature=0.3)
    except SystemExit as e:
        print(f'[기억 정리 건너뜀] {e}', file=sys.stderr)
        return
    store['memory'] = {'summary': summary, 'upto': new[-1], 'at': now().isoformat(timespec='seconds')}


# ---------------------------------------------------------------- 시간대별 메시지
def make_message(store, cfg, slot):
    t = now()
    day = t.strftime('%Y-%m-%d')
    if not slot:
        h = t.hour
        slot = 'morning' if 5 <= h < 11 else 'lunch' if 11 <= h < 16 else 'evening'
    if slot in (store['messages'].get(day) or {}):
        print(f'{day} {SLOTS[slot]} 메시지는 이미 있어요.')
        return False
    yesterday = (t - timedelta(days=1)).strftime('%Y-%m-%d')
    focus = {
        'morning': '아침 인사. 오늘 일정·할 일·디데이를 보고 가볍게 응원해. 어젯밤 편지 이야기를 살짝 이어도 좋아.',
        'lunch': '점심 무렵 안부. 지금까지 남긴 기록(식사·혼잣말·기분)을 보고 한마디. 밥 챙겨 먹었는지 같은 거.',
        'evening': '저녁 안부. 오늘 하루 수고했다는 마음으로, 남은 저녁을 편하게 보내라고. 편지는 밤에 따로 가니 길게 쓰지 마.',
    }[slot]
    prompt = (f"지금은 {date_label(day)} {t.strftime('%H:%M')}. {cfg['recipient']}에게 보낼 {SLOTS[slot]} 메시지를 써 줘.\n"
              f"{focus}\n\n# 기억\n{store['memory'].get('summary') or '(없음)'}\n\n"
              f"# 어젯밤 편지\n{clip((store['letters'].get(yesterday) or {}).get('body'), 500) or '(없음)'}\n\n"
              f"# 오늘 지금까지의 기록\n{gather(day, upto=t.strftime('%H:%M')) or '(아직 없음)'}\n\n"
              "# 쓰는 법\n- 메신저 메시지처럼 1~3문장, 120자 안쪽. 호칭·서명 없이 본문만.")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=1024)
    store['messages'].setdefault(day, {})[slot] = {'text': text, 'at': t.isoformat(timespec='seconds'), 'model': model}
    # 오래된 메시지는 60일만 보관
    for k in [k for k in store['messages'] if k < (t - timedelta(days=60)).strftime('%Y-%m-%d')]:
        del store['messages'][k]
    return True


# ---------------------------------------------------------------- 답장
def make_reply(store, cfg, day):
    lt = store['letters'].get(day)
    if not lt:
        sys.exit(f'{day} 편지가 없어요.')
    replies = lt.setdefault('replies', [])
    if not replies or replies[-1]['from'] != 'me':
        print('답할 내 답장이 없어요.')
        return False
    if sum(1 for r in replies if r['from'] == 'ai') >= int(cfg.get('max_ai_replies_per_letter') or 5):
        print('이 편지에는 답글을 더 달지 않아요.')
        return False
    thread = '\n'.join(f"{cfg['recipient'] if r['from']=='me' else cfg['character']['name']}: {r['text']}" for r in replies)
    prompt = (f"{date_label(day)}에 네가 보낸 편지와, 거기에 이어진 대화야. {cfg['recipient']}의 마지막 답장에 답글을 써 줘.\n\n"
              f"# 네 편지\n{lt['body']}\n\n# 대화\n{thread}\n\n"
              f"# 그날의 기록(참고)\n{clip(gather(day), 3000) or '(없음)'}\n\n"
              "# 쓰는 법\n- 2~6문장, 400자 안쪽. 답장 내용에 직접 반응해. 호칭·서명 없이 본문만.")
    text, model = gemini(cfg['models']['light'], system_prompt(cfg), prompt, max_tokens=2048)
    replies.append({'from': 'ai', 'text': text, 'at': now().isoformat(timespec='seconds'), 'model': model})
    return True


# ----------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['letter', 'message', 'reply', 'preview'])
    ap.add_argument('--date')
    ap.add_argument('--slot', choices=list(SLOTS) + [''], default='')
    ap.add_argument('--force', action='store_true')
    a = ap.parse_args()

    cfg = load(CONFIG, None)
    if not cfg:
        sys.exit('letters/config.json을 읽지 못했어요.')
    store = load(STORE, {})
    for k, v in (('letters', {}), ('messages', {}), ('memory', {'summary': '', 'upto': ''})):
        store.setdefault(k, v)

    if a.mode == 'preview':  # API 없이 모은 기록만 보기
        print(gather(a.date or letter_day()))
        return
    if a.mode == 'letter':
        changed = make_letter(store, cfg, a.date or letter_day(), a.force)
    elif a.mode == 'message':
        changed = make_message(store, cfg, a.slot)
    else:
        changed = make_reply(store, cfg, a.date or letter_day())
    if changed:
        save_store(store)
        print('저장했어요.')


if __name__ == '__main__':
    main()
