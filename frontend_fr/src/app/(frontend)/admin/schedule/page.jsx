'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/Button';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { courseApiAdapter } from '@/lib/features/courses/infrastructure/courseApiAdapter';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const EMPTY_FORM = {
  course_id: '',
  teacher_id: '',
  class_code: '',
  academic_year: '',
  room: '',
  schedule_day: '',
  schedule_start_time: '',
  schedule_end_time: '',
};

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error.message === 'string') return error.message;
  return 'Permintaan ke backend gagal. Periksa koneksi ke server backend.';
}

function timeRange(item) {
  if (item.schedule_start_time || item.schedule_end_time) {
    return [item.schedule_start_time, item.schedule_end_time].filter(Boolean).join(' - ');
  }
  return item.schedule_time || '';
}

function sortTime(value) {
  return String(value || '').replace(/\s/g, '').toLowerCase();
}

function toTimeInput(value) {
  const match = String(value || '').match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export default function ScheduleMappingPage() {
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    const [classList, courseList, teacherList] = await Promise.all([
      classApiAdapter.getAll(),
      courseApiAdapter.getAll(),
      accountApiAdapter.getTeachers(),
    ]);
    setClasses(classList);
    setCourses(courseList);
    setTeachers(teacherList);
  };

  useEffect(() => {
    loadData().catch((err) => setError(errorMessage(err)));
  }, []);

  const timeSlots = useMemo(() => (
    [...new Set(classes
      .filter((item) => !selectedTeacherId || item.teacher_id === selectedTeacherId || item.dosen_id === selectedTeacherId)
      .map((item) => timeRange(item))
      .filter(Boolean))]
      .sort((a, b) => sortTime(a).localeCompare(sortTime(b)))
  ), [classes, selectedTeacherId]);

  const filteredClasses = useMemo(
    () => classes.filter((item) => (
      !selectedTeacherId || item.teacher_id === selectedTeacherId || item.dosen_id === selectedTeacherId
    )),
    [classes, selectedTeacherId]
  );

  const openCreate = () => {
    setError('');
    setForm({ ...EMPTY_FORM, academic_year: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}` });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setError('');
    setEditing(item);
    setForm({
      course_id: item.course_id || '',
      teacher_id: item.teacher_id || item.dosen_id || '',
      class_code: item.class_code || '',
      academic_year: item.academic_year || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      room: item.room || '',
      schedule_day: item.schedule_day || '',
      schedule_start_time: toTimeInput(item.schedule_start_time || item.schedule_time),
      schedule_end_time: toTimeInput(item.schedule_end_time || item.schedule_time?.split('-')[1]),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const saveMapping = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        ...form,
        schedule_time: `${form.schedule_start_time} - ${form.schedule_end_time}`,
        academic_year: form.academic_year || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      };
      if (editing) {
        await classApiAdapter.update(editing.id, payload);
      } else {
        await classApiAdapter.create(payload);
      }
      closeForm();
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const deleteMapping = async (item) => {
    if (!window.confirm(`Hapus pemetaan ${item.course_name || 'mapel'} - ${item.class_code} pada hari ${item.schedule_day || 'yang dipilih'}?`)) return;
    setError('');
    try {
      await classApiAdapter.delete(item.id);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const renderMapping = (item) => (
    <div key={item.id} className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-[11px]">
      <p className="font-bold text-blue-900">Kelas {item.class_code}</p>
      <p className="text-blue-800">{item.course_name || item.course_code || 'Mata pelajaran'}</p>
      <p className="text-slate-600">{item.teacher_name || 'Guru belum ditentukan'}</p>
      {item.room && <p className="text-slate-500">Ruang {item.room}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => openEdit(item)} className="font-semibold text-blue-700 cursor-pointer">Edit</button>
        <button type="button" onClick={() => deleteMapping(item)} className="font-semibold text-rose-700 cursor-pointer">Hapus</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pemetaan Jadwal Mata Pelajaran</h1>
          <p className="mt-1 text-xs text-slate-500">
            Atur mapel, guru, rombel, hari, dan jam. Pemetaan ini otomatis digunakan pada menu Presensi QR Kelas.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/attendance">
            <Button variant="secondary" size="md">Ke Presensi QR Kelas</Button>
          </Link>
          <Button variant="primary" size="md" onClick={openCreate}>+ Tambah Pemetaan</Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <h2 className="font-semibold text-slate-900">Jadwal Mingguan</h2>
            <p className="mt-1 text-[11px] text-slate-500">Setiap kartu menampilkan rombel, mata pelajaran, dan guru pengampu yang terhubung ke Presensi QR Kelas.</p>
          </div>
          <label className="w-full text-xs font-semibold text-slate-700 sm:w-72">
            Filter Guru Pengampu
            <select
              value={selectedTeacherId}
              onChange={(event) => setSelectedTeacherId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 font-normal"
            >
              <option value="">Semua Guru Pengampu</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name || teacher.name || teacher.username}
                </option>
              ))}
            </select>
          </label>
        </div>
        <table className="w-full min-w-[900px] table-fixed text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="w-32 border-r border-slate-200 p-3">Jam</th>
              {DAYS.map((day) => <th key={day} className="border-r border-slate-200 p-3 text-center">{day}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {timeSlots.map((time) => (
              <tr key={time} className="align-top">
                <td className="border-r border-slate-200 p-3 font-semibold text-slate-700 tabular-nums">{time}</td>
                {DAYS.map((day) => (
                  <td key={day} className="border-r border-slate-100 p-2">
                    <div className="space-y-2">{filteredClasses.filter((item) => timeRange(item) === time && item.schedule_day === day).map(renderMapping)}</div>
                  </td>
                ))}
              </tr>
            ))}
            {!timeSlots.length && (
              <tr>
                <td colSpan={DAYS.length + 1} className="p-8 text-center text-slate-500">
                  Belum ada pemetaan jadwal dengan hari &amp; jam. Klik &quot;+ Tambah Pemetaan&quot; atau &quot;Edit&quot; pada daftar di bawah.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Daftar Pemetaan Jadwal ({filteredClasses.length})</h2>
        </div>
        <table className="w-full min-w-[850px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3">Mata Pelajaran</th><th className="p-3">Guru</th><th className="p-3">Rombel</th>
              <th className="p-3">Hari</th><th className="p-3">Jam</th><th className="p-3">Ruangan</th><th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredClasses.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70">
                <td className="p-3 font-semibold">{item.course_name || item.course_code || '-'}</td>
                <td className="p-3">{item.teacher_name || 'Guru belum ditentukan'}</td>
                <td className="p-3 font-semibold text-blue-700">Kelas {item.class_code || '-'}</td>
                <td className="p-3">{item.schedule_day || <span className="text-amber-600 font-medium">Belum diatur</span>}</td>
                <td className="p-3 tabular-nums">{timeRange(item) || <span className="text-amber-600 font-medium">Belum diatur</span>}</td>
                <td className="p-3">{item.room || '-'}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => openEdit(item)} className="font-semibold text-blue-700 cursor-pointer">Edit</button>
                    <button type="button" onClick={() => deleteMapping(item)} className="font-semibold text-rose-700 cursor-pointer">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filteredClasses.length && <tr><td colSpan="7" className="p-6 text-center text-slate-500">Belum ada pemetaan jadwal.</td></tr>}
          </tbody>
        </table>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={saveMapping} className="w-full max-w-lg space-y-3 rounded-xl bg-white p-5">
            <h2 className="text-base font-semibold">{editing ? 'Edit Pemetaan Jadwal' : 'Tambah Pemetaan Jadwal'}</h2>
            <label className="block text-xs font-semibold">Mata Pelajaran
              <select required value={form.course_id} onChange={(event) => setForm({ ...form, course_id: event.target.value })} className="mt-1 w-full rounded-lg border p-2">
                <option value="">Pilih mata pelajaran</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.code} - {course.name}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold">Guru Pengampu
              <select required value={form.teacher_id} onChange={(event) => setForm({ ...form, teacher_id: event.target.value })} className="mt-1 w-full rounded-lg border p-2">
                <option value="">Pilih guru</option>
                {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.name || teacher.username}</option>)}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold">Rombel
                <input required placeholder="Contoh: 7A" value={form.class_code} onChange={(event) => setForm({ ...form, class_code: event.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" />
              </label>
              <label className="block text-xs font-semibold">Tahun Ajaran
                <input required placeholder="Contoh: 2026/2027" value={form.academic_year} onChange={(event) => setForm({ ...form, academic_year: event.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" />
              </label>
              <label className="block text-xs font-semibold">Hari
                <select required value={form.schedule_day} onChange={(event) => setForm({ ...form, schedule_day: event.target.value })} className="mt-1 w-full rounded-lg border p-2">
                  <option value="">Pilih hari</option>{DAYS.map((day) => <option key={day}>{day}</option>)}
                </select>
              </label>
              <label className="block text-xs font-semibold">Jam Mulai
                <input required type="time" value={form.schedule_start_time || ''} onChange={(event) => setForm({ ...form, schedule_start_time: event.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" />
              </label>
              <label className="block text-xs font-semibold">Jam Selesai
                <input required type="time" value={form.schedule_end_time || ''} onChange={(event) => setForm({ ...form, schedule_end_time: event.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" />
              </label>
              <label className="block text-xs font-semibold sm:col-span-2">Ruangan
                <input placeholder="Contoh: Ruang 7A" value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} className="mt-1 w-full rounded-lg border p-2 font-normal" />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeForm}>Batal</Button>
              <Button type="submit" variant="primary">{editing ? 'Simpan Perubahan' : 'Tambah Pemetaan'}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
