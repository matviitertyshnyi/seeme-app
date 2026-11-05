import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { GET as googleInitGet } from '../src/app/api/auth/google/route';
import { GET as googleCallbackGet } from '../src/app/api/auth/callback/google/route';
import { GET as appleInitGet } from '../src/app/api/auth/apple/route';
import { POST as appleCallbackPost, GET as appleCallbackGet } from '../src/app/api/auth/callback/apple/route';
import { readDb } from '../src/lib/db';

async function runOAuthTests() {
  console.log('=== STARTING NATIVE OAUTH & APPLE ID INTEGRATION TESTS ===\n');

  // Test 1: GET /api/auth/google initiation
  {
    console.log('[TEST 1] Initiating Google OAuth flow...');
    const req = new NextRequest('http://localhost:3000/api/auth/google');
    const res = await googleInitGet(req);
    assert(
      res.status === 307 || res.status === 302,
      `GET /api/auth/google should return redirect (got ${res.status})`
    );
    const location = res.headers.get('location') || '';
    assert(
      location.includes('callback/google') || location.includes('accounts.google.com'),
      `Google init redirects to auth url or mock callback (got ${location})`
    );
    console.log('  ✓ Google OAuth initiation returns valid redirect:', location);
  }

  // Test 2: GET /api/auth/callback/google
  {
    console.log('\n[TEST 2] Processing Google OAuth callback...');
    const req = new NextRequest('http://localhost:3000/api/auth/callback/google?mock=true');
    const res = await googleCallbackGet(req);
    assert(
      res.status === 307 || res.status === 302,
      `Google callback should return redirect (got ${res.status})`
    );
    const location = res.headers.get('location') || '';
    assert(location.includes('auth=success'), `Redirects to homepage with auth=success (got ${location})`);

    const setCookie = res.headers.get('set-cookie') || '';
    assert(
      setCookie.includes('leavetheroom_session='),
      'Google callback sets leavetheroom_session cookie'
    );
    console.log('  ✓ Google callback successfully provisioned persona and set session cookie');
  }

  // Test 3: GET /api/auth/apple initiation
  {
    console.log('\n[TEST 3] Initiating Apple Sign-In flow...');
    const req = new NextRequest('http://localhost:3000/api/auth/apple');
    const res = await appleInitGet(req);
    assert(
      res.status === 307 || res.status === 302,
      `GET /api/auth/apple should return redirect (got ${res.status})`
    );
    const location = res.headers.get('location') || '';
    assert(
      location.includes('callback/apple') || location.includes('appleid.apple.com'),
      `Apple init redirects to auth url or mock callback (got ${location})`
    );
    console.log('  ✓ Apple Sign-In initiation returns valid redirect:', location);
  }

  // Test 4: POST /api/auth/callback/apple (form_post)
  {
    console.log('\n[TEST 4] Processing Apple Sign-In POST callback (form_post)...');
    const formData = new FormData();
    formData.append('user', JSON.stringify({ name: { firstName: 'Sam', lastName: 'Taylor' } }));
    const req = new NextRequest('http://localhost:3000/api/auth/callback/apple', {
      method: 'POST',
      body: formData,
    });
    const res = await appleCallbackPost(req);
    assert(
      res.status === 307 || res.status === 302,
      `Apple callback should return redirect (got ${res.status})`
    );
    const location = res.headers.get('location') || '';
    assert(location.includes('auth=success'), `Redirects to homepage with auth=success (got ${location})`);

    const setCookie = res.headers.get('set-cookie') || '';
    assert(
      setCookie.includes('leavetheroom_session='),
      'Apple callback sets leavetheroom_session cookie'
    );
    console.log('  ✓ Apple form_post callback successfully provisioned persona and set session cookie');
  }

  // Test 5: Check database for provisioned verified users
  {
    console.log('\n[TEST 5] Verifying database persistence for OAuth accounts...');
    const db = await readDb();
    const googleUser = db.personas.find((p) => p.authProvider === 'google');
    const appleUser = db.personas.find((p) => p.authProvider === 'apple');
    assert(googleUser, 'Database contains provisioned Google persona');
    assert(googleUser.verified === true, 'Google persona is marked verified');
    assert(appleUser, 'Database contains provisioned Apple persona');
    assert(appleUser.verified === true, 'Apple persona is marked verified');
    console.log('  ✓ OAuth personas are verified members in database persistence');
  }

  console.log('\n=== ALL OAUTH & APPLE ID TESTS PASSED SUCCESSFULLY! ===\n');
}

runOAuthTests().catch((err) => {
  console.error('OAuth test failure:', err);
  process.exit(1);
});
