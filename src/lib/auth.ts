import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { one, run } from '@/lib/db';

export const SESSION_COOKIE = 'opac_session';
const SESSION_DAYS = 30;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: 'member' | 'librarian' | 'admin';
  member_no: string | null;
  status: string;
  max_loans: number;
};

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  run('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)', [
    token,
    userId,
    expires.toISOString(),
  ]);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) run('DELETE FROM sessions WHERE token = ?', [token]);
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const user = one<SessionUser & { expires_at: string }>(
    `SELECT u.id, u.name, u.email, u.role, u.member_no, u.status, u.max_loans, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    [token],
  );

  if (!user) return null;
  if (new Date(user.expires_at) < new Date()) {
    run('DELETE FROM sessions WHERE token = ?', [token]);
    return null;
  }
  return user;
}

export async function requireUser(nextPath = '/akun') {
  const user = await getCurrentUser();
  if (!user) redirect(`/akun/masuk?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect('/akun/masuk?next=%2Fadmin');
  if (user.role !== 'admin' && user.role !== 'librarian') redirect('/akun');
  return user;
}
