/**
 * Admin Access Control
 *
 * Provides utilities for checking if a user has admin access.
 * Admin emails are configured in ADMIN_EMAILS environment variable.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * Checks if the given email is in the admin list
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  return adminEmails.includes(email);
}

/**
 * Checks if the current user session has admin access
 * Returns the session if user is admin, null otherwise
 */
export async function checkAdminAccess() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return null;
  }

  if (!isAdminEmail(session.user.email)) {
    return null;
  }

  return session;
}

/**
 * Gets admin emails list from environment
 */
export function getAdminEmails(): string[] {
  return process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
}
