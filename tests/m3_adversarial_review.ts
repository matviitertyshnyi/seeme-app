import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

async function runM3AdversarialReview() {
  console.log('====================================================');
  console.log('M3 ADVERSARIAL REVIEW: FRONTEND INTEGRITY & ACCURACY');
  console.log('====================================================');

  const rootDir = process.cwd();

  // Test 1: Absolute absence of 'transtone' typo across the entire src directory
  console.log('\n--- 1. Verification of CSS Typo Elimination (transtone) ---');
  function scanDirForRegex(dir: string, regex: RegExp, extensions: string[]): string[] {
    const hits: string[] = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
      const fullPath = path.join(dir, f.name);
      if (f.isDirectory()) {
        hits.push(...scanDirForRegex(fullPath, regex, extensions));
      } else if (extensions.some((ext) => f.name.endsWith(ext))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (regex.test(content)) {
          hits.push(fullPath);
        }
      }
    }
    return hits;
  }

  const transtoneHits = scanDirForRegex(path.join(rootDir, 'src'), /transtone/i, ['.ts', '.tsx', '.css']);
  assert.strictEqual(
    transtoneHits.length,
    0,
    `Integrity violation: found 'transtone' typo in files: ${transtoneHits.join(', ')}`
  );
  console.log('✓ [PASS] Zero instances of "transtone" found in src/ (.ts, .tsx, .css)');

  // Test 2: Check ToastNotification centering and aria attributes
  console.log('\n--- 2. ToastNotification Structural & Accessibility Check ---');
  const toastCode = fs.readFileSync(path.join(rootDir, 'src/components/ToastNotification.tsx'), 'utf8');
  assert.ok(
    toastCode.includes('-translate-x-1/2'),
    'ToastNotification missing -translate-x-1/2 class'
  );
  assert.ok(
    toastCode.includes('role="status"'),
    'ToastNotification missing role="status"'
  );
  assert.ok(
    toastCode.includes('aria-live="polite"'),
    'ToastNotification missing aria-live="polite"'
  );
  console.log('✓ [PASS] ToastNotification correctly applies -translate-x-1/2 centering and accessibility attributes');

  // Test 3: Check ProfileView for interactive beacon toggle switch
  console.log('\n--- 3. ProfileView Beacon Toggle Control Check ---');
  const profileCode = fs.readFileSync(path.join(rootDir, 'src/components/ProfileView.tsx'), 'utf8');
  assert.ok(
    profileCode.includes('role="switch"'),
    'ProfileView missing role="switch" for beacon toggle'
  );
  assert.ok(
    profileCode.includes('aria-checked={isBeaconActive}'),
    'ProfileView missing aria-checked attribute for beacon switch'
  );
  assert.ok(
    profileCode.includes('onToggleBeacon'),
    'ProfileView missing onToggleBeacon handler integration'
  );
  assert.ok(
    profileCode.includes('Want-to-Play Radar Beacon'),
    'ProfileView missing Want-to-Play Radar Beacon heading'
  );
  console.log('✓ [PASS] ProfileView contains accessible Want-to-Play Radar Beacon toggle control');

  // Test 4: Check page.tsx handleToggleBeacon payload and headers
  console.log('\n--- 4. page.tsx handleToggleBeacon Contract Check ---');
  const pageCode = fs.readFileSync(path.join(rootDir, 'src/app/page.tsx'), 'utf8');
  assert.ok(
    pageCode.includes("action: 'TOGGLE_BEACON'"),
    "page.tsx handleToggleBeacon must send action: 'TOGGLE_BEACON'"
  );
  assert.ok(
    pageCode.includes('beacon: {'),
    'page.tsx handleToggleBeacon must send nested beacon object'
  );
  assert.ok(
    pageCode.includes("'x-user-id': activeUser.id"),
    'page.tsx handleToggleBeacon must send x-user-id header'
  );
  assert.ok(
    pageCode.includes('Authorization: `Bearer ${activeUser.id}`'),
    'page.tsx handleToggleBeacon must send Authorization header'
  );
  console.log('✓ [PASS] page.tsx handleToggleBeacon sends nested beacon payload and authentication headers');

  // Test 5: Verify modular decomposition imports and absence of monolithic markup in page.tsx
  console.log('\n--- 5. Modularization Decomposition Verification ---');
  const importedComponents = [
    'ToastNotification',
    'ExploreView',
    'ProfileView',
    'RadiusSelectorBottomSheet',
    'CategoryFilterBottomSheet',
    'CommunityPoliciesModal',
    'LanguageSelectorBottomSheet',
  ];
  for (const comp of importedComponents) {
    assert.ok(
      pageCode.includes(comp),
      `page.tsx must import and render modular component: ${comp}`
    );
    const compFile = path.join(rootDir, `src/components/${comp}.tsx`);
    assert.ok(
      fs.existsSync(compFile),
      `Component file does not exist: ${compFile}`
    );
    const compContent = fs.readFileSync(compFile, 'utf8');
    assert.ok(
      compContent.length > 500,
      `Component file appears empty or stubbed: ${compFile}`
    );
  }
  console.log('✓ [PASS] All 7 modularized components exist, contain non-trivial implementations, and are integrated into page.tsx');

  // Test 6: API Integration Test - TOGGLE_BEACON endpoint auth requirement and payload handling
  console.log('\n--- 6. API Integration: TOGGLE_BEACON Backend Contract Execution ---');
  const usersRoute = await import('../src/app/api/users/route');
  const { NextRequest } = await import('next/server');

  // 6.1: Reject unauthenticated TOGGLE_BEACON
  const unauthReq = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'TOGGLE_BEACON',
      userId: 'user-maya',
      beacon: { active: true, categories: ['Ping Pong'], radiusKm: 10 },
    }),
  });
  const unauthRes = await usersRoute.POST(unauthReq);
  assert.strictEqual(
    unauthRes.status,
    401,
    `Expected unauthenticated TOGGLE_BEACON to return 401, got ${unauthRes.status}`
  );
  console.log('✓ [PASS] Backend correctly rejects unauthenticated TOGGLE_BEACON with 401 Unauthorized');

  // 6.2: Accept authenticated TOGGLE_BEACON with nested beacon
  const authReq = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'user-maya',
      Authorization: 'Bearer user-maya',
    },
    body: JSON.stringify({
      action: 'TOGGLE_BEACON',
      userId: 'user-maya',
      beacon: {
        active: true,
        categories: ['Ping Pong', 'Chess'],
        radiusKm: 12,
        note: 'Reviewer test beacon broadcast',
      },
    }),
  });
  const authRes = await usersRoute.POST(authReq);
  assert.strictEqual(
    authRes.status,
    200,
    `Expected authenticated TOGGLE_BEACON to return 200, got ${authRes.status}`
  );
  const authData = await authRes.json();
  assert.ok(authData.personas, 'Response should contain personas list');
  const mayaPersona = authData.personas.find((p: any) => p.id === 'user-maya');
  assert.ok(mayaPersona, 'Maya persona must be present in response');
  assert.strictEqual(mayaPersona.beacon.active, true, 'Maya beacon active status must be true');
  assert.deepStrictEqual(mayaPersona.beacon.categories, ['Ping Pong', 'Chess'], 'Beacon categories must match');
  assert.strictEqual(mayaPersona.beacon.radiusKm, 12, 'Beacon radiusKm must match');
  assert.strictEqual(mayaPersona.beacon.note, 'Reviewer test beacon broadcast', 'Beacon note must match');
  console.log('✓ [PASS] Authenticated TOGGLE_BEACON succeeds and updates beacon state properly');

  // 6.3: Toggle off
  const authOffReq = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'user-maya',
      Authorization: 'Bearer user-maya',
    },
    body: JSON.stringify({
      action: 'TOGGLE_BEACON',
      userId: 'user-maya',
      beacon: {
        active: false,
        categories: ['Ping Pong'],
        radiusKm: 5,
        note: 'Turned off',
      },
    }),
  });
  const authOffRes = await usersRoute.POST(authOffReq);
  assert.strictEqual(authOffRes.status, 200);
  const authOffData = await authOffRes.json();
  const mayaOff = authOffData.personas.find((p: any) => p.id === 'user-maya');
  assert.strictEqual(mayaOff.beacon.active, false, 'Maya beacon active status must be toggled off');
  console.log('✓ [PASS] Authenticated TOGGLE_BEACON toggles beacon off cleanly');

  console.log('\n====================================================');
  console.log('ALL ADVERSARIAL M3 INTEGRITY TESTS PASSED (100%)');
  console.log('====================================================\n');
}

runM3AdversarialReview().catch((err) => {
  console.error('\n❌ M3 ADVERSARIAL TEST FAILED:', err);
  process.exit(1);
});
