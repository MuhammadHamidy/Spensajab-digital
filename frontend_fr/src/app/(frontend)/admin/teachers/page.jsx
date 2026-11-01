'use client';

import React, { useState } from 'react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { courseApiAdapter } from '@/lib/features/courses/infrastructure/courseApiAdapter';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';

export default function MasterTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNip, setNewNip] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newClasses, setNewClasses] = useState('');
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadTeachers = async () => {
    const loadedTeachers = await accountApiAdapter.getTeachers();
    setTeachers(Array.isArray(loadedTeachers) ? loadedTeachers : []);
  };

  const filtered = teachers.filter((t) => {
    const name = t.full_name || t.name || '';
    const nip = t.nim_nip || t.nip || '';
    const subject = (t.course_names || []).join(', ') || t.subject || '-';
    return !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      nip.includes(search) ||
      subject.toLowerCase().includes(search.toLowerCase());
  });

  React.useEffect(() => {
    loadTeachers().catch(() => setTeachers([]));
  }, []);

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!newNip || !newName || !newEmail) {
      setFormError('NIP, nama, dan email wajib diisi.');
      return;
    }

    try {
      const createdTeacher = await accountApiAdapter.create({
        username: newNip,
        email: newEmail,
        full_name: newName,
        nim_nip: newNip,
        role_id: 'role-guru',
      });

      const courseName = newSubject.trim();
      const classCodes = newClasses.split(',').map((value) => value.trim()).filter(Boolean);
      let courseIds = [];
      let classIds = [];

      if (courseName) {
        const existingCourses = await courseApiAdapter.getAll();
        const existingCourse = existingCourses.find(
          (course) => course.name.toLowerCase() === courseName.toLowerCase()
        );
        const course = existingCourse || await courseApiAdapter.create({
          code: courseName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30),
          name: courseName,
        });
        courseIds = [course.id];

        for (const classCode of classCodes) {
          const createdClass = await classApiAdapter.create({
            course_id: course.id,
            class_code: classCode,
            teacher_id: createdTeacher.id,
            academic_year: '2026/2027',
          });
          classIds.push(createdClass.id);
        }
      }

      if (courseIds.length || classIds.length) {
        await accountApiAdapter.update(createdTeacher.id, {
            role_id: 'role-guru',
            course_ids: courseIds,
            class_ids: classIds,
          });
      }
      await loadTeachers();
      setIsAddModalOpen(false);
      setNewNip('');
      setNewName('');
      setNewEmail('');
      setFormError('');
      setNewSubject('');
      setNewClasses('');
    } catch (error) {
      setFormError(error.message);
    }
  };

  const openEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setNewNip(teacher.nim_nip || teacher.nip || '');
    setNewName(teacher.full_name || teacher.name || '');
    setNewEmail(teacher.email || '');
    setNewSubject((teacher.course_names || []).join(', '));
    setNewClasses((teacher.class_codes || []).join(', '));
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditTeacher = async (e) => {
    e.preventDefault();
    if (!editingTeacher || !newNip || !newName || !newEmail) {
      setFormError('NIP, nama, dan email wajib diisi.');
      return;
    }

    try {
      const courseName = newSubject.trim();
      const classCodes = newClasses.split(',').map((value) => value.trim()).filter(Boolean);
      const existingCourses = await courseApiAdapter.getAll();
      const existingCourse = existingCourses.find(
        (course) => course.name.toLowerCase() === courseName.toLowerCase()
      );
      const course = courseName
        ? existingCourse || await courseApiAdapter.create({
            code: courseName.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30),
            name: courseName,
          })
        : null;

      for (const classId of editingTeacher.class_ids || []) {
        await classApiAdapter.delete(classId);
      }

      const classIds = [];
      if (course) {
        for (const classCode of classCodes) {
          const createdClass = await classApiAdapter.create({
            course_id: course.id,
            class_code: classCode,
            teacher_id: editingTeacher.id,
            academic_year: '2026/2027',
          });
          classIds.push(createdClass.id);
        }
      }

      await accountApiAdapter.update(editingTeacher.id, {
        username: newNip,
        email: newEmail,
        full_name: newName,
        nim_nip: newNip,
        role_id: 'role-guru',
        course_ids: course ? [course.id] : [],
        class_ids: classIds,
      });
      await loadTeachers();
      setIsEditModalOpen(false);
      setEditingTeacher(null);
      setFormError('');
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleDeleteTeacher = async (teacher) => {
    const name = teacher.full_name || teacher.name || teacher.username;
    if (!window.confirm(`Hapus akun guru ${name}? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      await accountApiAdapter.delete(teacher.id);
      await loadTeachers();
    } catch (error) {
      setFormError(error.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Data Guru Pengajar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar guru pengajar, penugasan mata pelajaran, dan pengelolaan akun di SMP Negeri 1 Jabon.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {/* Search Bar & Counter */}
      <div className="bg-white border border-slate-200/90 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span>Total Guru Terdaftar:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200 tabular-nums">
            {teachers.length} Guru
          </span>
        </div>

        <div className="w-full sm:w-80">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Cari Guru
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari NIP, nama guru, atau mapel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Tabel Data Guru */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3 px-4 font-semibold">NIP / Akun</th>
                <th className="py-3 px-4 font-semibold">Nama Lengkap Guru</th>
                <th className="py-3 px-4 font-semibold">Mata Pelajaran</th>
                <th className="py-3 px-4 font-semibold">Rombel Diampu</th>
                <th className="py-3 px-4 font-semibold">Status Akun</th>
                <th className="py-3 px-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 tabular-nums font-mono text-slate-500">{teacher.nim_nip || teacher.nip}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{teacher.full_name || teacher.name}</td>
                  <td className="py-3 px-4 text-slate-700">{(teacher.course_names || []).join(', ') || teacher.subject || '-'}</td>
                  <td className="py-3 px-4 tabular-nums text-slate-600 font-medium">{(teacher.class_codes || []).join(', ') || teacher.classes || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Aktif
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditTeacher(teacher)}
                      className="px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => alert(`Gunakan menu reset password pada backend untuk akun ${teacher.full_name || teacher.name}.`)}
                      className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Reset Sandi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTeacher(teacher)}
                      className="px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Hapus
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Guru Baru */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Akun Guru Baru"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddTeacher}
            >
              Simpan Akun Guru
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddTeacher} className="space-y-3.5 text-xs">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{formError}</p>}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Email Guru
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="guru@sekolah.sch.id"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Nomor Induk Pegawai (NIP)
            </label>
            <input
              type="text"
              required
              value={newNip}
              onChange={(e) => setNewNip(e.target.value)}
              placeholder="Contoh: 198507202010011005"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Nama Lengkap dan Gelar
            </label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Siti Rahmawati, S.Pd"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Mata Pelajaran yang Diampu
            </label>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Contoh: Matematika"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              Rombel Kelas Diampu
            </label>
            <input
              type="text"
              value={newClasses}
              onChange={(e) => setNewClasses(e.target.value)}
              placeholder="Contoh: 7A, 7B, 8A"
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTeacher(null);
          setFormError('');
        }}
        title="Edit Akun Guru"
        footerActions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Batal
            </Button>
            <Button variant="primary" size="sm" onClick={handleEditTeacher}>
              Simpan Perubahan
            </Button>
          </>
        }
      >
        <form onSubmit={handleEditTeacher} className="space-y-3.5 text-xs">
          {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{formError}</p>}
          <label className="block font-semibold text-slate-800">
            Email Guru
            <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-800">
            NIP / Username
            <input type="text" required value={newNip} onChange={(e) => setNewNip(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-800">
            Nama Lengkap
            <input type="text" required value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-800">
            Mata Pelajaran
            <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 font-normal" />
          </label>
          <label className="block font-semibold text-slate-800">
            Rombel (pisahkan dengan koma)
            <input type="text" value={newClasses} onChange={(e) => setNewClasses(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 font-normal" />
          </label>
        </form>
      </Modal>
    </div>
  );
}
