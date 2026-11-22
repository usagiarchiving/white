# 아이폰 캘린더(iCloud 공개 캘린더 링크 · ATracker를 넣은 캘린더 등)를 받아서 diary/calendar.json 으로
# 링크는 저장소 Settings → Secrets → Actions 의 CALENDAR_ICS 에 한 줄에 하나씩:  이름|https://… (webcal:// 도 됨)
import json, os, sys, hashlib, datetime, urllib.request
from zoneinfo import ZoneInfo

import icalendar
import recurring_ical_events

TZ = ZoneInfo('Asia/Seoul')
OUT = sys.argv[1] if len(sys.argv) > 1 else 'diary/calendar.json'
BACK, AHEAD = 60, 120          # 오늘 기준 앞뒤 며칠치


def sources():
    raw = os.environ.get('CALENDAR_ICS', '').strip()
    for i, line in enumerate(l.strip() for l in raw.splitlines()):
        if not line or line.startswith('#'):
            continue
        name, url = (line.split('|', 1) if '|' in line else ('캘린더 %d' % (i + 1), line))
        url = url.strip()
        if url.startswith('webcal://'):
            url = 'https://' + url[len('webcal://'):]
        yield name.strip(), url


def fetch(url):
    if url.startswith('file://') or os.path.exists(url):
        return open(url.replace('file://', ''), 'rb').read()
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (calendar sync)'})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


def as_dt(v):
    """date → (날짜, None) / datetime → 한국 시간 datetime"""
    if isinstance(v, datetime.datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=TZ)
        return v.astimezone(TZ)
    return v


def main():
    srcs = list(sources())
    if not srcs:
        print('CALENDAR_ICS 가 비어 있어요 — 할 일 없음')
        return
    today = datetime.datetime.now(TZ).date()
    start, end = today - datetime.timedelta(days=BACK), today + datetime.timedelta(days=AHEAD)
    events, cals, failed, colors = [], [], [], {}
    for name, url in srcs:
        try:
            cal = icalendar.Calendar.from_ical(fetch(url))
        except Exception as e:                 # 한 캘린더가 안 돼도 나머지는 계속
            print('실패:', name, e)
            failed.append(name)
            continue
        cals.append(name)
        # 아이폰에서 정한 캘린더 색 (예: #FF2968FF) → #RRGGBB
        col = str(cal.get('X-APPLE-CALENDAR-COLOR') or '').strip()
        if len(col) >= 7 and col.startswith('#'):
            colors[name] = col[:7].upper()
        for ev in recurring_ical_events.of(cal).between(start, end + datetime.timedelta(days=1)):
            s, e = as_dt(ev.get('DTSTART').dt), ev.get('DTEND')
            e = as_dt(e.dt) if e else None
            title = str(ev.get('SUMMARY') or '').strip()
            row = {'cal': name, 'title': title}
            if isinstance(s, datetime.datetime):
                e = e if isinstance(e, datetime.datetime) else s + datetime.timedelta(hours=1)
                row.update(date=s.strftime('%Y-%m-%d'), start=s.strftime('%H:%M'), endDate=e.strftime('%Y-%m-%d'), end=e.strftime('%H:%M'))
            else:
                last = (e - datetime.timedelta(days=1)) if e else s     # 종일 일정: 끝 날짜는 다음날로 적혀 있음
                row.update(date=s.isoformat(), endDate=last.isoformat(), allDay=True)
            for k, f in (('loc', 'LOCATION'), ('note', 'DESCRIPTION'), ('url', 'URL')):
                v = str(ev.get(f) or '').strip()
                if v:
                    row[k] = v[:2000]
            uid = str(ev.get('UID') or '') + row['date'] + row.get('start', '')
            row['id'] = 'c' + hashlib.sha1((name + uid).encode()).hexdigest()[:12]
            events.append(row)
    events.sort(key=lambda x: (x['date'], x.get('start', ''), x['title']))
    if failed and not cals:
        sys.exit('모든 캘린더를 받지 못했어요')
    # 바뀐 게 없으면 파일을 그대로 둬서 쓸데없는 커밋을 안 만듦
    old = None
    if os.path.exists(OUT):
        try:
            old = json.load(open(OUT))
        except Exception:
            pass
    if old and old.get('events') == events and old.get('calendars') == cals and old.get('colors', {}) == colors:
        print('변경 없음')
        return
    os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True)
    json.dump({'updated_at': datetime.datetime.now(TZ).isoformat(timespec='seconds'), 'calendars': cals, 'colors': colors, 'events': events},
              open(OUT, 'w'), ensure_ascii=False, indent=1)
    open(OUT, 'a').write('\n')
    print('일정', len(events), '개 ·', ', '.join(cals))


if __name__ == '__main__':
    main()
