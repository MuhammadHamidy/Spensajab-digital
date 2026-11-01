'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import { attendanceApi } from '@/lib/attendanceApi';

export default function AdminMonitoringPage() {
  const [liveSessions, setLiveSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchLiveMonitoring = async () => {
    const res = await attendanceApi.getLiveMonitoring();
    if (res.success && res.data) {
      setLiveSessions(res.data);
    } else {
      setLiveSessions([]);
    }
    setLastRefreshed(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLiveMonitoring();
    const interval = setInterval(fetchLiveMonitoring, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
        <div className="border-b border-[#E2E8F0] pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#0F172A]">
              Monitoring Presensi Kelas
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pantau seluruh ruang kelas yang sedang membuka sesi presensi secara terpusat.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#64748B] tabular-nums">
              Update: {lastRefreshed.toLocaleTimeString('id-ID')}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchLiveMonitoring}
            >
              Perbarui
            </Button>
          </div>
        </div>

        {/* Sesi Presensi yang Sedang Berjalan */}
        {liveSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveSessions.map((ls) => {
              const present = ls.total_present || 0;
              const total = ls.total_students ?? 0;
              const percent = Math.min(100, Math.round((present / total) * 100));

              const now = Date.now();
              const cutoff = ls.late_cutoff_at ? new Date(ls.late_cutoff_at).getTime() : now;
              const diff = cutoff - now;
              const isPast15m = diff <= 0;
              const mins = Math.max(0, Math.floor(diff / 60000));
              const secs = Math.max(0, Math.floor((diff % 60000) / 1000));

              return (
                <div
                  key={ls.id}
                  className="bg-white border border-[#CBD5E1] rounded-[10px] p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#EEF2FF] text-[#2563EB] border border-[#C7D2FE] text-xs font-semibold">
                        Kelas {ls.class_name}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-[4px] border tabular-nums ${
                          isPast15m
                            ? 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]'
                            : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                        }`}
                      >
                        {isPast15m ? 'Lewat Batas Waktu' : `Sisa: ${mins}m ${secs}s`}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-[#0F172A] leading-snug">
                        {ls.topic}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        Guru: {ls.teacher_name}
                      </p>
                    </div>
                  </div>

                  {/* Statistik Kehadiran */}
                  <div className="space-y-2 bg-[#F8FAFC] p-3 rounded-[6px] border border-[#E2E8F0]">
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="text-[#64748B]">Kehadiran:</span>
                      <span className="font-semibold text-[#0F172A]">
                        {present} / {total} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-[#E2E8F0] rounded-[2px] h-1.5 overflow-hidden">
                      <div
                        className="bg-[#047857] h-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-[#64748B] tabular-nums pt-0.5">
                      <span>Terlambat: {ls.total_late || 0}</span>
                      <span>Alpha: {ls.total_alpha || 0}</span>
                    </div>
                  </div>

                  <Link
                    href={`/attendance/session/${ls.id}`}
                    className="w-full py-2 rounded-[6px] bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold text-center transition-colors block"
                  >
                    Pantau Roster Kelas
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-[10px] p-12 text-center text-[#64748B] text-xs space-y-1">
            <h3 className="text-sm font-semibold text-[#0F172A]">
              Tidak Ada Kelas Yang Sedang Terbuka
            </h3>
            <p>
              Saat guru membuka sesi presensi kelas, status real-time akan langsung terpantau di sini.
            </p>
          </div>
        )}
      </div>
    );
  }
