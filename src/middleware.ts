import { NextResponse, type NextRequest } from 'next/server';

/**
 * Beri setiap pengunjung anonim identitas cookie (UUID) agar rekomendasi
 * personal bekerja sejak kunjungan pertama. Cookie hanya di-set bila belum
 * ada — tidak menulis ulang setiap request.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get('opac_id')?.value) {
    response.cookies.set('opac_id', crypto.randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }

  return response;
}

export const config = {
  // Lewati aset statis & berkas internal Next.js.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo-.*\\.png).*)'],
};
