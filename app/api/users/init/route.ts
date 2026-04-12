import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { adminDb } from '@/lib/firebase-admin';
import { grantSignupBonus } from '@/lib/credits';

export const runtime = 'nodejs';
export const maxDuration = 10;

/**
 * First-touch initializer. Called by AuthProvider whenever a user signs in
 * (including repeat sign-ins after page refresh). Creates the user doc on
 * the fly if it's missing and grants the free-first-book signup bonus the
 * first time it's called — subsequent calls are idempotent via the
 * `signupBonusGranted` flag on the user doc.
 *
 * Returns the current credit balance and whether a grant just happened so
 * the client can show a "first book is free" toast if it wants to.
 */
export async function POST(request: Request) {
  let user;
  try {
    user = await requireAuth(request);
  } catch (res) {
    return res as Response;
  }

  try {
    const result = await grantSignupBonus(adminDb(), user.uid, {
      email: user.email ?? null,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'init_failed' },
      { status: 500 },
    );
  }
}
