#!/usr/bin/env python3
"""T-016 (06 §6): API pino loglaridan (stdin) 5xx ulushi va p95 javob vaqti.

`incoming request` (url) va `request completed` (status, vaqt) requestId bo'yicha bog'lanadi;
/api/health/* so'rovlari hisobga olinmaydi. Chiqish: "<jami> <5xx> <p95_ms>".
"""
import json
import math
import sys

urls, done = {}, []
for line in sys.stdin:
    try:
        r = json.loads(line)
    except ValueError:
        continue
    rid = r.get('requestId')
    if r.get('msg') == 'incoming request':
        urls[rid] = (r.get('req') or {}).get('url', '')
    elif r.get('msg') == 'request completed':
        done.append((rid, (r.get('res') or {}).get('statusCode', 0), r.get('responseTime', 0.0)))

rows = [(s, t) for rid, s, t in done if not urls.get(rid, '').startswith('/api/health')]
errors = sum(1 for s, _ in rows if s >= 500)
times = sorted(t for _, t in rows)
p95 = times[math.ceil(len(times) * 0.95) - 1] if times else 0.0
print(len(rows), errors, int(p95))
