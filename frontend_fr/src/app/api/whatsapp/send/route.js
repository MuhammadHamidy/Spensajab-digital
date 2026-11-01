import { NextResponse } from 'next/server';

const WA_API_URL = process.env.WA_API_URL || 'https://api.fonnte.com/send';
const WA_API_KEY = process.env.WA_API_KEY || 'BZ2ULnUerGn1T74V8Uu8';

export async function POST(request) {
  try {
    const body = await request.json();
    const { target, message } = body;

    if (!target || !message) {
      return NextResponse.json(
        { success: false, error: 'Nomor tujuan (target) dan pesan (message) wajib diisi' },
        { status: 400 }
      );
    }

    // Sanitize target phone number (remove non-digits, convert +62 to 62, 08xx to 628xx or keep clean digits)
    let cleanPhone = String(target).replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone;
    }

    console.log(`[WA Gateway API] Sending to ${cleanPhone} via ${WA_API_URL}`);

    const response = await fetch(WA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: WA_API_KEY,
      },
      body: JSON.stringify({
        target: cleanPhone,
        message,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.status === false) {
      console.error('[WA Gateway API Error]', data);
      return NextResponse.json(
        {
          success: false,
          error: data.reason || data.message || 'Gagal mengirim pesan WhatsApp via Fonnte Gateway.',
          details: data,
        },
        { status: 502 }
      );
    }

    console.log(`[WA Gateway API Success] Sent to ${cleanPhone}:`, data);
    return NextResponse.json({
      success: true,
      message: 'Pesan WhatsApp berhasil dikirim',
      data,
    });
  } catch (err) {
    console.error('[WA Gateway Server Error]', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan server saat mengirim WhatsApp' },
      { status: 500 }
    );
  }
}
