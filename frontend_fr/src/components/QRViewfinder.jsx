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
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (Belakang) | 'user' (Depan)
  const html5QrCodeRef = useRef(null);
  const onScanRef = useRef(onScan);
  const scannerContainerId = 'reader-qr-viewfinder';

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopCurrentCamera = async () => {
    const instance = html5QrCodeRef.current;
    if (!instance) return;
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
      instance.clear();
    } catch (err) {
      // Abaikan error saat menghentikan stream lama
    }
  };

  // Inisialisasi Kamera HTML5-QRCode
  useEffect(() => {
    let isMounted = true;

    async function manageCamera() {
      await stopCurrentCamera();

      if (!isMounted) return;

      if (scannerMode !== 'webcam' || !isScanning) {
        setCameraActive(false);
        setCameraLoading(false);
        return;
      }

      setCameraLoading(true);
      setCameraError(null);

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;

        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
        }

        const qrCodeSuccessCallback = (decodedText) => {
          if (decodedText && isMounted && onScanRef.current) {
            onScanRef.current(decodedText);
          }
        };

        const config = {
          fps: 15,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.3333,
        };

        try {
          await html5QrCodeRef.current.start(
            { facingMode },
            config,
            qrCodeSuccessCallback,
            () => {}
          );
        } catch (primaryErr) {
          // Fallback otomatis jika perangkat hanya memiliki 1 kamera (mis. laptop)
          const fallbackMode = facingMode === 'environment' ? 'user' : 'environment';
          await html5QrCodeRef.current.start(
            { facingMode: fallbackMode },
            config,
            qrCodeSuccessCallback,
            () => {}
          );
        }

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
            'Akses kamera ditolak atau tidak ditemukan. Izinkan browser mengakses kamera atau gunakan Scanner USB.'
          );
        }
      }
    }

    manageCamera();

    return () => {
      isMounted = false;
      stopCurrentCamera();
    };
  }, [scannerMode, isScanning, facingMode]);

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Border feedback solid sesuai Bagian 5 Design Brief
  let borderColor = 'border-[#CBD5E1]';
  if (feedbackState === 'success') {
    borderColor = 'border-[#A7F3D0]';
  } else if (feedbackState === 'error') {
    borderColor = 'border-[#FECDD3]';
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mode Selector & Camera Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC] p-2 rounded-[6px] border border-[#E2E8F0]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setScannerMode('webcam')}
            className={`px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors cursor-pointer ${
              scannerMode === 'webcam'
                ? 'bg-[#2563EB] text-white'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            Kamera
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

        <div className="flex items-center gap-2">
          {scannerMode === 'webcam' && (
            <div className="inline-flex items-center rounded-[6px] border border-[#CBD5E1] bg-white p-0.5">
              <button
                type="button"
                onClick={() => setFacingMode('environment')}
                className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition-colors cursor-pointer ${
                  facingMode === 'environment'
                    ? 'bg-[#1E4DBD] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Belakang
              </button>
              <button
                type="button"
                onClick={() => setFacingMode('user')}
                className={`px-2.5 py-1 rounded-[4px] text-[11px] font-semibold transition-colors cursor-pointer ${
                  facingMode === 'user'
                    ? 'bg-[#1E4DBD] text-white'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                Depan
              </button>
            </div>
          )}

          <span className="text-xs text-[#64748B] flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                cameraActive || scannerMode === 'usb' ? 'bg-[#047857]' : 'bg-[#B45309]'
              }`}
            />
            <span className="hidden sm:inline">
              {scannerMode === 'usb'
                ? 'Standby USB'
                : cameraActive
                ? 'Aktif'
                : cameraLoading
                ? 'Menghubungkan...'
                : 'Nonaktif'}
            </span>
          </span>
        </div>
      </div>

      {/* Frame Container */}
      <div
        className={`relative aspect-4/3 w-full bg-white rounded-[10px] overflow-hidden border-2 transition-colors duration-150 flex items-center justify-center ${borderColor}`}
      >
        {scannerMode === 'webcam' ? (
          <>
            {cameraLoading && (
              <div className="absolute inset-0 bg-[#F8FAFC] flex flex-col items-center justify-center gap-2 z-10">
                <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-[#64748B]">
                  Menghubungkan kamera {facingMode === 'environment' ? 'belakang' : 'depan'}...
                </p>
              </div>
            )}

            {/* Container untuk html5-qrcode */}
            <div id={scannerContainerId} className="w-full h-full object-cover" />

            {/* Tombol Cepat Putar Kamera di Pojok Kanan Atas Kamera */}
            {!cameraError && cameraActive && (
              <button
                type="button"
                onClick={toggleFacingMode}
                title="Ganti Kamera Depan / Belakang"
                className="absolute top-3 right-3 z-20 px-2.5 py-1.5 rounded-lg bg-slate-900/75 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer backdrop-blur-xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
              </button>
            )}

            {/* Bingkai Statis Reticle */}
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
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      toggleFacingMode();
                    }}
                    className="px-3 py-1.5 rounded-[6px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold cursor-pointer"
                  >
                    Coba Kamera {facingMode === 'environment' ? 'Depan' : 'Belakang'}
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
          /* Mode USB Standby Screen */
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
