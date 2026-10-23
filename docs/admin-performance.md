# Admin navigation performance

The admin portal keeps its shell and Clerk runtime mounted across businesses,
users and business-team routes. Lists request only their selected resource, with
20-record pagination. Other admin tabs prefetch on hover or keyboard focus.
Private read snapshots expire after 15 seconds in page memory; see
`admin-and-team.md` for invalidation and authorization rules.

## Verification

In a controlled Edge/Playwright run with a 250 ms API delay, the previous portal
loaded in 1,182 ms and four tab switches took 298/286/290/279 ms. The updated
portal loaded in 754 ms; switches took 365/40/32/31 ms. The first uncached switch
still pays network latency. Admin data requests fell from five to two across
that sequence. These are development measurements, not production guarantees.

Provider request counts are also reduced: a businesses view now needs one
Clerk Backend API read instead of fetching businesses, users and user count on
every tab. A platform admin opening a known business uses three parallel reads
instead of four reads across sequential stages. Personal invitations no longer
block business-team rendering.

Browser checks at 320/390/1440 px cover a single document/Clerk load, team routing,
back navigation, filters, search focus, cached reads, mutation invalidation,
access-denied data removal and overflow. Provider writes use test doubles; no real
invitations or memberships are changed. Node tests cover cache expiry, concurrent
deduplication, failed-read retries and invalidation during a pending read.

When business transaction data is added, paginate and index its common queries
and place database and functions in compatible regions. Measure real browser
and API latency before adding further caches or architectural changes.
