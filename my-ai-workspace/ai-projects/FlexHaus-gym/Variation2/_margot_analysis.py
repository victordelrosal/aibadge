import csv, collections, datetime as dt
from statistics import mean

rows=[]
with open("inkwell_pos_transactions.csv") as f:
    for r in csv.DictReader(f):
        rows.append(r)
print(f"line rows: {len(rows)}")
baskets = collections.defaultdict(list)
for r in rows:
    baskets[r["basket_id"]].append(r)
print(f"baskets: {len(baskets)}")

def ym(d): return d[:7]
def lt(r): return float(r["line_total_eur"])

# date span
dates = sorted(r["date"] for r in rows)
print("span:", dates[0], "->", dates[-1])
months = sorted(set(ym(r["date"]) for r in rows))
print("months:", months[0], "->", months[-1], f"({len(months)} months)")

# Define windows: first 6 months vs last 6 months
first6 = set(months[:6]); last6 = set(months[-6:])
print("FIRST6:", sorted(first6)); print("LAST6:", sorted(last6))

# ---------- 1) Monthly basket count per branch ----------
b_first = collections.Counter(); b_last = collections.Counter()
seen_first=collections.defaultdict(set); seen_last=collections.defaultdict(set)
for bid, lines in baskets.items():
    m = ym(lines[0]["date"]); br = lines[0]["branch"]
    if m in first6: seen_first[br].add(bid)
    if m in last6:  seen_last[br].add(bid)
print("\n--- 1) BASKETS per branch, first6 vs last6 (monthly avg) ---")
branches = sorted(set(r["branch"] for r in rows))
worst=[]
for br in branches:
    fa = len(seen_first[br])/6; la = len(seen_last[br])/6
    pct = (la-fa)/fa*100 if fa else 0
    worst.append((pct, br, fa, la))
    print(f"{br:24s} first6/mo={fa:6.1f}  last6/mo={la:6.1f}  {pct:+6.1f}%")
tot_f = sum(len(seen_first[br]) for br in branches)/6
tot_l = sum(len(seen_last[br]) for br in branches)/6
print(f"{'TOTAL':24s} first6/mo={tot_f:6.1f}  last6/mo={tot_l:6.1f}  {(tot_l-tot_f)/tot_f*100:+6.1f}%")
print("worst 3:", sorted(worst)[:3])

# ---------- 2) Under-35 revenue share (known-age rows) over time ----------
def under35(ab): return ab in ("Under 25","25-34")
def known(ab): return ab not in ("unknown","")
def rev_share_under35(month_set):
    known_rev=0.0; u35_rev=0.0
    for r in rows:
        ab=r["member_age_band"]
        if ym(r["date"]) in month_set and known(ab):
            known_rev += lt(r)
            if under35(ab): u35_rev += lt(r)
    return u35_rev, known_rev, (u35_rev/known_rev*100 if known_rev else 0)
u_f = rev_share_under35(first6); u_l = rev_share_under35(last6)
print("\n--- 2) UNDER-35 revenue share (known-age rows) ---")
print(f"first6: under35 €{u_f[0]:,.0f} / known €{u_f[1]:,.0f} = {u_f[2]:.1f}%")
print(f"last6 : under35 €{u_l[0]:,.0f} / known €{u_l[1]:,.0f} = {u_l[2]:.1f}%")
print(f"share change: {u_l[2]-u_f[2]:+.1f} pts ; relative {(u_l[2]-u_f[2])/u_f[2]*100:+.1f}%")
# absolute under-35 spend decline in sample
print(f"under-35 sample revenue first6 €{u_f[0]:,.0f} -> last6 €{u_l[0]:,.0f}  = {(u_l[0]-u_f[0])/u_f[0]*100:+.1f}%")

# unknown share
unk = sum(1 for r in rows if not known(r["member_age_band"]))
print(f"unknown age rows: {unk}/{len(rows)} = {unk/len(rows)*100:.1f}%")

# ---------- 3) AOV + basket size now vs then ----------
def aov(month_set):
    tot=0.0; n=0; units=0
    for bid,lines in baskets.items():
        if ym(lines[0]["date"]) in month_set:
            n+=1
            tot+=sum(lt(x) for x in lines)
            units+=sum(int(x["quantity"]) for x in lines)
    return tot/n, units/n, n
a_f=aov(first6); a_l=aov(last6)
print("\n--- 3) AOV + basket size ---")
print(f"first6: AOV €{a_f[0]:.2f}  units/basket {a_f[1]:.2f}  baskets {a_f[2]}")
print(f"last6 : AOV €{a_l[0]:.2f}  units/basket {a_l[1]:.2f}  baskets {a_l[2]}")

# ---------- 4) Genre trend Romantasy / YA ----------
print("\n--- 4) GENRE share of units, first6 vs last6 ---")
def genre_units(month_set):
    c=collections.Counter(); tot=0
    for r in rows:
        if ym(r["date"]) in month_set:
            q=int(r["quantity"]); c[r["genre"]]+=q; tot+=q
    return c,tot
gf,tf=genre_units(first6); gl,tl=genre_units(last6)
for g in ["Romantasy","Young Adult"]:
    print(f"{g:16s} first6={gf[g]/tf*100:.2f}%  last6={gl[g]/tl*100:.2f}%")
# under-35 affinity for romantasy/YA
print("genre mix among KNOWN under-35 baskets (last6):")
c=collections.Counter(); tot=0
for r in rows:
    if ym(r["date"]) in last6 and under35(r["member_age_band"]):
        q=int(r["quantity"]); c[r["genre"]]+=q; tot+=q
for g,n in c.most_common(6): print(f"   {g:18s} {n/tot*100:.1f}%")

# ---------- 5) Stamp card + payment by age ----------
print("\n--- 5) STAMP CARD + PAYMENT by age ---")
stamp_baskets=sum(1 for bid,lines in baskets.items() if any(x["stamp_card_used"]=="Y" for x in lines))
print(f"stamp-card baskets: {stamp_baskets}/{len(baskets)} = {stamp_baskets/len(baskets)*100:.1f}%")
for grp,name in [(("Under 25","25-34"),"under35"),(("50-64","65+"),"over50")]:
    sb=0; tb=0
    for bid,lines in baskets.items():
        ab=lines[0]["member_age_band"]
        if ab in grp:
            tb+=1
            if any(x["stamp_card_used"]=="Y" for x in lines): sb+=1
    print(f"{name}: stamp baskets {sb}/{tb} = {sb/tb*100:.1f}%" if tb else f"{name}: n/a")
# payment mix by age
print("payment mix by age band (basket-level, last6):")
pm=collections.defaultdict(collections.Counter)
for bid,lines in baskets.items():
    if ym(lines[0]["date"]) in last6:
        ab=lines[0]["member_age_band"]; grp="under35" if under35(ab) else ("over50" if ab in ("50-64","65+") else "other")
        pm[grp][lines[0]["payment_method"]]+=1
for grp in ["under35","over50"]:
    tot=sum(pm[grp].values())
    s=" ".join(f"{k}={v/tot*100:.0f}%" for k,v in pm[grp].most_common())
    print(f"   {grp}: {s}")

# ---------- PRIZE SIZING ----------
print("\n--- PRIZE SIZING (full-population scale) ---")
# §2.1 total monthly revenue = €372k. Under-35 share now = 22% (§2.2). Two years ago 37%.
month_rev=372000
u35_now=0.22; u35_then=0.37
print(f"monthly under-35 revenue now: €{month_rev*u35_now:,.0f}")
print(f"monthly under-35 revenue if restored to then-share: €{month_rev*u35_then:,.0f}")
gap_month=month_rev*(u35_then-u35_now)
print(f"monthly gap (the bleed): €{gap_month:,.0f}  annual €{gap_month*12:,.0f}")
# modest recovery scenario: recover 1/3 of the gap
print(f"recover 1/3 of gap: €{gap_month/3:,.0f}/mo  €{gap_month/3*12:,.0f}/yr on a €5,000 spend")
