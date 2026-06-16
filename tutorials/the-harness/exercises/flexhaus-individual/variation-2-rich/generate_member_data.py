#!/usr/bin/env python3
"""
FlexHaus Gym: synthetic class-bookings event log generator.

Produces flexhaus_bookings.csv: the gym's full class-booking export, one row per booking,
18 months (2024-12 to 2026-05), denormalised with member attributes so students can both
(a) analyse attendance/no-show/class-popularity at event grain and (b) GROUP BY member_id to
reconstruct the member panel and model churn.

Engineered so that, aggregated, it tells the story in context.md / slide 15:
  - ~600 currently-active members
  - ~9% average monthly churn
  - ~40% of members never book a second class (the "second-visit" retention killer)
  - patchy attendance (meaningful no-show rate), with a clearly at-risk disengaged segment
    whose churn is materially higher than the engaged base.
Synthetic. Seed fixed so the file is reproducible and auditable.
"""

import csv, random, datetime as dt

random.seed(7)
OUT = "flexhaus_bookings.csv"

WIN_START = dt.date(2024, 12, 1)
WIN_END   = dt.date(2026, 5, 31)

def add_months(d, n):
    m = d.month - 1 + n; y = d.year + m // 12; m = m % 12 + 1
    return dt.date(y, m, 1)

def months_between(a, b):  # whole months from a to b (a,b first-of-month)
    return (b.year - a.year) * 12 + (b.month - a.month)

# member archetypes: (share, monthly churn hazard, bookings/active-month, no-show prob)
ARCH = {
    "one_timer": (0.45, 0.130, 0.0,  0.55),   # books exactly 1 class ever, then ghosts; high churn
    "sporadic":  (0.27, 0.100, 1.6,  0.34),   # patchy
    "regular":   (0.20, 0.035, 5.0,  0.16),   # steady weekly
    "devotee":   (0.08, 0.015, 13.0, 0.07),   # near-daily
}
PLANS = [("Off-peak",29.0,0.18),("Standard",49.0,0.40),("Premium",79.0,0.16),
         ("Student",25.0,0.14),("Annual",45.0,0.12)]
CLASSES = [("Spin",0.20),("HIIT",0.19),("Strength",0.17),("Yoga",0.15),
           ("Pilates",0.11),("Boxing",0.10),("Mobility",0.08)]
INSTRUCTORS = ["Aisling","Conor","Dev","Marta","Niall","Saoirse","Tom"]
ROOMS = ["Studio A","Studio B","The Rig"]
REFERRAL = [("Instagram",0.30),("Walk-in",0.22),("Friend referral",0.24),
            ("Google",0.16),("Class-pass promo",0.08)]
AGE_BANDS = [("18-24",0.18),("25-34",0.38),("35-44",0.26),("45-54",0.12),("55+",0.06)]
GENDER = [("F",0.56),("M",0.42),("Other",0.02)]

def weighted(pairs):
    r = random.random(); c = 0.0
    for name, w in pairs:
        c += w
        if r <= c: return name
    return pairs[-1][0]

def pick_arch():
    r = random.random(); c = 0.0
    for name,(share,_,_,_) in ARCH.items():
        c += share
        if r <= c: return name
    return "sporadic"

# ---- build members ----
N_EVER = 2300   # tuned so ~600 are active at WIN_END
members = []
for i in range(1, N_EVER + 1):
    arch = pick_arch()
    share, hazard, rate, nsp = ARCH[arch]
    # join any time in the 34 months before window end (broad tenure spread)
    join = add_months(WIN_END, -random.randint(0, 33))
    join = join.replace(day=min(28, random.randint(1, 28)))
    # simulate monthly churn from join to window end
    cancel = None
    cursor = dt.date(join.year, join.month, 1)
    mi = 0
    while cursor <= WIN_END:
        h = hazard * (1.6 if mi < 2 else 1.0)   # early-tenure churn lift
        if random.random() < h:
            cancel = cursor.replace(day=min(28, random.randint(1, 28)))
            break
        cursor = add_months(cursor, 1); mi += 1
    if cancel and cancel > WIN_END:
        cancel = None
    status = "cancelled" if cancel else ("frozen" if random.random() < 0.04 else "active")
    plan = weighted([(n, w) for n, _f, w in PLANS])
    fee = next(f for n, f, _w in PLANS if n == plan)
    members.append({
        "member_id": f"M{i:05d}", "arch": arch, "join": join, "cancel": cancel,
        "status": status, "plan": plan, "fee": fee,
        "age_band": weighted(AGE_BANDS), "gender": weighted(GENDER),
        "referral": weighted(REFERRAL), "dist": round(random.uniform(0.4, 14.0), 1),
        "nsp": nsp, "rate": rate, "arch_share": share,
    })

# ---- build bookings ----
rows = []
bk = 0
for mb in members:
    join, cancel = mb["join"], mb["cancel"]
    active_end = cancel if cancel else add_months(WIN_END, 1)
    # member's active months that fall inside the booking window
    cur = max(dt.date(join.year, join.month, 1), WIN_START)
    active_months = []
    while cur <= WIN_END and cur < active_end:
        active_months.append(cur); cur = add_months(cur, 1)
    if not active_months:
        continue
    if mb["arch"] == "one_timer":
        sched = [(random.choice(active_months[:2]), 1)]   # 1 booking, early
    else:
        sched = [(m, max(0, int(random.gauss(mb["rate"], mb["rate"]*0.4)))) for m in active_months]
    for month, n in sched:
        dim = (add_months(month, 1) - month).days
        for _ in range(n):
            bk += 1
            day = random.randint(1, dim)
            bdate = dt.date(month.year, month.month, day)
            if bdate < join or bdate > WIN_END:
                continue
            dow = bdate.strftime("%A")
            hour = random.choices([6,7,8,9,12,13,17,18,19,20],
                                  weights=[5,8,6,4,5,4,9,12,11,6])[0]
            r = random.random()
            status = "attended" if r > mb["nsp"] else ("no_show" if r > mb["nsp"]*0.45 else "late_cancel")
            rows.append({
                "member_id": mb["member_id"], "_bk": bk, "_date": bdate,
                "join": join, "cancel": cancel, "mstatus": mb["status"], "plan": mb["plan"],
                "fee": mb["fee"], "age_band": mb["age_band"], "gender": mb["gender"],
                "referral": mb["referral"], "dist": mb["dist"], "time": f"{hour:02d}:00",
                "dow": dow, "wknd": dow in ("Saturday","Sunday"),
                "class_type": weighted(CLASSES), "instructor": random.choice(INSTRUCTORS),
                "room": random.choice(ROOMS), "bstatus": status,
                "waitlisted": "Y" if random.random() < 0.08 else "N",
                "pt_session": "Y" if random.random() < 0.05 else "N",
            })

# order by date, assign booking_id + first/second-class flags per member
rows.sort(key=lambda x: (x["_date"], x["member_id"]))
seen = {}
out = []
for r in rows:
    mid = r["member_id"]
    seen[mid] = seen.get(mid, 0) + 1
    nth = seen[mid]
    out.append({
        "booking_id": f"BK{r['_bk']:06d}",
        "member_id": mid,
        "join_date": r["join"].isoformat(),
        "member_status": r["mstatus"],
        "cancel_date": r["cancel"].isoformat() if r["cancel"] else "",
        "plan_type": r["plan"],
        "monthly_fee_eur": r["fee"],
        "age_band": r["age_band"],
        "gender": r["gender"],
        "referral_source": r["referral"],
        "home_distance_km": r["dist"],
        "booking_date": r["_date"].isoformat(),
        "booking_time": r["time"],
        "day_of_week": r["dow"],
        "is_weekend": "Y" if r["wknd"] else "N",
        "class_type": r["class_type"],
        "instructor": r["instructor"],
        "room": r["room"],
        "booked_status": r["bstatus"],
        "is_first_class": "Y" if nth == 1 else "N",
        "is_second_class": "Y" if nth == 2 else "N",
        "waitlisted": r["waitlisted"],
        "pt_session": r["pt_session"],
    })

FIELDS = ["booking_id","member_id","join_date","member_status","cancel_date","plan_type",
          "monthly_fee_eur","age_band","gender","referral_source","home_distance_km",
          "booking_date","booking_time","day_of_week","is_weekend","class_type","instructor",
          "room","booked_status","is_first_class","is_second_class","waitlisted","pt_session"]

with open(OUT, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=FIELDS); w.writeheader(); w.writerows(out)

# ---- verification summary ----
present = {}   # member_id -> list of bookings
for r in out:
    present.setdefault(r["member_id"], []).append(r)
active = [m for m in members if m["status"] == "active"]
cancelled = [m for m in members if m["status"] == "cancelled"]
# monthly churn: cancels in month / active-at-start, averaged over window months
months = [add_months(WIN_START, k) for k in range(months_between(WIN_START, WIN_END)+1)]
rates = []
for m in months:
    start_active = sum(1 for mb in members if dt.date(mb['join'].year,mb['join'].month,1) <= m
                       and (mb['cancel'] is None or mb['cancel'] >= m))
    cancels = sum(1 for mb in members if mb['cancel'] and mb['cancel'].year==m.year and mb['cancel'].month==m.month)
    if start_active: rates.append(cancels/start_active)
avg_churn = sum(rates)/len(rates)
never2 = sum(1 for mid,b in present.items() if len(b) < 2)
no_show = sum(1 for r in out if r["booked_status"]=="no_show")/len(out)
# at-risk lift: members appearing with <=1 booking vs >=5, cancelled rate
mstat = {m["member_id"]: m["status"] for m in members}
low = [mid for mid,b in present.items() if len(b)<=1]
high = [mid for mid,b in present.items() if len(b)>=5]
def cancel_rate(ids):
    return sum(1 for i in ids if mstat[i]=="cancelled")/len(ids) if ids else 0
print(f"rows (bookings):        {len(out):,}")
print(f"distinct members in CSV:{len(present):,}")
print(f"  ...currently active:  {sum(1 for mid in present if mstat[mid]=='active'):,}  (target ~600)")
print(f"members ever (sim):     {len(members):,}  active {len(active)} / cancelled {len(cancelled)}")
print(f"date range:             {min(r['booking_date'] for r in out)} -> {max(r['booking_date'] for r in out)}")
print(f"avg monthly churn:      {avg_churn*100:.1f}%  (target ~9%)")
print(f"never book 2nd class:   {never2/len(present)*100:.1f}% of members  (target ~40%)")
print(f"no-show rate:           {no_show*100:.1f}%")
lr, hr = cancel_rate(low), cancel_rate(high)
print(f"at-risk lift: cancelled rate  <=1 booking {lr*100:.0f}%  vs  >=5 bookings {hr*100:.0f}%  (lift {lr/hr:.1f}x)")
fee_active = [m['fee'] for m in active]
print(f"avg active monthly fee: EUR {sum(fee_active)/len(fee_active):.2f}  -> MRR ~ EUR {sum(fee_active):,.0f}")
print(f"\nwrote {OUT}")
