# Project: Leave The Room (`lobby-irl-matchmaking`)

Mobile-first social matchmaking web app for spontaneous real-life in-person activity meetups built with Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, and Leaflet.

## Architecture

Leave The Room is structured into a modular, clean-layered architecture:
1. **Design System & Shell Layer (`src/components/`, `src/app/globals.css`, `tailwind.config.ts`)**:
   - Centralized design tokens: Canvas (`#F8FAFC` light / `#0B0F19` dark), Ink (`#0F172A` / `#F8FAFC`), Brand (`#4F46E5`), and semantic status colors.
   - Reusable components: `BottomNav`, `LobbyCard`, `CategoryIcon`, `SeatBubbles`, `StatusBadge`, modals, and accessible form controls.
   - Light/dark mode toggle with class-based switching and WCAG AA contrast compliance.
   - Navigation shell: 4 primary destinations (Explore, Map Radar, My Meetups, Profile) with touch targets >= 44x44px and safe-area padding (`pb-28`).

2. **Domain Views & Meetup Lifecycle Layer (`src/app/`, `src/components/`)**:
   - Explore Feed: Macro activity group pills, sub-activity chips, status pills (Live/Upcoming/Finished), distance radius selector (2/5/15/50km), and full empty/error states.
   - Interactive Map Radar (`MapRadar.tsx`): Dynamic SSR-disabled Leaflet map, custom pill `divIcon`s with live capacity, user radar circle, bottom preview sheet, and isolate z-index stacking.
   - My Meetups: Segmented tab controls (`Hosting`, `Joined`, `Past / Saved`), role indicators, pending request badges, and arrival check-ins.
   - Profile & Account: Google and Apple authentication exclusively, official AppleIcon SVG mark, avatar/bio, stats (show-up %, ratings, hours played), availability beacon.
   - Host Meetup Flow (`CreateLobbyModal.tsx`): 6-step creation wizard. Co-host is strictly optional and sequestered in host settings accordion, completely absent from global UI.
   - In-Room Chat & Coordination: Real-time message exchange, arrival check-in announcements ("I'm Here!"), and quick coordination chips.

3. **Backend, Security & Persistence Layer (`src/app/api/`, `src/lib/`)**:
   - Server-side session verification (`requireAuth`) validating caller identity on mutating operations.
   - Access Control Matrix: Only host can edit/delete meetups or accept/decline joins; only participants and host can post chat messages; only role `ADMIN` can invoke admin actions.
   - Standardized API contracts: `/api/meetups` (with backward-compatible `/api/lobbies` proxies), `/api/users/profile`, `/api/auth/session`.
   - Zod runtime validation for all payload schemas.
   - Pluggable storage repository: Atomic file write-and-rename for local development/staging, Upstash Redis REST entity store for cloud deployment.

4. **Automated QA & Verification Layer (`tests/`, `src/__tests__/`)**:
   - Vitest automated test harness designed from scratch.
   - 4-Tier opaque-box requirement-driven E2E test suite + security permission tests + a11y tests.
   - 25-point Release Readiness Checklist.

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Persistent Bottom Navigation | 4 destinations (Explore, Map, My Meetups, Profile) with 44px+ touch targets, unread badges, and safe area padding | M1 | R1, survey |
| 2 | Design System Tokens & Themes | Standardized colors, typography scale, interaction states, and light/dark mode support with WCAG AA compliance | M1 | R1, survey |
| 3 | Streamlined Auth & Apple Logo | Google and Apple auth exclusively, official standard Apple SVG logo (24x24 viewBox), streamlined WelcomeLoginScreen | M1 | Follow-up update |
| 4 | Hard Auth Gate Enforcement | Enforce strict auth gate: unauthenticated visitors must sign in via Google or Apple before viewing feed, meetups, or profile | M3 | User clarification |
| 5 | My Meetups Tab Separation | Dedicated segmented tabs for `Hosting`, `Joined`, and `Past / Saved` with role badges and pending request counters | M1 | R1, survey |
| 6 | Server-Side Access Control & Permissions | Enforce server-side authorization guards: host-only delete/edit, participant-only chat, host-only join decisions, admin-only tools | M2 | R4, survey |
| 7 | Data Models & Zod Schemas | Strongly-typed schemas for Meetup, User, Participant, Message, and MediaAsset with runtime validation | M2 | R4, survey |
| 8 | Pluggable Repository Persistence | Atomic file write-and-rename for local/staging and Upstash Redis entity store for production | M2 | R4, survey |
| 9 | Standardized API Route Handlers | `/api/meetups`, `/api/meetups/[id]`, `/api/meetups/[id]/join`, `/api/meetups/[id]/messages`, `/api/users/profile`, `/api/auth/session` + backward-compatible proxies | M2 | R4, survey |
| 10 | Explore Feed Filters & Empty States | Macro groups, sub-activity chips, status pills (Live/Upcoming/Finished), distance radius, and comprehensive empty/loading states | M3 | R2, survey |
| 11 | Interactive Leaflet Map Radar | Dynamic SSR Leaflet map, custom capacity pill markers, user radar circle, bottom preview card, recenter control | M3 | R2, survey |
| 12 | Meetup Lifecycle & Host Flow | 6-step creation flow, instant join for open meetups, approval workflow for closed meetups, arrival check-in ("I'm Here!") | M3 | R3, survey |
| 13 | Co-Host Isolation Boundary | Co-host option strictly optional and sequestered inside host creation modal; strictly absent from global UI and top-level cards | M3 | R3, survey |
| 14 | In-Room Chat & Messaging | Real-time chat messages, arrival system messages, and quick coordination chips | M3 | R3, survey |
| 15 | E2E Testing Suite (Tiers 1-4) | Requirement-driven opaque-box test suite: Tier 1 Feature, Tier 2 Boundary, Tier 3 Cross-feature, Tier 4 Real-world | E2E Track | R5, survey |
| 16 | Security & Permission Gate Tests | Automated verification that 401/403 errors are returned on unauthorized delete, join, message, and admin operations | E2E Track & M4 | R4, R5, survey |
| 17 | Accessibility & Responsiveness QA | Automated and audited WCAG AA contrast, keyboard navigation, touch target dimensions, and 0-overflow viewport review | E2E Track & M4 | R5, survey |
| 18 | Tier 5 Adversarial Coverage Hardening | White-box adversarial testing, edge case penetration, and final 100% test pass verification | M4 | Project Pattern |
| 19 | Warm Energetic Color Palette | Warm Orange (#EA580C / #F97316) & Golden Amber (#F59E0B / #D97706) brand; cream/sand light surfaces (#FAF8F5 / #FFFDF7); warm stone dark mode (#181512 / #1C1917); WCAG AA compliant | M3 | User update |
| 20 | Multilingual Support (i18n) | 5 languages: English (en), Ukrainian (uk), Polish (pl), German (de), French (fr) with navigation/settings language switcher | M3 | User update |
| 21 | Native Typography & Font Subsets | Next.js Inter/font configuration with subsets ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'] for native Ukrainian and Polish rendering | M3 | User update |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Design & implement opaque-box test framework (163 checks), Tiers 1-4 test suites, permission tests, a11y tests, publish `TEST_READY.md` | none | DONE |
| M1 | Design System, Navigation & Auth UI | Extract `BottomNav`, standardize tokens and light/dark theme, implement guest browsing, My Meetups tabs, and Google/Apple auth with official Apple SVG | none | DONE |
| M2 | Backend Data Models, Security & APIs | Server-side auth helper (`requireAuth`), Zod validation schemas, access control matrix (host-only delete, participant-only chat, host-only join decisions), repository persistence, API contracts | none | DONE |
| M3 | Meetup Discovery, Lifecycle, UX & i18n | Rebrand to "Leave The Room", complete IRL purge, zero emojis editorial design, Explore filters/cards, Leaflet Map Radar, Host wizard (isolated co-host), arrival check-in, chat, Warm Color Palette, 5-language i18n switcher, font subsets, and Hard Auth Gate | M1, M2 | DONE |
| M4 | Final Milestone (E2E Pass & Hardening) | Phase 1: Pass 100% of Tiers 1-4 E2E tests (`TEST_READY.md`). Phase 2: Tier 5 Adversarial Coverage Hardening, 513/513 assertions pass, production build clean | E2E, M3 | DONE |

---

## Interface Contracts

### M1 (Design System & Navigation) ↔ Client Views
- `BottomNav.tsx`:
  - Props: `activeTab: 'EXPLORE' | 'MAP' | 'MY_MEETUPS' | 'PROFILE'`, `onChangeTab: (tab) => void`, `unreadCount?: number`, `isDarkMode: boolean`
  - Output: Fixed bottom navigation bar with 44px+ touch targets, safe-area padding `pb-28`.
- `AuthProfileModal.tsx` & `WelcomeLoginScreen`:
  - Strictly Google and Apple sign-in options.
  - AppleIcon: SVG with `viewBox="0 0 24 24"`, official Apple silhouette.
- `MyMeetupsView`:
  - Segmented tab selector: `'HOSTING' | 'JOINED' | 'PAST'`.

### M2 (Backend & Security) ↔ M3 (Frontend Views)
- `requireAuth(req: NextRequest)`:
  - Returns verified `{ user: UserSession }` or throws 401 Unauthorized.
- `DELETE /api/meetups/[id]`:
  - Requires session matching `lobby.hostId` (or user role `ADMIN`).
  - Returns 401 if unauthenticated, 403 if authenticated user is not the host, 200 `{ deleted: true, id }` on success.
- `POST /api/meetups/[id]/join`:
  - Actions: `JOIN`, `LEAVE`, `REQUEST_JOIN`, `ACCEPT_REQUEST`, `DECLINE_REQUEST`, `CHECK_IN`, `BAN_FROM_LOBBY`.
  - Host-only actions (`ACCEPT_REQUEST`, `DECLINE_REQUEST`, `BAN_FROM_LOBBY`) strictly verify caller is `lobby.hostId`.
- `POST /api/meetups/[id]/messages`:
  - Verifies caller session is a joined participant or host.
  - Returns 403 if caller is not in `lobby.participants` and not host.

---

## Code Layout

```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── session/route.ts        # Session authentication endpoint
│   │   ├── meetups/
│   │   │   ├── route.ts                # GET (filtered list), POST (create)
│   │   │   └── [id]/
│   │   │       ├── route.ts            # GET details, PUT update, DELETE (host-only)
│   │   │       ├── join/route.ts       # Join, Leave, Accept, Decline, Check-in
│   │   │       └── messages/route.ts   # Chat history, Post message (participant-only)
│   │   ├── lobbies/                    # Backward-compatibility alias to /api/meetups
│   │   └── users/
│   │       ├── route.ts                # User registration/auth actions
│   │       └── profile/route.ts        # GET, PUT user profile
│   ├── globals.css                     # Global styles, token definitions, 44px ergonomics
│   ├── layout.tsx                      # Root layout with viewport metadata
│   └── page.tsx                        # Main application shell
├── components/
│   ├── AuthProfileModal.tsx            # Auth modal with official Apple SVG & Google
│   ├── BottomNav.tsx                   # Extracted shared bottom navigation
│   ├── CategoryIcon.tsx                # Activity category badge icons
│   ├── CreateLobbyModal.tsx            # Host creation modal with isolated co-host
│   ├── LobbyCard.tsx                   # Reusable meetup card
│   ├── MapRadar.tsx                    # Dynamic Leaflet radar view with pill markers
│   ├── RoomDetailModal.tsx             # Meetup details, live chat, arrival check-in
│   └── SeatBubbles.tsx                 # Participant seat avatars and status rings
├── lib/
│   ├── auth-guard.ts                   # Server-side auth and permission verifier
│   ├── db.ts                           # Pluggable repository (atomic file / Upstash Redis)
│   ├── geo.ts                          # Haversine distance and sorting logic
│   ├── seed.ts                         # Initial database seed data
│   └── types.ts                        # Zod schemas and TypeScript interfaces
└── __tests__/                          # Automated test suites
    ├── api/                            # API route contract tests
    ├── security/                       # Access control & permission tests
    ├── unit/                           # Geo, calculation, and schema tests
    └── a11y/                           # Accessibility & layout tests
```
