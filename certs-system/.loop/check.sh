#!/usr/bin/env bash
# Blocking gate for the engagement-analytics build. Exercises the LIVE worker and
# counts rows in the LIVE D1. Exits non-zero if any mechanical criterion fails.
set -uo pipefail
cd "$(dirname "$0")/.."
H=https://certs.fiveinnolabs.com
U=y8i52
WR="$HOME/.nvm/versions/node/v22.21.1/bin/npx wrangler"
unset CLOUDFLARE_API_TOKEN
PASS=0; FAIL=0
ok(){ printf "  \033[32mPASS\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
no(){ printf "  \033[31mFAIL\033[0m %s — %s\n" "$1" "$2"; FAIL=$((FAIL+1)); }

d1(){ $WR d1 execute aibadge-certs-stats --remote --json --command "$1" 2>/dev/null \
      | python3 -c "import json,sys
try:
  d=json.load(sys.stdin); r=d[0]['results']
  print(r[0].get('n', list(r[0].values())[0]) if r else 0)
except Exception: print('ERR')"; }

count(){ d1 "SELECT COUNT(*) AS n FROM events WHERE ucid='$U' AND event='$1'"; }

echo "== C1 schema =="
T=$($WR d1 execute aibadge-certs-stats --remote --json --command "SELECT name FROM sqlite_master WHERE type='table' AND name='events'" 2>/dev/null | grep -c '"events"')
[ "$T" -ge 1 ] && ok "C1 events table exists" || no "C1" "events table not found"
grep -q 'binding = "STATS_DB"' wrangler.toml && ok "C1 STATS_DB bound" || no "C1" "binding missing"

echo "== C2 open beacon =="
B0=$(count open)
CT=$(curl -s -o /tmp/beacon.png -w "%{http_code} %{content_type}" "$H/e/o/$U.png")
curl -s -o /tmp/real.png "$H/$U/badge.png"
sleep 3; B1=$(count open)
[ "${CT%% *}" = "200" ] && ok "C2 beacon 200" || no "C2" "status $CT"
echo "$CT" | grep -q "image/png" && ok "C2 content-type image/png" || no "C2" "content-type $CT"
cmp -s /tmp/beacon.png /tmp/real.png && ok "C2 body identical to badge.png" || no "C2" "bytes differ"
[ "$((B1-B0))" = "1" ] && ok "C2 wrote exactly 1 open row" || no "C2" "delta $((B1-B0))"

echo "== C3 click redirects =="
V0=$(count email_verify); L0=$(count email_linkedin)
RV=$(curl -s -o /dev/null -w "%{http_code}|%{redirect_url}" "$H/e/c/$U/verify")
RL=$(curl -s -o /dev/null -w "%{http_code}|%{redirect_url}" "$H/e/c/$U/linkedin")
sleep 3; V1=$(count email_verify); L1=$(count email_linkedin)
[ "${RV%%|*}" = "302" ] && ok "C3 verify 302" || no "C3" "verify status ${RV%%|*}"
echo "$RV" | grep -q "$H/$U" && ok "C3 verify Location -> credential page" || no "C3" "loc $RV"
[ "${RL%%|*}" = "302" ] && ok "C3 linkedin 302" || no "C3" "linkedin status ${RL%%|*}"
echo "$RL" | grep -q "linkedin.com" && ok "C3 linkedin Location -> linkedin.com" || no "C3" "loc $RL"
[ "$((V1-V0))" = "1" ] && ok "C3 wrote 1 email_verify" || no "C3" "delta $((V1-V0))"
[ "$((L1-L0))" = "1" ] && ok "C3 wrote 1 email_linkedin" || no "C3" "delta $((L1-L0))"

echo "== C4 artifact fetches =="
for pair in "credential.pdf:pdf" "badge.png:png" "og.png:preview" "credential.json:vc"; do
  f=${pair%%:*}; e=${pair##*:}
  A0=$(count "$e"); curl -s -o /dev/null "$H/$U/$f"; sleep 3; A1=$(count "$e")
  [ "$((A1-A0))" = "1" ] && ok "C4 $f -> 1 '$e' row" || no "C4" "$f delta $((A1-A0))"
done

echo "== C5 page view =="
P0=$(count view); curl -s -o /dev/null "$H/$U"; sleep 3; P1=$(count view)
[ "$((P1-P0))" = "1" ] && ok "C5 wrote 1 view row" || no "C5" "delta $((P1-P0))"

echo "== C6 /api/track =="
K0=$(count linkedin)
S=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$H/api/track" -H 'Content-Type: application/json' -d "{\"ucid\":\"$U\",\"event\":\"linkedin\"}")
BAD1=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$H/api/track" -H 'Content-Type: application/json' -d '{"ucid":"z9z99","event":"linkedin"}')
BAD2=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$H/api/track" -H 'Content-Type: application/json' -d "{\"ucid\":\"$U\",\"event\":\"pdf\"}")
sleep 3; K1=$(count linkedin)
[ "$S" = "204" ] && ok "C6 valid -> 204" || no "C6" "status $S"
[ "$((K1-K0))" = "1" ] && ok "C6 wrote exactly 1 row" || no "C6" "delta $((K1-K0))"
[ "$BAD1" = "400" ] && ok "C6 unknown ucid -> 400" || no "C6" "unknown ucid gave $BAD1"
[ "$BAD2" = "400" ] && ok "C6 server-only event rejected -> 400" || no "C6" "forged pdf gave $BAD2"

echo "== C7 no raw IP stored =="
COLS=$($WR d1 execute aibadge-certs-stats --remote --json --command "PRAGMA table_info(events)" 2>/dev/null)
echo "$COLS" | grep -qiE '"name": *"(ip|ip_address|remote_addr|client_ip)"' && no "C7" "an IP column exists" || ok "C7 no IP-named column"
DUMP=$($WR d1 execute aibadge-certs-stats --remote --json --command "SELECT * FROM events" 2>/dev/null)
echo "$DUMP" | grep -qE '"[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}"' && no "C7" "an IPv4 value is stored" || ok "C7 no IPv4 in any stored value"
echo "$DUMP" | grep -qE '"[0-9a-f]{1,4}:[0-9a-f]{1,4}:[0-9a-f:]{6,}"' && no "C7" "an IPv6 value is stored" || ok "C7 no IPv6 in any stored value"

echo "== C8/C9 stats API =="
U401=$(curl -s -o /dev/null -w "%{http_code}" "$H/api/stats")
[ "$U401" = "401" ] && ok "C8 unauthenticated -> 401" || no "C8" "got $U401"
ACAO=$(curl -s -D- -o /dev/null "$H/api/stats" | tr -d '\r' | grep -i '^access-control-allow-origin:' | head -1)
[ -n "$ACAO" ] && ok "C9 ACAO present on /api/stats ($ACAO)" || no "C9" "no ACAO header"
PRE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$H/api/stats" -H "Origin: https://aibadge.fiveinnolabs.com" -H "Access-Control-Request-Headers: authorization")
[ "$PRE" = "200" ] || [ "$PRE" = "204" ] && ok "C9 preflight $PRE" || no "C9" "preflight $PRE"
curl -s -D- -o /dev/null -X OPTIONS "$H/api/stats" | tr -d '\r' | grep -qi 'access-control-allow-headers:.*[Aa]uthorization' && ok "C9 preflight allows Authorization" || no "C9" "Authorization not allowed"

echo "== C11 email template =="
node --input-type=module -e "
import('$PWD/src/lib/email.js').then(async m=>{
  let captured=null;
  globalThis.fetch=async(u,o)=>{captured=JSON.parse(o.body);return{ok:true,json:async()=>({})};};
  await m.sendBadgeEmail({FROM_EMAIL:'x <a@b.co>',RESEND_API_KEY:'k'},{to:'a@b.co',name:'T',ucid:'$U',
    verifyUrl:'https://certs.fiveinnolabs.com/$U',badgeUrl:'unused',badgeBytes:new Uint8Array(1),
    pdfBytes:new Uint8Array(1),issuedDisplay:'25 August 2026',level:2,host:'certs.fiveinnolabs.com'});
  const h=captured.html;
  const need=['/e/o/$U.png','/e/c/$U/verify','/e/c/$U/linkedin'];
  let bad=0; need.forEach(n=>{ if(!h.includes(n)){console.log('MISSING '+n); bad=1;} });
  if(h.includes('src=\"https://certs.fiveinnolabs.com/$U/badge.png\"')){console.log('MISSING beacon: img still points at raw badge'); bad=1;}
  process.exit(bad);
})" >/tmp/c11.log 2>&1 && ok "C11 email uses beacon + tracked links" || no "C11" "$(cat /tmp/c11.log | head -3)"

echo "== C12 no regression =="
VC=$(curl -s "$H/api/verify/$U")
echo "$VC" | grep -q '"level": *"Level 2"' && ok "C12 VC still Level 2" || no "C12" "level missing from VC"
echo "$VC" | grep -q 'eddsa-jcs-2022' && ok "C12 proof intact" || no "C12" "proof missing"

echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
