'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';
import { courseApiAdapter } from '@/lib/features/courses/infrastructure/courseApiAdapter';

const EMPTY_COURSE = { code: '', name: '', sks: 3, description: '' };
const EMPTY_CLASS = { class_code: '', teacher_id: '', academic_year: '', room: '', schedule_day: '', schedule_time: '' };

function errorMessage(error) {
  return error?.message || (typeof error === 'string' ? error : 'Permintaan ke backend gagal.');
}

export default function SubjectsManagementPage() {
  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE);
  const [classForm, setClassForm] = useState(EMPTY_CLASS);
  const [courseModal, setCourseModal] = useState(false);
  const [classModal, setClassModal] = useState(null);
  const [error, setError] = useState('');

  const loadData = async () => {
    const [courseList, classList, teacherList] = await Promise.all([
      courseApiAdapter.getAll(),
      classApiAdapter.getAll(),
      accountApiAdapter.getTeachers(),
    ]);
    setCourses(courseList);
    setClasses(classList);
    setTeachers(teacherList);
  };

  useEffect(() => {
    loadData().catch((err) => setError(errorMessage(err)));
  }, []);

  const filteredCourses = useMemo(() => {
    const value = search.toLowerCase();
    return courses.filter((course) =>
      `${course.code} ${course.name}`.toLowerCase().includes(value)
    );
  }, [courses, search]);

  const submitCourse = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await courseApiAdapter.create({ ...courseForm, sks: Number(courseForm.sks) || 3 });
      setCourseForm(EMPTY_COURSE);
      setCourseModal(false);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const submitClass = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await classApiAdapter.create({
        ...classForm,
        course_id: classModal.id,
        academic_year: classForm.academic_year || new Date().getFullYear().toString(),
      });
      setClassForm(EMPTY_CLASS);
      setClassModal(null);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const deleteCourse = async (id) => {
    if (!window.confirm('Yakin ingin menghapus mata pelajaran ini?')) return;
    try {
      await courseApiAdapter.delete(id);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const deleteClass = async (id) => {
    try {
      await classApiAdapter.delete(id);
      await loadData();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Kelola Mata Pelajaran dan Kelas</h1>
          <p className="text-xs text-slate-500 mt-1">
            Setiap kelas mapel memiliki tepat satu guru pengampu. Satu mapel dapat memiliki banyak kelas dan guru.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setCourseModal(true)}>Tambah Mata Pelajaran</Button>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}

      <div className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-center justify-between gap-3">
        <strong className="text-xs text-slate-800">{courses.length} Mata Pelajaran</strong>
        <label className="w-full sm:w-72 text-xs font-semibold text-slate-700">
          Cari Mata Pelajaran
          <input
            type="search"
            placeholder="Cari kode atau nama mapel..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-normal"
          />
        </label>
      </div>

      <div className="space-y-4">
        {filteredCourses.map((course) => {
          const courseClasses = classes.filter((item) => item.course_id === course.id);
          return (
            <section key={course.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
                <div>
                  <p className="text-xs font-bold text-blue-700">{course.code}</p>
                  <h2 className="font-semibold text-slate-900">{course.name}</h2>
                  <p className="text-[11px] text-slate-500">{course.description || 'Tanpa deskripsi'} · {course.sks} jam/minggu</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setClassModal(course)}>Tambah Kelas & Guru</Button>
                  <button type="button" onClick={() => deleteCourse(course.id)} className="text-xs font-semibold text-rose-700">Hapus Mapel</button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr><th className="p-3">Kelas</th><th className="p-3">Guru Pengampu</th><th className="p-3">Tahun</th><th className="p-3 text-right">Aksi</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courseClasses.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 font-semibold">{item.class_code}</td>
                        <td className="p-3">{item.teacher_name || 'Guru belum ditentukan'}</td>
                        <td className="p-3">{item.academic_year || '-'}</td>
                        <td className="p-3 text-right"><button type="button" onClick={() => deleteClass(item.id)} className="text-rose-700 font-semibold">Hapus</button></td>
                      </tr>
                    ))}
                    {courseClasses.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-slate-500">Belum ada kelas yang ditugaskan.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <Modal isOpen={courseModal} onClose={() => setCourseModal(false)} title="Tambah Mata Pelajaran">
        <form onSubmit={submitCourse} className="space-y-3 text-xs">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700">{error}</div>}
          <label className="block font-semibold text-slate-700">Kode Mata Pelajaran
            <input required placeholder="Contoh: MTK" value={courseForm.code} onChange={(event) => setCourseForm({ ...courseForm, code: event.target.value })} className="mt-1 w-full border rounded-lg p-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-700">Nama Mata Pelajaran
            <input required placeholder="Contoh: Matematika" value={courseForm.name} onChange={(event) => setCourseForm({ ...courseForm, name: event.target.value })} className="mt-1 w-full border rounded-lg p-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-700">Jam Pelajaran per Minggu
            <input required type="number" min="1" placeholder="Contoh: 3" value={courseForm.sks} onChange={(event) => setCourseForm({ ...courseForm, sks: event.target.value })} className="mt-1 w-full border rounded-lg p-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-700">Deskripsi Mata Pelajaran
            <textarea placeholder="Keterangan tambahan (opsional)" value={courseForm.description} onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })} className="mt-1 w-full border rounded-lg p-2 font-normal" />
          </label>
          <Button type="submit" variant="primary" size="sm">Simpan Mapel</Button>
        </form>
      </Modal>

      <Modal isOpen={Boolean(classModal)} onClose={() => setClassModal(null)} title={classModal ? `Tambah Kelas - ${classModal.name}` : 'Tambah Kelas'}>
        <form onSubmit={submitClass} className="space-y-3 text-xs">
          <label className="block font-semibold text-slate-700">Kode Kelas / Rombel
            <input required placeholder="Contoh: VII-A" value={classForm.class_code} onChange={(event) => setClassForm({ ...classForm, class_code: event.target.value })} className="mt-1 w-full border rounded-lg p-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-700">Guru Pengampu
            <select required value={classForm.teacher_id} onChange={(event) => setClassForm({ ...classForm, teacher_id: event.target.value })} className="mt-1 w-full border rounded-lg p-2 font-normal">
              <option value="">Pilih guru pengampu</option>
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name || teacher.fullName}</option>)}
            </select>
          </label>
          <label className="block font-semibold text-slate-700">Tahun Ajaran
            <input placeholder="Contoh: 2026/2027" value={classForm.academic_year} onChange={(event) => setClassForm({ ...classForm, academic_year: event.target.value })} className="mt-1 w-full border rounded-lg p-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-700">Ruangan
            <input placeholder="Contoh: 7A" value={classForm.room} onChange={(event) => setClassForm({ ...classForm, room: event.target.value })} className="mt-1 w-full border rounded-lg p-2 font-normal" />
          </label>
          <Button type="submit" variant="primary" size="sm">Simpan Kelas</Button>
        </form>
      </Modal>
    </div>
  );
}
