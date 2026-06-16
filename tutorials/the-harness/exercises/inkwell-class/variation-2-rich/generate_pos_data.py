#!/usr/bin/env python3
"""
Inkwell Books: synthetic POS transaction generator.

Produces inkwell_pos_transactions.csv: a representative ~7% anonymised sample of
completed till baskets across the 9-branch chain, 2024-06 to 2026-05 (24 months).
Line-item granularity (group by basket_id to roll up to baskets).

The data is engineered so that, when aggregated, it tells the story in context.md §2:
  - basket volume (footfall proxy) declines ~29% over two years, steepest at the
    student-heavy branches (Maynooth, Galway)
  - the under-35 share of revenue collapses from ~37% to ~22%
  - category mix, AOV (~EUR 18.40 now), stamp-card redemption (~6%) all reconcile
It is synthetic. Seed is fixed so the file is reproducible and auditable.
"""

import csv, random, datetime as dt

random.seed(42)
OUT = "inkwell_pos_transactions.csv"

# --- branches: name -> (revenue weight, footfall_now/footfall_then, has_cafe) ---
BRANCHES = {
    "Camden St":      (86, 3100/4450, True),
    "Rathmines":      (41, 1450/2050, False),
    "Dun Laoghaire":  (33, 1180/1520, False),
    "Galway":         (52, 1920/2760, True),
    "Cork":           (47, 1640/2300, True),
    "Limerick":       (28,  980/1410, False),
    "Kilkenny":       (22,  760/980,  False),
    "Dundrum":        (44, 1540/2180, False),
    "Maynooth":       (19,  720/1090, False),
}

# --- categories: unit weight (non-cafe), mean price ---
CATS = {
    "Fiction":               (0.45, 12.5),
    "Children's & YA":       (0.21, 9.5),
    "Non-fiction":           (0.19, 16.0),
    "Stationery & Gifts":    (0.15, 6.5),
}
CAFE = ("Cafe", 4.2)  # only at has_cafe branches; ~9% of those branches' lines

GENRES = {
    "Fiction": [("Literary",0.22),("Crime & Thriller",0.30),("Romantasy",0.12),
                ("SciFi & Fantasy",0.16),("General",0.20)],
    "Children's & YA": [("Picture Books",0.34),("Middle-grade",0.34),("Young Adult",0.32)],
    "Non-fiction": [("Business",0.22),("Self-development",0.20),("History",0.20),
                    ("Biography",0.20),("Cooking",0.18)],
    "Stationery & Gifts": [("Notebooks",0.30),("Pens",0.22),("Greeting Cards",0.28),("Gifts",0.20)],
    "Cafe": [("Coffee",0.42),("Tea",0.18),("Pastry",0.24),("Sandwich",0.16)],
}

ADJ = ["Silent","Crimson","Hollow","Northern","Gilded","Salt","Paper","Winter","Lantern",
       "Glass","Quiet","Burning","Hidden","Last","Velvet","Tidewater","Marble","Amber"]
NOUN = ["Garden","Library","Tide","Cartographer","Inheritance","Orchard","Lighthouse","Cipher",
        "Almanac","Hour","Wager","Sparrow","Atlas","Confession","Harbour","Reckoning","Vow","Bindery"]

def weighted(pairs):
    r = random.random(); c = 0.0
    for name, w in pairs:
        c += w
        if r <= c: return name
    return pairs[-1][0]

def age_shares(t):  # t in [0,1] over the 24 months; returns cumulative-ready list
    then = {"Under 25":0.14,"25-34":0.23,"35-49":0.28,"50-64":0.21,"65+":0.14}
    now  = {"Under 25":0.07,"25-34":0.15,"35-49":0.30,"50-64":0.28,"65+":0.20}
    mix = {k: then[k]*(1-t)+now[k]*t for k in then}
    s = sum(mix.values())
    return [(k, mix[k]/s) for k in mix]

SEASON = {1:0.82,2:0.85,3:0.95,4:0.98,5:1.0,6:0.96,7:0.93,8:0.95,
          9:1.02,10:1.06,11:1.22,12:1.62}

# build month list 2024-06 .. 2026-05
months = []
y, m = 2024, 6
for _ in range(24):
    months.append((y, m)); m += 1
    if m == 13: m = 1; y += 1

SAMPLE_BASE = 95  # baskets per branch per month at "then" volume (sample); tunes total size

rows = []
basket_seq = 0
for mi, (yy, mm) in enumerate(months):
    t = mi / 23.0
    for bname, (rev_w, decline, has_cafe) in BRANCHES.items():
        vol_factor = (1 - t) * 1.0 + t * decline          # footfall decline over time
        base = SAMPLE_BASE * (rev_w / 40.0) * vol_factor * SEASON[mm]
        n_baskets = max(1, int(random.gauss(base, base * 0.12)))
        ashare = age_shares(t)
        price_factor = 0.93 + 0.07 * t                     # gentle price inflation -> AOV story
        days_in_month = (dt.date(yy + (mm==12), (mm%12)+1, 1) - dt.date(yy, mm, 1)).days
        for _ in range(n_baskets):
            basket_seq += 1
            bid = f"B{basket_seq:06d}"
            day = random.randint(1, days_in_month)
            date = dt.date(yy, mm, day)
            dow = date.strftime("%A")
            wknd = dow in ("Saturday", "Sunday")
            hour = random.choices(range(10,19), weights=[6,9,12,11,9,10,12,9,5])[0]
            minute = random.randint(0,59)
            true_age = weighted(ashare)
            # age recorded at till only sometimes (no CRM); higher if stamp used
            stamp = random.random() < (0.075 if true_age in ("50-64","65+") else 0.05)
            age_recorded = true_age if (stamp or random.random() < 0.40) else "unknown"
            pay = random.choices(["contactless","card","cash","giftcard"],
                                 weights=[0.46 if not (true_age in ("50-64","65+")) else 0.30,
                                          0.30, 0.18 if true_age!="65+" else 0.34, 0.05])[0]
            channel = "click-collect" if random.random() < 0.03 else "in-store"
            n_items = random.choices([1,2,3,4], weights=[0.58,0.27,0.10,0.05])[0]
            # stamp redemption discounts the cheapest line of this basket later
            basket_lines = []
            for _li in range(n_items):
                if has_cafe and random.random() < 0.13:
                    cat, base_price = CAFE
                else:
                    cat = weighted([(c, w) for c,(w,_p) in CATS.items()])
                    base_price = CATS[cat][1]
                genre = weighted(GENRES[cat])
                if cat == "Cafe":
                    title = f"{genre}"
                else:
                    title = f"The {random.choice(ADJ)} {random.choice(NOUN)}"
                qty = random.choices([1,2,3], weights=[0.86,0.11,0.03])[0]
                unit = round(base_price * price_factor * random.uniform(0.76, 1.14), 2)
                promo = random.random() < 0.10
                disc = round(unit * qty * random.uniform(0.10,0.25), 2) if promo else 0.0
                staff_pick = "Y" if (cat in ("Fiction","Non-fiction") and random.random()<0.15) else "N"
                returned = "Y" if random.random() < 0.02 else "N"
                basket_lines.append([cat, genre, title, qty, unit, disc, promo, staff_pick, returned])
            # apply stamp redemption: free cheapest line
            if stamp and basket_lines:
                cheapest = min(range(len(basket_lines)),
                               key=lambda i: basket_lines[i][3]*basket_lines[i][4])
                bl = basket_lines[cheapest]
                bl[5] = round(bl[3]*bl[4], 2)  # discount = full line value
            for li, (cat,genre,title,qty,unit,disc,promo,staff_pick,returned) in enumerate(basket_lines,1):
                line_total = round(max(0.0, qty*unit - disc), 2)
                rows.append({
                    "line_id": f"{bid}-{li}",
                    "basket_id": bid,
                    "date": date.isoformat(),
                    "time": f"{hour:02d}:{minute:02d}",
                    "day_of_week": dow,
                    "is_weekend": "Y" if wknd else "N",
                    "branch": bname,
                    "category": cat,
                    "genre": genre,
                    "title": title,
                    "quantity": qty,
                    "unit_price_eur": unit,
                    "discount_eur": disc,
                    "line_total_eur": line_total,
                    "payment_method": pay,
                    "channel": channel,
                    "stamp_card_used": "Y" if stamp else "N",
                    "promo_applied": "Y" if promo else "N",
                    "staff_pick": staff_pick,
                    "member_age_band": age_recorded,
                    "returned": returned,
                })

FIELDS = ["line_id","basket_id","date","time","day_of_week","is_weekend","branch","category",
          "genre","title","quantity","unit_price_eur","discount_eur","line_total_eur",
          "payment_method","channel","stamp_card_used","promo_applied","staff_pick",
          "member_age_band","returned"]

with open(OUT, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=FIELDS)
    w.writeheader()
    w.writerows(rows)

# ---- verification summary (printed, not written to CSV) ----
baskets = {}
for r in rows:
    baskets.setdefault(r["basket_id"], []).append(r)
def yr(d): return d[:4]
rev_by_year, lines_by_year = {}, {}
under35_rev, total_rev_known = {"2024":0,"2025":0,"2026":0}, {"2024":0,"2025":0,"2026":0}
cat_units = {}
stamp_baskets = sum(1 for b in baskets.values() if b[0]["stamp_card_used"]=="Y")
for r in rows:
    y4 = yr(r["date"]); v = r["line_total_eur"]
    rev_by_year[y4] = rev_by_year.get(y4,0)+v
    cat_units[r["category"]] = cat_units.get(r["category"],0)+r["quantity"]
    if r["member_age_band"]!="unknown":
        total_rev_known[y4]+=v
        if r["member_age_band"] in ("Under 25","25-34"):
            under35_rev[y4]+=v
basket_totals = [sum(l["line_total_eur"] for l in b) for b in baskets.values()]
print(f"rows (line items): {len(rows):,}")
print(f"baskets:           {len(baskets):,}")
print(f"date range:        {min(r['date'] for r in rows)} -> {max(r['date'] for r in rows)}")
print(f"AOV (basket mean): EUR {sum(basket_totals)/len(basket_totals):.2f}")
print(f"stamp redemption:  {stamp_baskets/len(baskets)*100:.1f}% of baskets")
print("under-35 share of (known-age) revenue by year:")
for y4 in ("2024","2025","2026"):
    if total_rev_known[y4]:
        print(f"   {y4}: {under35_rev[y4]/total_rev_known[y4]*100:.1f}%")
tot_u = sum(cat_units.values())
print("category unit mix:")
for c,u in sorted(cat_units.items(), key=lambda x:-x[1]):
    print(f"   {c:<20} {u/tot_u*100:.1f}%")
# branch decline: baskets in first 3 months vs last 3 months
first = [m for m in months[:3]]; last = [m for m in months[-3:]]
def in_window(d, win): return (int(d[:4]), int(d[5:7])) in win
bb_first, bb_last = {}, {}
for bid,b in baskets.items():
    d = b[0]["date"]; br=b[0]["branch"]
    if in_window(d, first): bb_first[br]=bb_first.get(br,0)+1
    if in_window(d, last):  bb_last[br]=bb_last.get(br,0)+1
print("basket volume change, first 3 mo -> last 3 mo (footfall proxy):")
for br in BRANCHES:
    if bb_first.get(br):
        print(f"   {br:<16} {(bb_last.get(br,0)/bb_first[br]-1)*100:+.0f}%")
print(f"\nwrote {OUT}")
