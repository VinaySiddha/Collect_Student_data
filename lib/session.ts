import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { UserRole } from './types';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  college: string | null;
}

const COOKIE_NAME = 'gg_session';
const ALGORITHM   = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length !== 64) {
    throw new Error('SESSION_SECRET must be a 64-character hex string (32 bytes).');
  }
  return Buffer.from(secret, 'hex');
}

export function encryptSession(data: SessionUser): string {
  const key = getKey();
  const iv  = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const json    = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  const tag       = cipher.getAuthTag();
  // Layout: [16 bytes iv][16 bytes tag][encrypted payload]
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptSession(token: string): SessionUser | null {
  try {
    const key = getKey();
    const buf  = Buffer.from(token, 'base64url');
    if (buf.length < 33) return null;
    const iv        = buf.subarray(0, 16);
    const tag       = buf.subarray(16, 32);
    const encrypted = buf.subarray(32);
    const decipher  = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8')) as SessionUser;
  } catch {
    return null;
  }
}

/** Call from a server action to write the session cookie. */
export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token      = encryptSession(user);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   60 * 60 * 10, // 10 hours
  });
}

/** Call from a server action to clear the session cookie. */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** Read and verify the session from the request cookie. Returns null if missing/invalid. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return decryptSession(token);
  } catch {
    return null;
  }
}
