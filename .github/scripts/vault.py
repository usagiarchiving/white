"""저장소 암호화 (사이트의 vault-core.js 와 같은 방식)

- 키: GitHub Secret VAULT_KEY (= 사이트에서 잠금 설정할 때 보여 준 복구 키)
- 잠긴 파일 모양
    글(JSON): "WENC1." + base64(iv 12바이트 + AES-256-GCM 암호문)
    그 밖(사진): b"WENC\\x01" + iv 12바이트 + 암호문
- vault.json 이 있으면(잠금 켜짐) 키 없이는 읽지도 쓰지도 않음 → 실수로 평문을 덮어쓰는 일 없음

  python vault.py check                 # VAULT_KEY 가 vault.json 과 맞는지
  python vault.py encrypt-all           # 아직 안 잠긴 파일을 모두 잠금 (저장소 루트에서)
  python vault.py assert-sealed 경로…   # 잠금이 켜져 있는데 평문이면 실패 (자동 작업이 올리기 전에)
"""
import base64
import json
import os
import subprocess
import sys

MAGIC = b'WENC\x01'
TXT = b'WENC1.'
CHECK = 'white-vault-ok'
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PRIVATE = ('data/', 'minjung/', 'diary/', 'myhome/', 'capture/')


class VaultError(Exception):
    pass


def rel(p):
    a = os.path.abspath(p if os.path.isabs(p) else os.path.join(ROOT, p))
    r = os.path.relpath(a, ROOT).replace(os.sep, '/')
    return None if r.startswith('../') else r


def is_private(p):
    """잠그는 파일인지 (vault-core.js isPrivatePath 와 같은 규칙)"""
    r = rel(p)
    if not r or not r.startswith(PRIVATE):
        return False
    if r.startswith('data/images/appicons/') or '/assets/' in r or r == 'diary/ohaasa.json' or r.lower().endswith('.md'):
        return False
    return True


def enabled():
    return os.path.exists(os.path.join(ROOT, 'vault.json'))


_aes = None


def _key():
    global _aes
    if _aes is not None:
        return _aes
    v = ''.join((os.environ.get('VAULT_KEY') or '').split())
    if not v:
        return None
    try:
        raw = base64.urlsafe_b64decode(v.replace('+', '-').replace('/', '_') + '=' * (-len(v) % 4))
    except Exception:
        raise VaultError('VAULT_KEY 모양이 이상해요 (복구 키를 그대로 넣어 주세요)')
    if len(raw) != 32:
        raise VaultError('VAULT_KEY 길이가 맞지 않아요 (복구 키를 그대로 넣어 주세요)')
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    _aes = AESGCM(raw)
    return _aes


def need_key():
    k = _key()
    if not k:
        raise VaultError('잠긴 파일인데 VAULT_KEY Secret이 없어요')
    return k


def is_sealed(b):
    return b.startswith(MAGIC) or b.startswith(TXT)


def open_bytes(b):
    """잠긴 바이트면 풀고, 아니면 그대로"""
    if b.startswith(MAGIC):
        d = b[len(MAGIC):]
    elif b.startswith(TXT):
        d = base64.b64decode(b[len(TXT):].strip())
    else:
        return b
    try:
        return need_key().decrypt(d[:12], d[12:], None)
    except VaultError:
        raise
    except Exception:
        raise VaultError('풀지 못했어요 (VAULT_KEY가 복구 키와 다른가요?)')


def _seal(plain):
    iv = os.urandom(12)
    return iv + need_key().encrypt(iv, plain, None)


def seal_text(plain_bytes):
    return TXT + base64.b64encode(_seal(plain_bytes)) + b'\n'


def seal_bin(plain_bytes):
    return MAGIC + _seal(plain_bytes)


def should_seal(p):
    """이 경로에 쓸 때 잠가야 하나. 잠금이 켜져 있는데 키가 없으면 오류 (평문으로 덮어쓰지 않게)"""
    if not is_private(p):
        return False
    if _key():
        return True
    if enabled():
        raise VaultError(f'잠금이 켜져 있는데 VAULT_KEY Secret이 없어서 {rel(p)} 을(를) 저장하지 않았어요')
    return False


def read_bytes(p):
    with open(p, 'rb') as f:
        return open_bytes(f.read())


def read_json(p):
    return json.loads(read_bytes(p).decode('utf-8'))


def write_text(p, text):
    data = text.encode('utf-8')
    if should_seal(p):
        data = seal_text(data)
    with open(p, 'wb') as f:
        f.write(data)


def write_json(p, obj):
    write_text(p, json.dumps(obj, ensure_ascii=False, indent=1) + '\n')


# ---------------------------------------------------------------- 명령
def cmd_check():
    if not enabled():
        sys.exit('vault.json 이 없어요 (사이트에서 잠금 설정을 먼저)')
    with open(os.path.join(ROOT, 'vault.json'), encoding='utf-8') as f:
        cfg = json.load(f)
    try:
        ok = open_bytes(cfg['check'].encode()).decode() == CHECK
    except VaultError as e:
        sys.exit(str(e))
    if not ok:
        sys.exit('VAULT_KEY 가 vault.json 과 맞지 않아요')
    print('VAULT_KEY 확인 완료')


def tracked():
    out = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, capture_output=True, check=True).stdout
    return [x for x in out.decode().split('\0') if x]


def cmd_encrypt_all():
    need_key()
    n = 0
    for r in tracked():
        if not is_private(r):
            continue
        p = os.path.join(ROOT, r)
        if not os.path.isfile(p):
            continue
        with open(p, 'rb') as f:
            b = f.read()
        if is_sealed(b):
            continue
        out = seal_text(b) if r.lower().endswith('.json') else seal_bin(b)
        with open(p, 'wb') as f:
            f.write(out)
        n += 1
    print(f'잠근 파일 {n}개')


def cmd_assert_sealed(paths):
    if not enabled():
        return
    bad = []
    for p in paths:
        if is_private(p) and os.path.isfile(p):
            with open(p, 'rb') as f:
                if not is_sealed(f.read(8)):
                    bad.append(rel(p))
    if bad:
        sys.exit('잠기지 않은 파일이 있어서 올리지 않아요: ' + ', '.join(bad))


def cmd_verify_all():
    """잠금 대상인데 평문인 파일이 하나라도 있으면 실패"""
    bad = []
    for r in tracked():
        p = os.path.join(ROOT, r)
        if is_private(r) and os.path.isfile(p):
            with open(p, 'rb') as f:
                if not is_sealed(f.read(8)):
                    bad.append(r)
    if bad:
        sys.exit('평문 파일: ' + ', '.join(bad))
    print('모두 잠겨 있어요')


if __name__ == '__main__':
    a = sys.argv[1:]
    try:
        if a[:1] == ['check']:
            cmd_check()
        elif a[:1] == ['encrypt-all']:
            cmd_encrypt_all()
        elif a[:1] == ['assert-sealed']:
            cmd_assert_sealed(a[1:])
        elif a[:1] == ['verify-all']:
            cmd_verify_all()
        else:
            sys.exit(__doc__)
    except VaultError as e:
        sys.exit(str(e))
