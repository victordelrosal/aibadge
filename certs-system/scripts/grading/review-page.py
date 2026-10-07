# review-page.py: NO AI. Renders the manual cert review page (one ranked card per learner).
# Usage: python3 review-page.py <batch> <out.html>
# Needs <batch>/review-data.json (review-gather.mjs) and <batch>/review.json (Claudus's hand review,
# keyed by profile name: score, rec approve|hold|resubmit, headline, why, items, feedback).
# Write the page under aibadge/reports/ (gitignored): it names learners.
import json, html, sys, re, os
B = sys.argv[1].rstrip('/'); OUT = sys.argv[2]
data = {o['name']: o for o in json.load(open(B + '/review-data.json'))}
rev = json.load(open(B + '/review.json'))
BATCH = os.path.basename(B)
TITLES = {"ai-foundations":"AI Foundations 101","ai-interviews-you":"AI Interviews You","five-innovators":"The Five Innovators","thinking-partner":"Thinking Partner","eu-ai-act":"The EU AI Act","ai-on-terminal":"AI on Terminal (L2)","your-ai-team":"Your AI Team (L2)","your-first-skill":"Your First Skill (L2)","your-ai-workspace":"Your AI Workspace (L2)"}
E = html.escape
def d(s): return (s or '')[:16].replace('T', ' ') + (' UTC' if s else '')
REC = {"approve": ("Approve", "ok"), "hold": ("Hold: admin step", "warn"), "resubmit": ("Resubmit", "bad")}
def strip_chrome(t):
    t = re.sub(r'^.*?(Show hidden characters|Report conversation|Report\n)', '', t, count=1, flags=re.S) if len(t) > 1500 else t
    return t
cards = []
order = sorted(rev, key=lambda n: -rev[n]['score'])
for rank, n in enumerate(order, 1):
    o, r = data[n], rev[n]
    m, dec = o['meta'], o['decision']
    dmap = {e['exerciseId']: e for e in dec.get('exercises', [])}
    rows = []
    for e in sorted(m['exercises'], key=lambda e: e['exerciseId']):
        x = dmap.get(e['exerciseId'], {})
        g = f"{x.get('verdict','?')}" + (f" {x.get('confidence')}" if x.get('confidence') else '')
        mine = r['items'].get(e['exerciseId'])
        mv = mine[0] if mine else ('pass' if x.get('verdict') == 'PASS' else 'repeat')
        note = mine[1] if mine else ''
        reasons = '; '.join(x.get('reasons') or [])
        txt = strip_chrome(o['texts'].get(e['exerciseId'], ''))
        rows.append(f"""<details class="item"><summary><span class="pill {mv}">{E(mv.upper())}</span><b>{E(TITLES.get(e['exerciseId'], e['exerciseId']))}</b><span class="muted">grader: {E(g)} · submitted {E(d(e.get('submittedAt')))}</span></summary>
<div class="ib">{f'<p class="mine">My read: {E(note)}</p>' if note else ''}
<p><a href="{E(e.get('url') or '')}" target="_blank" rel="noopener">{E(e.get('url') or '(no url)')}</a></p>
{f'<p class="muted">Guardrail: {E(reasons)}</p>' if reasons else ''}
{f'<p><span class="lab">Grader feedback</span> {E(x.get("feedback",""))}</p>' if x.get('feedback') else ''}
{f'<p><span class="lab">Quote</span> <q>{E(x.get("quote",""))}</q></p>' if x.get('quote') else ''}
<details class="frozen"><summary>Frozen text the grader read ({len(o['texts'].get(e['exerciseId'],''))} chars)</summary><pre>{E(txt[:8000])}{'…' if len(txt) > 8000 else ''}</pre></details></div></details>""")
    hist = []
    for l in o['log']:
        hist.append(f"<li><b>{E(d(l['resolvedAt']))}</b> feedback posted to learner ({E(l['outcome'])}, by {E(l.get('approvedBy',''))}): " + ', '.join(f"{E(TITLES.get(x['exerciseId'],x['exerciseId']))} <span class='pill {x['verdict'].lower()}'>{x['verdict']}</span>" for x in l['exercises']) + "<ul>" + ''.join(f"<li class='muted'>{E(TITLES.get(x['exerciseId'],x['exerciseId']))}: {E(x.get('feedback',''))}</li>" for x in l['exercises'] if x['verdict'] != 'PASS') + "</ul></li>")
    seen = None
    for p in o['prior']:
        sig = json.dumps([(x['exerciseId'], x['verdict'], x.get('sha')) for x in p['exercises']])
        if sig == seen: continue
        seen = sig
        hist.append(f"<li><b>{E(p['batch'][6:16]+' '+p['batch'][17:22].replace('-',':')+' UTC')}</b> grading run ({E(p['recommend'])}, not necessarily shown to learner): " + ', '.join(f"{E(TITLES.get(x['exerciseId'],x['exerciseId']))} <span class='pill {('pass' if x['verdict']=='PASS' else 'repeat')}'>{E(x['verdict'])}</span>" for x in p['exercises']) + "</li>")
    cr = o['certreq']
    hist.insert(0, f"<li><b>{E(d(cr.get('requestedAt')))}</b> certificate requested" + (f"; re-review requested {E(d(cr.get('rereviewAt')))} after resubmitting" if cr.get('rereviewAt') else '') + "</li>")
    resub = bool(o['log'])
    label, cls = REC[r['rec']]
    stars = ''.join('<i class="on"></i>' if i < r['score'] else '<i></i>' for i in range(10))
    proven = 'yes (typed code)' if m.get('emailProven') else 'NO'
    cards.append(f"""<article class="card" data-uid="{E(o['uid'])}" data-name="{E(n)}" data-email="{E(m['email'])}" data-rec="{r['rec']}">
<header><div class="rank">#{rank}</div><div class="who"><h2>{E(n)}</h2><div class="muted">{E(m['email'])} · requested {E(d(cr.get('requestedAt')))}{' · <b class="resub">resubmitted</b>' if resub else ''}</div></div>
<div class="score"><div class="num">{r['score']}<span>/10</span></div><div class="bar">{stars}</div></div></header>
<div class="rec {cls}">Claudus recommends: <b>{E(label)}</b></div>
<p class="head">{E(r['headline'])}</p><p>{E(r['why'])}</p>
<div class="facts"><span>L1 lessons: {sum(1 for x in ["what-is-html","hello-world-2","ai-foundations","retro-game","deploy-github","ai-interviews-you","five-innovators","thinking-partner","eu-ai-act"] if x in o['done'])}/9</span><span>Email proven: {proven}</span><span>Name on cert: {E(o['name'])}</span><span>Submissions: {len(m['exercises'])}</span></div>
<h3>Submissions</h3>{''.join(rows) or '<p class="muted">None.</p>'}
<details class="hist"{' open' if resub else ''}><summary><h3>History</h3></summary><ul>{''.join(hist)}</ul></details>
<h3>Proposed feedback to learner</h3><textarea class="fb" rows="4" placeholder="(none: certificate issues)">{E(r['feedback'])}</textarea>
<div class="act"><button data-v="approve">Approve + issue</button><button data-v="resubmit">Send feedback (resubmit)</button><button data-v="hold">Hold</button><span class="chosen"></span></div>
</article>""")

page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cert Review Queue</title><style>
:root{{--bg:#f7f8fa;--panel:#fff;--ink:#0b1220;--ink2:#2a3142;--ink3:#5a6273;--line:rgba(15,23,42,.10);--acc:#1d4d8c;--gold:#a88742;--ok:#0e9461;--okS:rgba(14,148,97,.12);--warn:#b26a00;--warnS:rgba(178,106,0,.12);--bad:#b42318;--badS:rgba(180,35,24,.10)}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0b1020;--panel:#121a2e;--ink:#e8ecf4;--ink2:#c3cad8;--ink3:#8a93a6;--line:rgba(255,255,255,.10);--acc:#7fa8e0;--okS:rgba(14,148,97,.22);--warnS:rgba(178,106,0,.22);--badS:rgba(180,35,24,.22)}}}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif}}
main{{max-width:900px;margin:0 auto;padding:24px 16px 140px}}h1{{font-size:28px;margin:0 0 4px;letter-spacing:-.02em}}.eyebrow{{color:var(--gold);letter-spacing:.18em;font-size:12px;text-transform:uppercase}}
.muted{{color:var(--ink3);font-size:13px}}.card{{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:20px;margin:20px 0;box-shadow:0 6px 24px rgba(15,23,42,.06)}}
.card header{{display:flex;gap:14px;align-items:center}}.rank{{font-weight:700;color:var(--acc);font-size:20px;min-width:36px}}.who{{flex:1;min-width:0}}h2{{margin:0;font-size:20px}}h3{{font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);margin:18px 0 8px;display:inline}}
.score{{text-align:right}}.num{{font-size:28px;font-weight:700}}.num span{{font-size:14px;color:var(--ink3)}}.bar{{display:flex;gap:2px;justify-content:flex-end}}.bar i{{width:8px;height:8px;border-radius:2px;background:var(--line)}}.bar i.on{{background:var(--acc)}}
.rec{{margin:14px 0 6px;padding:8px 12px;border-radius:10px;font-size:14px}}.rec.ok{{background:var(--okS);color:var(--ok)}}.rec.warn{{background:var(--warnS);color:var(--warn)}}.rec.bad{{background:var(--badS);color:var(--bad)}}
.head{{font-weight:600;margin:10px 0 4px}}.facts{{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}}.facts span{{border:1px solid var(--line);border-radius:999px;padding:2px 10px;font-size:12px;color:var(--ink2)}}
.item{{border-top:1px solid var(--line);padding:8px 0}}.item>summary{{cursor:pointer;display:flex;flex-wrap:wrap;gap:8px;align-items:center}}.ib{{padding:6px 0 4px 4px}}.ib p{{margin:6px 0}}.ib a{{color:var(--acc);word-break:break-all}}
.pill{{font-size:11px;font-weight:700;padding:1px 8px;border-radius:999px}}.pill.pass{{background:var(--okS);color:var(--ok)}}.pill.repeat,.pill.escalate{{background:var(--badS);color:var(--bad)}}.pill.fix{{background:var(--warnS);color:var(--warn)}}
.mine{{background:var(--okS);padding:6px 10px;border-radius:8px}}.lab{{font-size:11px;text-transform:uppercase;color:var(--ink3);margin-right:6px}}
.frozen pre{{white-space:pre-wrap;max-height:340px;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px;font-size:12px}}.frozen summary,.hist summary{{cursor:pointer;color:var(--acc);font-size:13px}}
.hist{{margin-top:12px}}.hist ul{{padding-left:18px;font-size:14px}}.resub{{color:var(--gold)}}
textarea{{width:100%;font:inherit;font-size:14px;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--bg);color:var(--ink);margin-top:8px}}
.act{{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;align-items:center}}button{{font:inherit;font-size:14px;border:1px solid var(--line);background:var(--panel);color:var(--ink);border-radius:999px;padding:8px 14px;cursor:pointer}}
button.sel[data-v=approve]{{background:var(--ok);color:#fff;border-color:var(--ok)}}button.sel[data-v=resubmit]{{background:var(--bad);color:#fff;border-color:var(--bad)}}button.sel[data-v=hold]{{background:var(--warn);color:#fff;border-color:var(--warn)}}
#dock{{position:fixed;left:0;right:0;bottom:0;background:var(--panel);border-top:1px solid var(--line);padding:12px 16px;display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap}}#dock button{{background:var(--acc);color:#fff;border-color:var(--acc)}}
</style></head><body><main>
<div class="eyebrow">AI Badge · Level 1</div><h1>Cert review queue</h1>
<p class="muted">{len(cards)} pending requests, ranked by strength. Batch {E(BATCH)} (dry run: nothing issued, posted or emailed). Every guardrail hold was read by hand. Score /10 = my judgement of the whole file: depth, personalisation, completeness. Pick a decision per card, edit the feedback if you want, then copy the decisions into the terminal.</p>
{''.join(cards)}
</main><div id="dock"><span id="count" class="muted"></span><button id="copy">Copy decisions for Claudus</button></div>
<script>
const K='certreview-{BATCH}';let st={{}};try{{st=JSON.parse(localStorage.getItem(K)||'{{}}')}}catch(e){{}}
const save=()=>{{try{{localStorage.setItem(K,JSON.stringify(st))}}catch(e){{}}}};
const cards=[...document.querySelectorAll('.card')];
function paint(){{let n=0;cards.forEach(c=>{{const s=st[c.dataset.uid]||{{}};c.querySelectorAll('.act button').forEach(b=>b.classList.toggle('sel',b.dataset.v===s.v));if(s.fb!==undefined)c.querySelector('.fb').value=s.fb;if(s.v)n++}});document.getElementById('count').textContent=n+' of '+cards.length+' decided'}}
cards.forEach(c=>{{c.querySelectorAll('.act button').forEach(b=>b.onclick=()=>{{st[c.dataset.uid]={{...(st[c.dataset.uid]||{{}}),v:b.dataset.v}};save();paint()}});c.querySelector('.fb').oninput=e=>{{st[c.dataset.uid]={{...(st[c.dataset.uid]||{{}}),fb:e.target.value}};save()}}}});
document.getElementById('copy').onclick=async()=>{{const L=['Cert review decisions ({BATCH}):'];cards.forEach(c=>{{const s=st[c.dataset.uid]||{{}};const fb=c.querySelector('.fb').value.trim();L.push('- '+c.dataset.name+' <'+c.dataset.email+'> uid '+c.dataset.uid+': '+(s.v?s.v.toUpperCase():'UNDECIDED')+(s.v&&s.v!=='approve'&&fb?' | feedback: '+fb.replace(/\\n/g,' / '):''))}});const t=L.join('\\n');try{{await navigator.clipboard.writeText(t);document.getElementById('copy').textContent='Copied'}}catch(e){{prompt('Copy this:',t)}}}};
paint();
</script></body></html>"""
open(OUT, 'w').write(page)
print('wrote', OUT, len(page))
