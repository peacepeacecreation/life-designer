/**
 * Admin Access Check API
 *
 * GET /api/admin/check-access - Check if current user has admin access
 */

import { NextResponse } from 'next/server';
import { checkAdminAccess } from '@/lib/admin/check-admin';

export const runtime = 'nodejs';
export const maxDuration = 5;

/**
 * GET /api/admin/check-access
 * Returns whether the current user has admin access
 */
export async function GET() {
  try {
    const session = await checkAdminAccess();

    return NextResponse.json({
      hasAccess: !!session,
      email: session?.user?.email || null,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/check-access:', error);
    return NextResponse.json(
      { hasAccess: false, email: null },
      { status: 200 } // Return 200 even on error, just with hasAccess: false
    );
  }
}
