import { getSessionUser, SessionUser } from './session';
import { UserRole } from './types';

export class AuthError extends Error {
  constructor(public code: 'UNAUTHENTICATED' | 'FORBIDDEN') {
    super(code === 'UNAUTHENTICATED' ? 'Not logged in.' : 'Access denied.');
  }
}

/**
 * Verify the session cookie server-side.
 * Call this at the top of every server action that touches data.
 *
 * @param allowedRoles  If provided, also checks the user's role.
 * @returns             The verified session user.
 * @throws AuthError    If the cookie is missing, invalid, or the role is wrong.
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) throw new AuthError('UNAUTHENTICATED');

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new AuthError('FORBIDDEN');
  }

  return user;
}

/**
 * Convenience wrappers for common role checks.
 */
export const requireAdmin        = () => requireAuth(['admin']);
export const requireFacultyAdmin = () => requireAuth(['faculty_admin']);
export const requireAnyFaculty   = () => requireAuth(['faculty', 'faculty_admin', 'admin']);
