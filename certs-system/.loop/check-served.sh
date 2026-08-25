#!/usr/bin/env bash
# Gate for the SERVED issuer console, not the source file.
#
# Written after the cold verifier found that /issue was a syntax error in
# production while the source extracted cleanly. The client JS lives inside a JS
# template literal, so every backslash escape is consumed once at serve time.
# Checking the source proves nothing. This checks the bytes the browser receives.
set -uo pipefail
H=${1:-https://certs.fiveinnolabs.com}
PASS=0; FAIL=0
ok(){ printf "  \033[32mPASS\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
no(){ printf "  \033[31mFAIL\033[0m %s — %s\n" "$1" "$2"; FAIL=$((FAIL+1)); }

TMP=$(mktemp -d)
curl -s "$H/issue" -o "$TMP/issue.html" || { echo "could not fetch $H/issue"; exit 1; }
[ -s "$TMP/issue.html" ] && ok "served /issue is non-empty" || no "fetch" "empty body"

# Extract every inline <script> WITHOUT a src, exactly as the browser would run it.
python3 - "$TMP/issue.html" "$TMP" <<'PY'
import re,sys
html=open(sys.argv[1],encoding='utf-8').read()
blocks=re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)
print(f"  (found {len(blocks)} inline script block(s))")
for i,b in enumerate(blocks):
    open(f"{sys.argv[2]}/served-{i}.js","w",encoding='utf-8').write(b)
open(f"{sys.argv[2]}/count","w").write(str(len(blocks)))
PY

N=$(cat "$TMP/count")
[ "$N" -ge 1 ] && ok "inline script present" || no "extract" "no inline script found"

for f in "$TMP"/served-*.js; do
  if node --check "$f" 2>"$TMP/err"; then ok "served $(basename "$f") parses in node"
  else no "served $(basename "$f")" "$(head -2 "$TMP/err" | tr '\n' ' ')"; fi
done

echo "  -- regexes must not contain a literal newline (the template-literal trap) --"
if grep -qP '/\^?\[?[^\n]*\\?\s*$' /dev/null 2>/dev/null; then :; fi
if python3 - "$TMP" <<'PY'
import glob,re,sys
bad=[]
for f in glob.glob(sys.argv[1]+"/served-*.js"):
    src=open(f,encoding='utf-8').read()
    for m in re.finditer(r'/(?:[^/\\\n]|\\.)*$', src, re.M):
        frag=m.group(0)
        if frag.count('[')!=frag.count(']'): bad.append((f,frag[:60]))
    if re.search(r'\bsplit\(/[^/\n]*\n', src): bad.append((f,'split() regex spans a newline'))
print("BAD" if bad else "CLEAN")
for f,x in bad: print("   ",f,x)
PY
then :; fi
S=$(python3 - "$TMP" <<'PY'
import glob,re,sys
bad=0
for f in glob.glob(sys.argv[1]+"/served-*.js"):
    if re.search(r'split\(/[^/\n]*\n', open(f,encoding='utf-8').read()): bad=1
print(bad)
PY
)
[ "$S" = "0" ] && ok "no regex literal split across a line break" || no "regex" "a regex literal contains a newline"

echo "  -- the email validator must accept a real student address --"
V=$(python3 - "$TMP" <<'PY'
import glob,re,sys
pat=None
for f in glob.glob(sys.argv[1]+"/served-*.js"):
    m=re.search(r"if\(!(/\^.*?/)\.test\(r\.email\)\)", open(f,encoding='utf-8').read())
    if m: pat=m.group(1)
print(pat or "NOTFOUND")
PY
)
if [ "$V" = "NOTFOUND" ]; then no "email regex" "not found in served JS"; else
  node -e "
    const re=$V;
    const good=['x25115880@student.ncirl.ie','andresapitt@gmail.com','victor.delrosal@ncirl.ie'];
    const bad =['no-at-sign','a b@c.d','nodot@domain'];
    let f=0;
    good.forEach(e=>{ if(!re.test(e)){ console.log('    rejects a valid address: '+e); f=1; } });
    bad.forEach(e=>{ if(re.test(e)){ console.log('    accepts an invalid address: '+e); f=1; } });
    process.exit(f);
  " && ok "served email regex accepts student.ncirl.ie and rejects junk ($V)" \
    || no "served email regex" "wrong behaviour: $V"
fi

echo "  -- the panel's controls must all be present --"
for t in 'id="bulkCsv"' 'id="bulkValidate"' 'id="bulkRun"' 'id="bulkStop"' 'id="bulkEmail"' 'id="bulkBody"'; do
  grep -q "$t" "$TMP/issue.html" && ok "$t present" || no "$t" "missing from served page"
done

echo "  -- the pre-existing console must still be wired --"
for t in "onAuthStateChanged" "previewBtn" "issueBtn" "loadList"; do
  grep -q "$t" "$TMP/issue.html" && ok "$t present" || no "$t" "missing"
done

rm -rf "$TMP"
echo
echo "PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ]
