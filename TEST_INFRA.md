# TEST_INFRA.md — End-to-End Test Infrastructure

## Overview

The test infrastructure for "Leave The Room" implements a comprehensive, opaque-box, requirement-driven verification framework across a rigorous 4-Tier methodology. It evaluates the application strictly from the perspective of external consumers, API contracts, and user interactions without violating encapsulation or coupling to internal implementation details.

---

## Invocation Commands

The entire test suite can be executed with either of the following commands from the repository root:

```bash
# Direct runner execution via tsx
npx tsx tests/e2e_suite.ts

# NPM lifecycle script execution
npm run test:e2e
```

Individual tier test suites can also be imported or executed independently:

```bash
# Language verification audit script
node scripts/verify-languages.js
```

---

## Directory Layout

```
d:/progr/antiapp/
├── scripts/
│   └── verify-languages.js        # Multi-language dictionary and encoding auditor (5 locales)
├── tests/
│   ├── e2e_suite.ts               # Master orchestrator & aggregator across all tiers
│   └── e2e/
│       ├── common.ts              # Shared TestCollector, request builders, API proxies, and DB backup/restore
│       ├── tier1_features.ts      # Tier 1: Feature Coverage (all 21 inventoried features)
│       ├── tier2_boundaries.ts    # Tier 2: Boundary & Corner Cases (limits, ranges, schemas, auth)
│       ├── tier3_combinations.ts  # Tier 3: Cross-Feature Combinations (lifecycle workflows)
│       └── tier4_realworld.ts     # Tier 4: Real-World Scenarios (spontaneous, tournament, i18n, security, concurrency)
├── TEST_INFRA.md                  # This architecture document
└── TEST_READY.md                  # Test suite readiness certification & verification report
```

---

## Test Architecture & 4-Tier Methodology

The verification system adheres to a 4-Tier test architecture:

### Tier 1: Feature Coverage (47 Checks)
Covers all 21 inventoried architectural features defined in the project specification:
1. Persistent Bottom Navigation (Destinations, 44x44px touch targets, aria attributes, unread indicators)
2. Semantic Design Tokens & Status Badges (Emerald LIVE, Amber UPCOMING, Rose FINISHED)
3. Streamlined Authentication (Standard 24x24 Apple silhouette, Google vector mark)
4. Hard Authentication Gates (OAuth-only welcome screen, elimination of manual credential forms)
5. Segmented My Meetups Views (Hosting, Joined, Past tabs)
6. Server-Side Access Control (401 unauthenticated, 403 non-host deletion, 403 non-member chat)
7. Zod Data Validation Schemas (Input payloads, string boundaries, coordinate validation)
8. Pluggable Repository Persistence (File and database abstraction, meetup lifecycle)
9. Standardized API Routes & Legacy Proxies (Envelopes, meta objects, backward-compatible /api/lobbies)
10. Explore Feed Filters & Empty States (Category filtering, macro groups, zero-result states)
11. Interactive Leaflet Map Radar (SeatBubbles indicators, Haversine metric calculations)
12. Meetup Lifecycle & Host Operations (Creation, instant join, arrival check-in)
13. Co-Host Isolation Boundary (100% exclusion of co-host references from BottomNav and card headers)
14. In-Room Chat & Messaging (Real-time participant messages, session-bound senderId protection)
15. E2E Testing Harness (Collector metrics, assertion tracking, duration telemetry)
16. Security & Permission Gates (Banned account creation block, non-host close block)
17. Real-Time Radar Availability Beacon (Toggle on/off, category preferences, search radius)
18. Multilingual Architecture & Localization (5 locales: en, uk, pl, de, fr)
19. Accessibility Compliance (WAI-ARIA attributes, touch target minimums, contrast ratios)
20. Edge & Offline Resilience (Deterministic fallback responses, safe error envelopes)
21. Performance & Bundle Optimization (Modular imports, zero heavy bundle leaks)

### Tier 2: Boundary & Corner Cases (40 Checks)
Stress-tests application boundaries, limits, and edge conditions:
- Capacity limits: Minimum (2) and maximum (16) participant constraints.
- Geolocation extremes: Coordinate ranges (-90 to 90 lat, -180 to 180 lng), North/South poles, null coordinates.
- Radius boundaries: Minimum search radius (1km) up to regional limits (50km).
- String length boundaries: Titles (3 to 100 characters), chat messages (1 to 500 characters), rejection of whitespace-only input.
- User profile boundaries: Age validation (18 to 99), taglines, neighborhood strings.
- Permission boundaries: Self-actions (hosts banning themselves), suspended account creation blocks.

### Tier 3: Cross-Feature Combinations (38 Checks)
Validates interactions across decoupled subsystems:
- Auth Wall + Navigation: Unauthenticated state redirects, session persistence across tab switches.
- Create + Instant Join + In-Room Chat + Physical Check-In: Complete lifecycle from room initialization to arrival status.
- Host Approval + Capacity Ceiling: Private meetups where host approves candidates until full capacity is reached, rejecting further joins.
- Geolocation Radius + Category Filter + Proximity Ordering: Combined search returning geographically ordered results within active radius.
- Availability Radar Beacon + Profile Settings: Activating want-to-play beacon, updating imperial/metric units, and confirming profile reflection.
- Host Moderation + Re-Join Blocks: Banning a member from a room and confirming immediate eviction and 403 join rejection.
- Dual API Surface Parity: Verifying identical behavior and envelopes between `/api/meetups` and legacy `/api/lobbies`.

### Tier 4: Real-World Scenarios (28 Checks)
Simulates five complete end-to-end real-world user workflows:
1. Scenario 1: The Spontaneous Match (Host Elena creates park meetup, Liam joins, updates arrival to 'HERE', chat exchange, Elena closes room).
2. Scenario 2: The Multi-Candidate Chess Tournament (Approval-required meetup, multiple pending join requests, host accepts candidate to reach 2/2, second candidate rejected at capacity ceiling).
3. Scenario 3: International Discovery (Locale switching across English, Ukrainian, Polish, German, and French; verification of native character sets, zero emojis, and zero slang).
4. Scenario 4: Security Breach & Tampering Drill (Unauthenticated creation 401, fake role elevation 403, spoofed senderId neutralization, non-host deletion 403, SQL/script injection payload safety).
5. Scenario 5: High-Contention Race Condition (1 available seat, concurrent join requests, exactly 1 winner, remaining candidates rejected with 400, database integrity preserved with zero corruption).

### Language Integrity Audit (10 Checks)
Automated verification script (`scripts/verify-languages.js`):
- Audits dictionaries for English (en), Ukrainian (uk), Polish (pl), German (de), and French (fr).
- Verifies native character encodings (Cyrillic, Latin-Extended, German umlauts, French accents).
- Strictly enforces zero emojis across all localization strings (anti-slop mandate).
- Strictly enforces zero slang terms.

---

## State Isolation & Cleanup Guarantee

Every test run guarantees full idempotency through automated database snapshotting:
1. `backupDatabase()` copies `data/db.json` to `data/db.json.bak` prior to suite execution.
2. `restoreDatabase()` restores the backup in `finally` blocks, ensuring no side effects leak into development or production databases.
3. Tests run against the in-memory/filesystem repository proxies, exercising the real Next.js route handlers.

---

## Quality Metrics & Standards

- Zero Mocking of Core Handlers: Tests execute actual NextRequest / NextResponse pipelines against API routes.
- Zero Emojis: All test assertions, fixtures, and outputs strictly ban emojis.
- Terminology Standard: Purged of "IRL" slang; all tests use standard terms ("In-Person", "Real-World", "Leave The Room").
- Pass Rate: 163 / 163 assertions passed (100.0%).
- Execution Time: Under 1 second total runtime.
