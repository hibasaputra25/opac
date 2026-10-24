'use server';

import { redirect } from 'next/navigation';
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from '@/lib/auth';
import { one, run } from '@/lib/db';

export type AuthState = { error?: string } | null;

/** Halaman tujuan setelah masuk, berdasarkan peran pengguna. */
function homeForRole() {
  return '/akun';
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') ? next : '/akun';
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));

  if (!email || !password) return { error: 'Email dan kata sandi wajib diisi.' };

  const user = one<{ id: number; password_hash: string; status: string; role: string }>(
    'SELECT id, password_hash, status, role FROM users WHERE lower(email) = ?',
    [email],
  );

  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: 'Email atau kata sandi tidak sesuai.' };
  }
  if (user.status !== 'active') {
    return { error: 'Akun Anda tidak aktif. Hubungi petugas perpustakaan.' };
  }

  await createSession(user.id);
  redirect(user.role === 'member' ? next : homeForRole());
}

export async function register(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  const memberNo = String(formData.get('member_no') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const program = String(formData.get('program') ?? '').trim();

  if (!name || !email || !password) return { error: 'Nama, email, dan kata sandi wajib diisi.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Format email tidak valid.' };
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.' };
  if (password !== confirm) return { error: 'Konfirmasi kata sandi tidak sama.' };

  const exists = one('SELECT 1 FROM users WHERE lower(email) = ?', [email]);
  if (exists) return { error: 'Email sudah terdaftar. Silakan masuk.' };

  if (memberNo) {
    const dup = one('SELECT 1 FROM users WHERE member_no = ?', [memberNo]);
    if (dup) return { error: 'Nomor anggota sudah digunakan.' };
  }

  const row = one<{ id: number }>(
    `INSERT INTO users (name, email, password_hash, role, member_no, phone, program)
     VALUES (?, ?, ?, 'member', ?, ?, ?) RETURNING id`,
    [name, email, hashPassword(password), memberNo || null, phone || null, program || null],
  );

  await createSession(row!.id);
  redirect('/akun');
}

export async function logout() {
  await destroySession();
  redirect('/');
}

export type ProfileState = { error?: string; success?: string } | null;

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' };

  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  const program = String(formData.get('program') ?? '').trim();

  if (!name) return { error: 'Nama tidak boleh kosong.' };

  run('UPDATE users SET name = ?, phone = ?, address = ?, program = ? WHERE id = ?', [
    name,
    phone || null,
    address || null,
    program || null,
    user.id,
  ]);

  return { success: 'Profil berhasil diperbarui.' };
}

export async function changePassword(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sesi berakhir. Silakan masuk kembali.' };

  const current = String(formData.get('current') ?? '');
  const next = String(formData.get('next') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  const row = one<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [
    user.id,
  ]);
  if (!row || !verifyPassword(current, row.password_hash)) {
    return { error: 'Kata sandi saat ini salah.' };
  }
  if (next.length < 8) return { error: 'Kata sandi baru minimal 8 karakter.' };
  if (next !== confirm) return { error: 'Konfirmasi kata sandi tidak sama.' };

  run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(next), user.id]);
  return { success: 'Kata sandi berhasil diubah.' };
}

export async function submitBookRequest(
  _prev: { error?: string; success?: string } | null,
  formData: FormData,
) {
  const user = await getCurrentUser();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'Judul buku wajib diisi.' };

  run(
    `INSERT INTO book_requests (user_id, title, author, publisher, isbn, year, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      user?.id ?? null,
      title,
      String(formData.get('author') ?? '').trim() || null,
      String(formData.get('publisher') ?? '').trim() || null,
      String(formData.get('isbn') ?? '').trim() || null,
      Number(formData.get('year')) || null,
      String(formData.get('reason') ?? '').trim() || null,
    ],
  );

  return { success: 'Terima kasih! Usulan Anda sudah kami terima.' };
}
