# SeeMe — Real-Life Activity Meetups Near You

**SeeMe** is a mobile-first, full-stack social matchmaking web application for spontaneous real-life (IRL) activity meetups — including over-the-board Chess, 1v1 Ping Pong, Tennis, Board Games, Basketball, Run Club, Coffee, and Co-work.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser. Zero external database setup or API keys are required.

## Core Design & Architecture

1. **SeeMe Brand Identity & Standardized Status System**:
   - Clean Indigo (`#4F46E5`) & Slate (`#0F172A`) light-mode design with a radar compass mark (`Compass` icon).
   - **Standardized Status Colors**:
     - **Green (`LIVE NOW`)**: Meetups happening right now.
     - **Yellow/Amber (`UPCOMING`)**: Meetups starting in 25m–1h.
     - **Red/Rose (`FINISHED / FULL`)**: Completed sessions or full capacity.
   - **Skill-Level Badges on Player Avatars**: Every circular player seat bubble (`SeatBubbles`) displays the participant's skill badge (`1550 Elo`, `Adv Pong`, `3.5 NTRP`, `5:00/km`, `Casual`) rather than names only.

2. **Mobile-First Information Hierarchy**:
   - Compact top bar with a collapsible **Switch Demo Profile** selector (Maya, Liam, Elena, Marcus) so the feed is immediately visible above the fold on phone viewports.
   - **Clear Separation of Joined vs. Available Meetups**:
     - **Available Meetups to Join** are presented first with open seat indicators and a standardized Indigo `Join Meetup` / `Request Spot` button.
     - **Meetups You Are In** feature a distinct emerald ring (`ring-2 ring-emerald-500`), a `YOU ARE HOSTING / JOINED` banner, an emerald `Open Chat` CTA, and dedicated activity-category filters in the `My Meetups` view.
   - **Unified Mobile Bottom Navigation**: Single navigation bar (`Explore`, `Cards`, `+ Host`, `Map`, `My Meetups`) without redundant view switchers or duplicate Host buttons.
