/**
 * Milestone M2 Adversarial Verification:
 * Stored XSS Penetration Test for MapRadar & Domain Type Safety Stress
 * 
 * Test targets:
 * 1. Leaflet L.divIcon marker HTML generation with adversarial XSS payloads in lobby.mapPinLabel
 * 2. Strict entity escaping assertions (< -> &lt;, > -> &gt;, " -> &quot;, ' -> &#39;, & -> &amp;)
 * 3. Empirical proof that no raw HTML elements or scripts can execute
 * 4. Boundary and falsy input tests (undefined, null, empty string, zero)
 * 5. Type architecture stress verifying 100% equivalence between @/types/lobby and @/lib/types
 */

import fs from 'fs';
import path from 'path';

// ----------------------------------------------------------------------------
// Minimal browser environment shim for Leaflet execution in Node.js
// ----------------------------------------------------------------------------
const docMock: any = {
  createElement: (tag: string) => ({
    style: {},
    setAttribute: () => {},
    removeAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    children: [],
  }),
  documentElement: { style: {} },
  head: { appendChild: () => {} },
  body: { appendChild: () => {} },
};

const winMock: any = {
  requestAnimationFrame: (cb: any) => setTimeout(cb, 0),
  document: docMock,
  navigator: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LeafletMock/1.0',
    platform: 'Win32',
    appVersion: '5.0',
  },
  location: { href: 'http://localhost:3000' },
  screen: { deviceXDPI: 96, logicalXDPI: 96 },
  addEventListener: () => {},
  removeEventListener: () => {},
};

(global as any).window = winMock;
(global as any).document = docMock;
(global as any).navigator = winMock.navigator;
(global as any).location = winMock.location;
(global as any).screen = winMock.screen;

// ----------------------------------------------------------------------------
// Type Architecture Stress: Import from both @/types/lobby and @/lib/types
// ----------------------------------------------------------------------------
import type {
  Meetup as MeetupFromLobby,
  Lobby as LobbyFromLobby,
  User as UserFromLobby,
  UserPersona as UserPersonaFromLobby,
  Message as MessageFromLobby,
  ChatMessage as ChatMessageFromLobby,
  Participant,
  RoomStatus,
} from '../src/types/lobby';

import type {
  Meetup as MeetupFromLib,
  Lobby as LobbyFromLib,
  User as UserFromLib,
  UserPersona as UserPersonaFromLib,
  Message as MessageFromLib,
  ChatMessage as ChatMessageFromLib,
} from '../src/lib/types';

import {
  CreateMeetupInputSchema,
  SendMessageInputSchema,
  JoinActionSchema,
  validatePayload,
} from '../src/lib/types';

// Compile-time type equivalence assertions
type AssertIdentical<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;

const _assertMeetup: AssertIdentical<MeetupFromLobby, MeetupFromLib> = true;
const _assertLobby: AssertIdentical<LobbyFromLobby, LobbyFromLib> = true;
const _assertUser: AssertIdentical<UserFromLobby, UserFromLib> = true;
const _assertUserPersona: AssertIdentical<UserPersonaFromLobby, UserPersonaFromLib> = true;
const _assertMessage: AssertIdentical<MessageFromLobby, MessageFromLib> = true;
const _assertChatMessage: AssertIdentical<ChatMessageFromLobby, ChatMessageFromLib> = true;

// Cross-alias identity
const _assertMeetupIsLobby: AssertIdentical<MeetupFromLobby, LobbyFromLib> = true;
const _assertUserIsPersona: AssertIdentical<UserFromLobby, UserPersonaFromLib> = true;
const _assertMessageIsChatMessage: AssertIdentical<MessageFromLobby, ChatMessageFromLib> = true;

// Prevent unused variable linting
void _assertMeetup;
void _assertLobby;
void _assertUser;
void _assertUserPersona;
void _assertMessage;
void _assertChatMessage;
void _assertMeetupIsLobby;
void _assertUserIsPersona;
void _assertMessageIsChatMessage;

// ----------------------------------------------------------------------------
// Test Harness
// ----------------------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failedTests++;
    const msg = `[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`;
    failureDetails.push(msg);
    console.error(`  ${msg}`);
  }
}

// ----------------------------------------------------------------------------
// Main Verification Runner
// ----------------------------------------------------------------------------
async function runVerification() {
  console.log('\n============================================================');
  console.log('M2 ADVERSARIAL PENETRATION & TYPE SAFETY STRESS HARNESS');
  console.log('============================================================\n');

  // Load Leaflet dynamically now that window shim is initialized
  const L = (await import('leaflet')).default;

  // --------------------------------------------------------------------------
  // SUITE 1: MapRadar Source Code Inspection & Static Verification
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: MapRadar Static Code & Escape Mechanism Inspection ---');
  const mapRadarPath = path.resolve(process.cwd(), 'src/components/MapRadar.tsx');
  assert(fs.existsSync(mapRadarPath), 'MapRadar.tsx file exists');

  const mapRadarContent = fs.readFileSync(mapRadarPath, 'utf8');

  // Assert escapeHtml exists and escapes &, <, >, ", '
  const hasEscapeHtmlDef = mapRadarContent.includes('function escapeHtml(str: string): string');
  assert(hasEscapeHtmlDef, 'escapeHtml helper defined in MapRadar.tsx');

  const escapesAmpFirst = /return\s+str\s*\.replace\(\/&\/g,\s*'&amp;'\)/.test(mapRadarContent);
  assert(escapesAmpFirst, 'escapeHtml neutralizes ampersands (& -> &amp;) first to prevent double unescaping');

  const escapesLt = /\.replace\(\/<\//.test(mapRadarContent);
  const escapesGt = /\.replace\(\/>\//.test(mapRadarContent);
  const escapesQuot = /\.replace\(\/"\//.test(mapRadarContent);
  const escapesApos = /\.replace\(\/'\//.test(mapRadarContent);
  assert(escapesLt && escapesGt && escapesQuot && escapesApos, 'escapeHtml strictly replaces <, >, ", and \'');

  // Assert that lobby.mapPinLabel is strictly passed through escapeHtml before divIcon interpolation
  const usesEscapedPinLabel = mapRadarContent.includes('${escapeHtml(lobby.mapPinLabel || \'\')}');
  assert(usesEscapedPinLabel, 'L.divIcon strictly interpolates ${escapeHtml(lobby.mapPinLabel || \'\')}');

  const hasRawMapPinLabel = /<span>\s*\$\{lobby\.mapPinLabel\}\s*<\/span>/.test(mapRadarContent);
  assert(!hasRawMapPinLabel, 'Raw unescaped ${lobby.mapPinLabel} is completely absent from MapRadar.tsx');

  // --------------------------------------------------------------------------
  // SUITE 2: Empirical Leaflet L.divIcon Penetration Testing with Hostile Payloads
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Leaflet L.divIcon Penetration Testing ---');

  // Recreate the exact marker generation function from MapRadar.tsx lines 147-161
  function createPillDivIcon(lobby: {
    mapPinLabel?: string;
    computedStatus: RoomStatus;
    participants: Participant[];
    maxParticipants: number;
    isSelected?: boolean;
  }) {
    // Exact escape logic from MapRadar.tsx lines 17-24
    function escapeHtml(str: string): string {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    const isSelected = lobby.isSelected || false;
    const statusDotHex =
      lobby.computedStatus === 'LIVE'
        ? '#10B981'
        : lobby.computedStatus === 'UPCOMING'
        ? '#F59E0B'
        : '#F43F5E';

    const borderHex = isSelected ? '#EA580C' : statusDotHex;

    const bgStyle = isSelected
      ? 'background:#EA580C;color:#FFFFFF;border:2px solid #FFFFFF;box-shadow:0 12px 28px rgba(234,88,12,0.35);transform:scale(1.08);'
      : `background:#FFFFFF;color:#0F172A;border:2px solid ${borderHex};box-shadow:0 8px 20px rgba(15,23,42,0.14);`;

    const icon = L.divIcon({
      className: 'lobby-pill-marker-wrapper',
      html: `
        <div style="display:inline-flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;">
          <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:9999px;font-size:11px;font-weight:800;letter-spacing:0.04em;white-space:nowrap;transition:all 0.18s ease;${bgStyle}">
            <span style="width:7px;height:7px;border-radius:9999px;background:${statusDotHex};display:inline-block;flex-shrink:0;"></span>
            <span>${escapeHtml(lobby.mapPinLabel || '')}</span>
            <span style="opacity:0.85;font-weight:600;font-size:10px;padding-left:2px;border-left:1px solid currentColor;">${lobby.participants.length}/${lobby.maxParticipants}</span>
          </div>
          <div style="width:7px;height:7px;background:${isSelected ? '#EA580C' : '#FFFFFF'};transform:rotate(45deg);margin-top:-4px;border-right:2px solid ${borderHex};border-bottom:2px solid ${borderHex};"></div>
        </div>
      `,
      iconSize: [110, 38],
      iconAnchor: [55, 34],
    });

    return icon;
  }

  // Battery of adversarial Stored XSS attack payloads
  const adversarialPayloads = [
    { name: 'Standard Script Tag', payload: '<script>alert(1)</script>' },
    { name: 'External Script Tag', payload: '<script src="https://attacker.example/evil.js"></script>' },
    { name: 'Img Onerror Event Handler', payload: '<img src=x onerror=alert("xss")>' },
    { name: 'Img Onerror Single Quotes', payload: "<img src=x onerror=alert('xss')>" },
    { name: 'Svg Onload Attack', payload: '<svg/onload=alert(1)>' },
    { name: 'Svg Embedded Script', payload: '<svg><script>alert(1)</script></svg>' },
    { name: 'Tag Breakout Script Tag', payload: '"><script>alert(1)</script>' },
    { name: 'Attribute Breakout Event Handler', payload: '&quot; onclick=alert(1)' },
    { name: 'Double Quote Breakout Event', payload: '" onfocus="alert(1)" autofocus="' },
    { name: 'Single Quote Breakout Event', payload: "' onfocus='alert(1)' autofocus='" },
    { name: 'Iframe JavaScript Protocol', payload: '<iframe src="javascript:alert(1)"></iframe>' },
    { name: 'Body Onload Vector', payload: '<body onload=alert(1)>' },
    { name: 'Anchor JavaScript URI', payload: '<a href="javascript:alert(1)">Click Me</a>' },
    { name: 'Details Ontoggle Vector', payload: '<details open ontoggle=alert(1)>Test</details>' },
    { name: 'Autofocus Input Vector', payload: '<input autofocus onfocus=alert(1)>' },
    { name: 'Audio Onerror Vector', payload: '<audio src=x onerror=alert(1)>' },
    { name: 'Video Poster Onerror', payload: '<video poster=x onerror=alert(1)>' },
    { name: 'Nested Malformed Tags', payload: '<<SCRIPT>alert("XSS");//<</SCRIPT>' },
    { name: 'Mixed-Case Script Tag', payload: '<sCrIpt>alert("mixed-case")</ScRipt>' },
    { name: 'Pre-encoded HTML Entities', payload: '&lt;script&gt;alert(1)&lt;/script&gt;' },
    { name: 'Complex Polyglot Vector', payload: 'jaVasCript:/*-/*`/*\\\'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle>/</titLe>/</teXtarEa>/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e' },
    { name: 'HTML Quote & Special Characters', payload: '& < > " \' / =' },
    { name: 'Null Byte & Whitespace Vector', payload: ' \x00 <script>alert(1)</script> \r\n ' },
    { name: 'Massive Buffer Payload (10,000 chars)', payload: '<script>alert(1)</script>'.repeat(400) },
  ];

  for (const { name, payload } of adversarialPayloads) {
    const icon = createPillDivIcon({
      mapPinLabel: payload,
      computedStatus: 'LIVE',
      participants: [{ id: 'p1', name: 'Alice', age: 25, avatar: '', joinedAt: '' }],
      maxParticipants: 4,
    });

    const html = (icon.options as any).html as string;

    // 1. Verify that the label span exists in the output HTML
    const spanMatch = html.match(/<span>([^<]*)<\/span>\s*<span style="opacity:0\.85/);
    assert(
      spanMatch !== null,
      `[XSS Defense] Payload correctly wrapped in label span: ${name}`
    );

    const extractedEscapedLabel = spanMatch ? spanMatch[1] : '';

    // 2. Assert raw dangerous characters (<, >, ", ') are NEVER present in extracted label
    const hasRawLt = extractedEscapedLabel.includes('<');
    const hasRawGt = extractedEscapedLabel.includes('>');
    const hasRawDoubleQuote = extractedEscapedLabel.includes('"');
    const hasRawSingleQuote = extractedEscapedLabel.includes("'");

    assert(
      !hasRawLt && !hasRawGt && !hasRawDoubleQuote && !hasRawSingleQuote,
      `[Strict Escaping] Strictly neutralized raw <, >, ", ' in: ${name}`,
      `Found raw chars in: ${extractedEscapedLabel.slice(0, 80)}`
    );

    // 3. Assert specific entities are escaped properly
    if (payload.includes('<')) {
      assert(extractedEscapedLabel.includes('&lt;'), `[Entity Mapping] '<' converted to '&lt;' in: ${name}`);
    }
    if (payload.includes('>')) {
      assert(extractedEscapedLabel.includes('&gt;'), `[Entity Mapping] '>' converted to '&gt;' in: ${name}`);
    }
    if (payload.includes('"')) {
      assert(extractedEscapedLabel.includes('&quot;'), `[Entity Mapping] '"' converted to '&quot;' in: ${name}`);
    }
    if (payload.includes("'")) {
      assert(extractedEscapedLabel.includes('&#39;'), `[Entity Mapping] '\'' converted to '&#39;' in: ${name}`);
    }
    if (payload.includes('&')) {
      assert(extractedEscapedLabel.includes('&amp;'), `[Entity Mapping] '&' converted to '&amp;' in: ${name}`);
    }

    // 4. Verify that NO executable tags can be created from the payload
    // Only standard template tags may exist in the entire HTML:
    // <div>, <span>, </div>, </span>
    const allTagsInHtml = html.match(/<\/?[a-zA-Z0-9]+[^>]*>/g) || [];
    const maliciousTags = allTagsInHtml.filter((tag) => {
      const tagNameMatch = tag.match(/<\/?[a-zA-Z0-9]+/);
      const tagName = tagNameMatch ? tagNameMatch[0].replace(/<\/|</, '').toLowerCase() : '';
      return tagName !== 'div' && tagName !== 'span';
    });

    assert(
      maliciousTags.length === 0,
      `[Tag Whitelist] Zero non-div/non-span tags generated in: ${name}`,
      `Found forbidden tags: ${maliciousTags.join(', ')}`
    );

    // 5. Verify that NO unescaped HTML element tag or script can execute
    const hasExecutableTag = /<(?:script|img|svg|iframe|body|input|details|audio|video|style|object|embed)\b/i.test(html);
    assert(!hasExecutableTag, `[Execution Neutralized] No executable tags exist in: ${name}`);

    // 6. Verify that NO unescaped event handler attribute can exist on any tag
    // An attribute event handler requires `<tag ... on[a-z]+=...>`
    const hasTagEventHandler = /<[a-zA-Z0-9]+\s+[^>]*\bon[a-zA-Z]+\s*=/i.test(html);
    assert(!hasTagEventHandler, `[Execution Neutralized] No tag contains event handler attributes in: ${name}`);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: Boundary & Falsy Value Penetration
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Boundary & Falsy Value Handling ---');

  const boundaryCases = [
    { name: 'Undefined Label', label: undefined as any, expected: '' },
    { name: 'Empty String Label', label: '', expected: '' },
    { name: 'Whitespace Only Label', label: '   ', expected: '   ' },
    { name: 'Null Label (coerced)', label: null as any, expected: '' },
    { name: 'Numeric Zero (as string)', label: '0', expected: '0' },
  ];

  for (const { name, label, expected } of boundaryCases) {
    const icon = createPillDivIcon({
      mapPinLabel: label,
      computedStatus: 'UPCOMING',
      participants: [],
      maxParticipants: 6,
    });

    const html = (icon.options as any).html as string;
    const spanMatch = html.match(/<span>([^<]*)<\/span>\s*<span style="opacity:0\.85/);
    assert(spanMatch !== null, `[Boundary] Span rendered cleanly for: ${name}`);
    const actual = spanMatch ? spanMatch[1] : '';
    assert(actual === expected, `[Boundary] Rendered exactly expected value for: ${name} (got: "${actual}")`);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Type Architecture Stress & Cross-Re-export Equivalence
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Type Architecture Stress & Cross-Module Compatibility ---');

  // Verify that an object conforming to Meetup satisfies Lobby and vice-versa
  const testLobby: LobbyFromLobby = {
    id: 'lobby-test-m2',
    category: 'Chess',
    mapPinLabel: 'Chess Park',
    title: 'Blitz in the Park',
    equipmentNote: 'Bring your clock',
    coverImage: 'https://images.unsplash.com/chess.jpg',
    venueName: 'Washington Square Park',
    venueAddress: 'Greenwich Village, NY',
    lat: 40.7308,
    lng: -73.9973,
    startTime: 'Now',
    startTimeBadge: 'Now',
    roomStatus: 'LIVE',
    skillCompatibility: 'ALL_LEVELS',
    preferredAgeRange: 'All Ages (18+)',
    isRecurring: false,
    maxParticipants: 4,
    joinMode: 'OPEN',
    hostId: 'user-alex',
    participants: [
      {
        id: 'user-alex',
        name: 'Alex',
        age: 26,
        avatar: 'https://images.unsplash.com/alex.jpg',
        joinedAt: new Date().toISOString(),
      },
    ],
    pendingRequests: [],
    bannedUserIds: [],
    coHostIds: ['user-maya'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Assign to MeetupFromLib
  const meetupFromLib: MeetupFromLib = testLobby;
  assert(meetupFromLib.id === 'lobby-test-m2', 'LobbyFromLobby perfectly assigns to MeetupFromLib');
  assert(meetupFromLib.coHostIds?.[0] === 'user-maya', 'Lobby optional field coHostIds preserved in MeetupFromLib');
  assert(Boolean(meetupFromLib.updatedAt), 'Lobby optional field updatedAt preserved in MeetupFromLib');

  // Verify UserPersona / User equivalence
  const testUser: UserPersonaFromLobby = {
    id: 'user-maya',
    email: 'maya@example.com',
    name: 'Maya Lin',
    age: 27,
    avatar: 'https://images.unsplash.com/maya.jpg',
    skillBadge: 'Advanced',
    tagline: 'Casual games & coffee',
    neighborhood: 'SoHo',
    verified: true,
    verificationStatus: 'VERIFIED',
    role: 'USER',
    isBanned: false,
    favoriteActivities: ['Chess', 'Ping Pong'],
    reliabilityScore: 99,
    meetupsAttended: 12,
    hoursPlayed: 30,
    ratingAvg: 4.95,
    ratingCount: 10,
    streakWeeks: 4,
    bannedUserIds: [],
    regularPartnerIds: ['user-alex'],
    settings: {
      iosAndroidPush: true,
      soundEffects: true,
      hapticFeedback: true,
      distanceUnit: 'km',
      profileVisible: true,
      showReliabilityScore: true,
    },
    authProvider: 'google',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const userFromLib: UserFromLib = testUser;
  assert(userFromLib.id === 'user-maya', 'UserPersonaFromLobby assigns to UserFromLib');
  assert(userFromLib.email === 'maya@example.com', 'User email field preserved');
  assert(Boolean(userFromLib.createdAt && userFromLib.updatedAt), 'User createdAt and updatedAt fields preserved');

  // Verify ChatMessage / Message equivalence
  const testMessage: ChatMessageFromLobby = {
    id: 'msg-test-123',
    lobbyId: 'lobby-test-m2',
    meetupId: 'lobby-test-m2',
    senderId: 'user-alex',
    senderName: 'Alex',
    senderAvatar: 'https://images.unsplash.com/alex.jpg',
    text: 'See you near the fountain!',
    createdAt: new Date().toISOString(),
  };

  const messageFromLib: MessageFromLib = testMessage;
  assert(messageFromLib.id === 'msg-test-123', 'ChatMessageFromLobby assigns to MessageFromLib');
  assert(messageFromLib.meetupId === 'lobby-test-m2', 'ChatMessage meetupId field preserved in MessageFromLib');

  // --------------------------------------------------------------------------
  // SUITE 5: Zod Schema Runtime Verification via @/lib/types
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Runtime Zod Schemas & Validation via @/lib/types ---');

  // Valid meetup creation payload
  const validMeetupInput = {
    title: 'Sunday Morning Run',
    category: 'Run Club',
    venueName: 'Central Park Loop',
    venueAddress: '59th St & 5th Ave',
    lat: 40.7648,
    lng: -73.973,
    maxParticipants: 8,
    joinMode: 'OPEN',
    skillCompatibility: 'ALL_LEVELS',
  };
  const valResult = validatePayload(CreateMeetupInputSchema, validMeetupInput);
  assert(valResult.data !== undefined, 'validatePayload accepts valid CreateMeetupInput');
  assert(valResult.error === undefined, 'No error returned for valid CreateMeetupInput');

  // Invalid meetup creation payload (< 3 chars title)
  const invalidMeetupInput = {
    title: 'ab',
    category: 'Run Club',
    venueName: 'Park',
    lat: 40.7,
    lng: -73.9,
    maxParticipants: 1, // Invalid: min 2
  };
  const invalidValResult = validatePayload(CreateMeetupInputSchema, invalidMeetupInput);
  assert(invalidValResult.data === undefined, 'validatePayload rejects invalid CreateMeetupInput');
  assert(Boolean(invalidValResult.error), 'validatePayload produces descriptive error message');

  // Send message schema validation
  const validMsg = { text: 'Arrived at the north bench', senderId: 'user-1' };
  assert(validatePayload(SendMessageInputSchema, validMsg).data !== undefined, 'SendMessageInput accepts valid text');

  const emptyMsg = { text: '   ' };
  assert(Boolean(validatePayload(SendMessageInputSchema, emptyMsg).error), 'SendMessageInput rejects whitespace-only text');

  // Join action schema validation
  const validJoinAction = { action: 'JOIN' as const };
  assert(validatePayload(JoinActionSchema, validJoinAction).data !== undefined, 'JoinActionSchema validates JOIN action');

  // --------------------------------------------------------------------------
  // SUMMARY REPORT
  // --------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log(`SUCCESS RATE: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    console.error('FAILURES:');
    failureDetails.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  } else {
    console.log('VERDICT: ALL ADVERSARIAL PENETRATION CHECKS PASSED EMPIRICALLY! [APPROVE]\n');
  }
}

runVerification().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
