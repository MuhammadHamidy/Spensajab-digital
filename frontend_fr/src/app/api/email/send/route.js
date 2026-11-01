import tls from 'node:tls';
import { NextResponse } from 'next/server';

function sendSmtpEmail({ host, port, user, pass, from, to, subject, body }) {
  return new Promise((resolve, reject) => {
    const cleanPass = (pass || '').replace(/\s+/g, '');
    const socket = tls.connect(
      {
        host: host || 'smtp.gmail.com',
        port: port || 465,
        rejectUnauthorized: false,
        timeout: 15000,
      },
      () => {
        // Connected to TLS SMTP
      }
    );

    let step = 0;
    let logBuffer = [];

    const send = (cmd) => {
      socket.write(cmd + '\r\n');
    };

    socket.setEncoding('utf-8');

    socket.on('data', (data) => {
      const response = data.toString();
      logBuffer.push(response.trim());
      const code = parseInt(response.substring(0, 3), 10);

      // Check for error response codes
      if (code >= 400 && step < 8) {
        socket.end();
        return reject(new Error(`SMTP Error (${code}): ${response.trim()}`));
      }

      if (step === 0 && code === 220) {
        step = 1;
        send('EHLO localhost');
      } else if (step === 1 && code === 250) {
        step = 2;
        send('AUTH LOGIN');
      } else if (step === 2 && code === 334) {
        step = 3;
        send(Buffer.from(user).toString('base64'));
      } else if (step === 3 && code === 334) {
        step = 4;
        send(Buffer.from(cleanPass).toString('base64'));
      } else if (step === 4 && code === 235) {
        step = 5;
        send(`MAIL FROM:<${from || user}>`);
      } else if (step === 5 && code === 250) {
        step = 6;
        send(`RCPT TO:<${to}>`);
      } else if (step === 6 && code === 250) {
        step = 7;
        send('DATA');
      } else if (step === 7 && code === 354) {
        step = 8;
        const senderName = 'SMP Negeri 1 Jabon - Sistem Presensi';
        const rawMessage = [
          `From: ${senderName} <${from || user}>`,
          `To: <${to}>`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/plain; charset=UTF-8',
          '',
          body,
          '.',
        ].join('\r\n');
        send(rawMessage);
      } else if (step === 8 && code === 250) {
        step = 9;
        send('QUIT');
        resolve({ success: true, message: 'Email berhasil dikirim ke ' + to });
      }
    });

    socket.on('error', (err) => {
      reject(new Error('Koneksi SMTP Gagal: ' + err.message));
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Koneksi SMTP Timeout ke ' + (host || 'smtp.gmail.com')));
    });
  });
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { to, teacherName, username, password, courseNames, classCodes, type, newPassword } = data;

    if (!to) {
      return NextResponse.json({ success: false, error: 'Email tujuan wajib diisi.' }, { status: 400 });
    }

    const portalURL = process.env.APP_PORTAL_URL || 'http://localhost:3000/login';
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpUser = process.env.SMTP_USERNAME || 'hamidym83@gmail.com';
    const smtpPass = process.env.SMTP_PASSWORD || 'izjv gzwq cjzr eszu';
    const smtpFrom = process.env.SMTP_FROM || smtpUser;


    let subject = '';
    let body = '';

    if (type === 'reset_password') {
      subject = `Reset Password Akun Guru - ${teacherName || 'Bapak/Ibu Guru'}`;
      body = `Yth. Bapak/Ibu ${teacherName || 'Guru'},

Kami menginformasikan bahwa Administrator sekolah telah melakukan reset kata sandi (password) untuk akun Anda pada Portal Presensi SMP Negeri 1 Jabon.

Berikut informasi kredensial akun terbaru Anda:
--------------------------------------------------
URL Portal      : ${portalURL}
Username        : ${username}
Password Baru   : ${newPassword || password}
--------------------------------------------------

Seluruh riwayat absensi, sesi kelas, serta daftar mata pelajaran dan kelas yang Anda ampu tetap aman dan tidak terhapus.

Setelah login, Anda dapat mengubah kembali password ini pada menu "Profil Saya" demi menjaga privasi Anda.

Salam hangat,
SMP Negeri 1 Jabon - Sistem Presensi`;
    } else {
      const courseList = Array.isArray(courseNames) && courseNames.length > 0 ? courseNames.join(', ') : 'Belum diatur';
      const classList = Array.isArray(classCodes) && classCodes.length > 0 ? classCodes.join(', ') : 'Semua / Belum diatur';

      subject = `Akses Login Portal Absensi Guru - ${teacherName || 'Bapak/Ibu Guru'}`;
      body = `Yth. Bapak/Ibu ${teacherName || 'Guru'},

Selamat! Akun Anda untuk mengakses Sistem Presensi Siswa SMP Negeri 1 Jabon telah aktif.

Berikut adalah informasi kredensial login Anda:
--------------------------------------------------
URL Portal      : ${portalURL}
Username        : ${username}
Password        : ${password || 'Silakan hubungi Admin atau gunakan fitur lupa password'}
--------------------------------------------------
Mata Pelajaran  : ${courseList}
Kelas Diampu    : ${classList}
--------------------------------------------------

Demi keamanan dan privasi, Anda disarankan untuk segera masuk dan memperbarui username serta password Anda melalui menu "Profil Saya" setelah login pertama kali.

Jika Anda membutuhkan bantuan, silakan hubungi tim Administrator IT Sekolah.

Salam hangat,
SMP Negeri 1 Jabon - Sistem Presensi`;
    }

    const result = await sendSmtpEmail({
      host: smtpHost,
      port: 465,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom,
      to,
      subject,
      body,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API EMAIL ERROR]', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Gagal mengirim email.',
      },
      { status: 500 }
    );
  }
}
