# ShowerGem Knowledge Base (verified 2026-07-21)

Sources: raw HTML of showergem.ie/products/showergem-shower-caddy (including the
Frequently Asked Questions accordion, which is hidden from simple page-summary
fetches because it's client-side toggled), plus contact-us, return-policy,
terms-of-service, and register-for-extended-warranty pages. Everything below is
either a direct quote/paraphrase of real site content or explicitly marked unverified.
Do not state anything outside this file as fact - use the fallback line instead.

## PRICE - RESOLVED against live Shopify checkout data (highest-authority source)

Marketing copy across the site is inconsistent (homepage banner says "30% off",
product page text says "reduced from X", JSON-LD shows yet another number). None
of those are authoritative - what a customer is actually CHARGED is the live
Shopify variant price, fetched directly from `/products/showergem-shower-caddy.js`
on 2026-07-21:

- **2 Pack: EUR 56.99** (compare-at EUR 59.99 - a real but small discount, NOT
  the "30% off" the homepage banner claims)
- **4 Pack: EUR 99.99** (no compare-at price set - NOT currently on sale, despite
  marketing text claiming a reduction from EUR 109.99/100.00)
- **6 Pack: EUR 149.99** (no compare-at price set)

Use these three numbers with full confidence - they are what checkout actually
charges. Do NOT quote "30% off," "€49.99," "€79.99," or "€119.99" - those come
from stale/inconsistent marketing copy, not the real price.

## UNRESOLVED CONFLICT - genuinely ambiguous, needs ShowerGem to answer, do not guess

**Returns window: 30 days or 60 days?** The homepage explicitly states a
"60-Day Money Back Guarantee" / "60-day Satisfaction Guarantee" (appears twice).
The product page's own FAQ accordion states "the '30 Day Hassle-Free Returns'
policy" by name, twice, with matching detail in the separate return-policy page.
This is a real, current contradiction on ShowerGem's live site as of 2026-07-21,
not a fetch error - both numbers were pulled directly from live page content
in the same session. The bot should NOT commit to either number as fact.
Safe phrasing: "ShowerGem's return window is at least 30 days from your order
date - for the exact current policy, please check the confirmation email you
received or email returns@showergem.com before returning anything, since the
number varies across our own pages and we want to get it right for you."
This needs to go back to ShowerGem/Victor to fix at the source (pick one number
and make every page match it) - the chatbot working around it is a patch, not
a fix.

**Returns/support email**: three different addresses appear on the real site
with no stated distinction: `returns@showergem.com` (used twice in the FAQ
accordion, for the return process), `seand@showergem.com` (return-policy page,
for defect/exchange claims), `info@showergem.com` (contact-us page, general).
Default: `returns@showergem.com` for returns (named twice, directly in the
customer-facing FAQ), `info@showergem.com` for everything else - but this also
needs a real answer from the client, not an assumption.

**"Works on all surfaces" vs excluded surfaces**: the homepage banner and a USP
section both say "Works on ALL surfaces" / "attaches to all wall surfaces."
The FAQ, on the same site, explicitly excludes soft plastic, laminate, and
vinyl, and tells customers to check with their surface manufacturer first if
unsure. The bot must use the FAQ's more specific, more cautious answer (works
on all TILE types + most bathroom surfaces, but not soft plastic/laminate/vinyl)
rather than the banner's absolute claim - overpromising here creates real
returns/complaints.

**Review count/rating**: homepage shows "250,000 Showers Saved," "300,000+
units sold," "6,650+ Verified Reviews," and "6,000+ users" all in the same
page. Product page structured data says 5,189 reviews, 4.95/5. These don't
reconcile to one number. Safe phrasing: "over 250,000 units sold, with a
4.9+ out of 5 average rating from thousands of verified reviews" - directionally
true across every version seen, commits to nothing that could be individually
wrong.

## Company
- Legal name: ShowerGem Limited
- Address: Clerhaun, Westport, Co. Mayo, F28EY27, Ireland
- Governing law: Ireland
- Made and designed in Ireland (stated on-site)
- No published phone number, no stated business hours, no stated response time.

## Product: ShowerGem Shower Caddy (the only fully-verified product)

### Facts
- Materials: engineering-grade plastic, 100% rustproof
- Dimensions: 38cm tall x 17cm wide x 8cm protrusion from wall
- Weights: 2 Pack 0.76kg, 4 Pack 1.6kg, 6 Pack 2.3kg (from product SKUs)
- SKUs: 2 Pack = IX-EOE3-NB2Q, 4 Pack = 4T-FG4P-DD, 6 Pack = 6F-TM6P-FF
- Rating/reviews: see "Review count/rating" in unresolved-conflicts above -
  use "over 250,000 units sold, 4.9+ out of 5, thousands of verified reviews"
- Pricing (live Shopify checkout price - see PRICE section above for why this
  is the trusted number): Set of 2 EUR 56.99, Set of 4 EUR 99.99, Set of 6
  EUR 149.99. Free delivery on all orders.
- Warranty: 2 Years Full Guarantee
- Works on: all tile types (smooth, rough, textured), most bathroom surfaces
- Does NOT work on: soft plastic, laminate, vinyl - "please contact your
  bathroom surface manufacturer before installation to ensure the ShowerGem
  is suitable" for anything unusual
- What's included per order: the caddy unit(s), specialised adhesive glue,
  a cleaning wipe for installation

### Frequently Asked Questions (verbatim from the live product page)

**How do I install The ShowerGem Shower Caddy?**
Easily install The Shower Gem in 60 seconds by following the steps in the
install video. No suction cups, drill, or screws are required - it uses a
specialised adhesive to stick to your tiles. (3 steps: clean the wall area
with the provided wipe -> apply glue to the connector and place on the wall,
wait 24 hours -> hang the ShowerGem.)

**How do I permanently remove The ShowerGem Shower Caddy from my tiles?**
Gently use a paint scraper or blunt knife.

**Can I take a shower while waiting for the glue to set?**
Yes - you can use your bathroom completely normally during the 24-hour cure time.

**What are the dimensions of The ShowerGem Shower Caddy?**
38cm tall by 17cm wide, protrudes 8cm from the shower wall.

**How do I know the glue will stick to my tiles without damage?**
The glue is engineering-grade, the same type used in the automotive and
aeronautical industries. Not recommended on soft plastic, laminates, or
vinyls - it may cause damage during installation, use, or removal. Customers
should check with their bathroom surface manufacturer first if unsure.

**If there are marks on my product, what do I do?**
Every unit has small "weld lines" (scratch-like marks) and two circular dots
from the manufacturing/mold process. These are normal, cannot be removed, do
not affect function, and become unnoticeable once mounted. Not a defect.

**What is the '30 Day Hassle-Free Returns' policy?**
Full refund if returned for any reason within 30 days of the order date.
Email returns@showergem.com with name and reason for return. ShowerGem does
NOT cover return postage cost.

**How do I clean The ShowerGem Shower Caddy?**
Clips on/off the wall easily. Clean with a soft cloth and warm water. Drainage
slots behind the shelves mean no water is retained.

**Is The ShowerGem Shower Caddy made in Ireland?**
Yes - designed and manufactured in Ireland.

**What if I want to move The ShowerGem to a different location?**
You need to reorder a new tube of glue (link on-site) - the original glue
bond is not reusable/relocatable.

**What material is The ShowerGem Shower Caddy made from?**
Engineering-grade plastic - tough, durable, 100% rustproof.

**How can I return The ShowerGem Shower Caddy?**
Email returns@showergem.com with full name and reason for the return.
30 days from date of order. (Same policy as above, repeated on-page.)

### Additional return policy detail (from the return-policy page, supplements the FAQ)
- Item must be unused, in original condition, in original packaging; proof of
  purchase/receipt required
- Return shipping cost is the customer's responsibility and is non-refundable;
  it is deducted from the refund amount
- Refund goes to the original payment method; exact processing time not stated
- Replacements are only issued for defective/damaged items
- Return address: ShowerGem, Clerhaun, Westport, Mayo, F28EY27, Ireland
- Recommend trackable shipping for returns over EUR 25 (ShowerGem does not
  guarantee receipt of untracked returns)

## Extended warranty registration
- A registration form exists (email/name/country) but the page does not state
  duration, coverage, deadline, or cost for the Ireland/EU version - it only
  references a separate "US Extended Warranty" page/form. Do not invent terms;
  this is separate from and additional to the 2 Years Full Guarantee above.

## Products NOT fully verified - use fallback, do not state specs as fact
- "No-Bristle Toilet Brush" product page is currently broken on ShowerGem's own
  site: its meta title and marketing copy are duplicated from the shower caddy
  page, not its own content, as of 2026-07-21. Raw page data hints at price
  tiers around EUR 12.99 / 19.99 / 29.99 but the tier-to-pack mapping is
  unconfirmed - do not state a specific price.
- Bundle SKUs (set-of-2-plus-2-brushes, popup bundles, mastercarton, replacement
  glue kit sold separately, install-kit-redelivery) - not individually verified.

## Fallback response (for anything outside this file)
"I don't have a fully confirmed answer for that - the best way to get it right
is to email info@showergem.com (or returns@showergem.com for a return), and
they'll sort you out."

## Known correction log (so nobody re-introduces these errors)
- Currency is EUR (euro), confirmed on multiple pages and the live Shopify feed.
- Real checkout prices are EUR 56.99 / 99.99 / 149.99 (2/4/6 pack) - NOT the
  "30% off," "49.99/79.99/119.99" marketing banner numbers, which are stale.
- Returns window is genuinely disputed on ShowerGem's own site (30 vs 60 days)
  as of 2026-07-21 - do not state either number as settled fact; see the
  UNRESOLVED CONFLICT section.
- Dimensions are in cm (38 x 17 x 8), not inches.
- The caddy does NOT work on "all surfaces" despite the homepage banner -
  soft plastic/laminate/vinyl are excluded per the FAQ, and unusual surfaces
  should be checked with the manufacturer first. Trust the FAQ over the banner.
- Scratch-like "weld line" marks and two circular mold dots are normal
  manufacturing artifacts, not defects - this is a real, common customer
  question with a documented on-site answer.
- Review/unit-sold counts vary across the site (250k/300k units, 5,189/6,000/
  6,650 reviews) - use the safe directional phrasing given above, not one
  specific number.
