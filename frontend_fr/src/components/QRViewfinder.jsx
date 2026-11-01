'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function QRViewfinder({
  onScan,
  isScanning = true,
  feedbackState = 'idle', // 'idle' | 'success' | 'error'
  statusMessage = '',
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(true);
  const [cameraError, setCameraError] = useState(null);
  const [scannerMode, setScannerMode] = useState('webcam'); // 'webcam' | 'usb'
  const html5QrCodeRef = useRef(null);
  const scannerContainerId = 'reader-qr-viewfinder';

  // Inisialisasi Kamera HTML5-QRCode
  useEffect(() => {
    if (scannerMode !== 'webcam' || !isScanning) {
      cleanupCamera();
      setCameraLoading(false);
      return;
    }

    let isMounted = true;
    setCameraLoading(true);

    async function startCamera() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;

        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
        }

        const qrCodeSuccessCallback = (decodedText) => {
          if (decodedText && isMounted) {
            onScan(decodedText);
          }
        };

        const config = {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.3333,
        };

        await html5QrCodeRef.current.start(
          { facingMode: 'user' },
          config,
          qrCodeSuccessCallback,
          () => {} // silent scan failure saat scanning per frame
        );

        if (isMounted) {
          setCameraActive(true);
          setCameraLoading(false);
          setCameraError(null);
        }
      } catch (err) {
        console.warn('Gagal menghubungkan kamera:', err);
        if (isMounted) {
          setCameraActive(false);
          setCameraLoading(false);
          setCameraError(
            'Akses kamera ditolak atau tidak ditemukan. Gunakan Scanner USB atau izinkan browser mengakses webcam.'
          );
        }
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      cleanupCamera();
    };
  }, [scannerMode, isScanning, onScan]);

  const cleanupCamera = () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          try {
            html5QrCodeRef.current.clear();
          } catch (e) {}
          setCameraActive(false);
        })
        .catch((err) => console.warn('Error menghentikan kamera:', err));
    }
  };

  // Border feedback solid sesuai Bagian 5 Design Brief
  let borderColor = 'border-[#CBD5E1]';
  if (feedbackState === 'success') {
    borderColor = 'border-[#A7F3D0]'; // --status-hadir-border
  } else if (feedbackState === 'error') {
    borderColor = 'border-[#FECDD3]'; // --status-alpha-border
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Selector & Status Header */}
      <div className="flex items-center justify-between bg-[#F8FAFC] p-2 rounded-[6px] border border-[#E2E8F0]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScannerMode('webcam')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
              scannerMode === 'webcam'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            Webcam
          </button>
          <button
            type="button"
            onClick={() => setScannerMode('usb')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
              scannerMode === 'usb'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            Scanner USB
          </button>
        </div>

        <span className="text-xs text-[#64748B] flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              cameraActive || scannerMode === 'usb' ? 'bg-[#047857]' : 'bg-[#B45309]'
            }`}
          />
          <span>
            {scannerMode === 'usb'
              ? 'Standby Scanner USB'
              : cameraActive
              ? 'Kamera Aktif'
              : cameraLoading
              ? 'Menghubungkan...'
              : 'Kamera Nonaktif'}
          </span>
        </span>
      </div>

      {/* Frame Container (Bingkai statis tanpa sudut bersinar, tanpa glow, tanpa laser animation) */}
      <div
        className={`relative aspect-4/3 w-full bg-white rounded-[10px] overflow-hidden border-2 transition-colors duration-150 flex items-center justify-center ${borderColor}`}
      >
        {scannerMode === 'webcam' ? (
          <>
            {cameraLoading && (
              <div className="absolute inset-0 bg-[#F8FAFC] flex flex-col items-center justify-center gap-2 z-10">
                <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[#64748B]">Menghubungkan kamera...</p>
              </div>
            )}

            {/* Container untuk html5-qrcode */}
            <div id={scannerContainerId} className="w-full h-full object-cover" />

            {/* Bingkai Statis Reticle: Garis tipis statis tanpa animasi */}
            {!cameraError && cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border border-dashed border-[#CBD5E1] rounded-[6px] flex items-center justify-center">
                  <span className="text-xs text-[#64748B] bg-white/90 px-2 py-0.5 rounded-[4px] border border-[#E2E8F0]">
                    Posisikan QR di dalam kotak
                  </span>
                </div>
              </div>
            )}

            {/* Error Message jika kamera ditolak */}
            {cameraError && (
              <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-6 text-center z-10 space-y-3">
                <div className="w-10 h-10 rounded-[6px] bg-[#FFF1F2] border border-[#FECDD3] text-[#BE123C] flex items-center justify-center font-bold text-lg">
                  !
                </div>
                <p className="text-xs text-[#64748B] max-w-xs">{cameraError}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      setScannerMode('webcam');
                    }}
                    className="px-3 py-1.5 rounded-[6px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                  <button
                    type="button"
                    onClick={() => setScannerMode('usb')}
                    className="px-3 py-1.5 rounded-[6px] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#0F172A] text-xs font-semibold cursor-pointer"
                  >
                    Ganti ke Mode USB
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Mode USB Standby Screen: Latar terang, datar */
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 bg-[#F8FAFC] w-full h-full">
            <div className="w-12 h-12 rounded-[6px] bg-white border border-[#CBD5E1] flex items-center justify-center text-sm font-semibold text-[#2563EB]">
              USB
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#0F172A]">Mode Scanner USB Siap</h4>
              <p className="text-xs text-[#64748B] mt-1 max-w-xs">
                Arahkan barcode scanner fisik ke kartu QR siswa. Pemindaian otomatis masuk ke sistem melalui keyboard input.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#047857]" />
              Siap Menerima Scan
            </span>
          </div>
        )}
      </div>

      {/* Aksesibilitas Live Announcer */}
      <div className="sr-only" aria-live="polite">
        {statusMessage}
      </div>
    </div>
  );
}
