'use client';

import React, { useState } from 'react';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { accountApiAdapter } from '@/lib/features/auth/infrastructure/accountApiAdapter';
import { courseApiAdapter } from '@/lib/features/courses/infrastructure/courseApiAdapter';
import { classApiAdapter } from '@/lib/features/classes/infrastructure/classApiAdapter';

function makeCourseCode(courseName) {
  const cleaned = courseName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);
  return cleaned || `MAPEL-${Date.now().toString().slice(-4)}`;
}

async function resolveCoursesAndClasses(subjectInput, classesInput, teacherId) {
  const courseNames = String(subjectInput || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const classCodes = String(classesInput || '')
    .split(',')
    .map((v) => v.trim().toUpperCase())
    .filter(Boolean);

  if (courseNames.length === 0) {
    return { courseIds: [], classIds: [] };
  }

  const [existingCourses, existingClasses] = await Promise.all([
    courseApiAdapter.getAll(),
    classApiAdapter.getAll(),
  ]);

  const courseIds = [];
  const classIds = [];

  for (const name of courseNames) {
    const candidateCode = makeCourseCode(name);
    let course = existingCourses.find(
      (c) =>
        (c.name || '').toLowerCase() === name.toLowerCase() ||
        (c.code || '').toUpperCase() === name.toUpperCase() ||
        (c.code || '').toUpperCase() === candidateCode
    );
    if (!course) {
      course = await courseApiAdapter.create({
        code: candidateCode,
        name,
      });
    }
    if (course?.id) {
      courseIds.push(course.id);

      for (const classCode of classCodes) {
        const existingCls = existingClasses.find(
          (cl) =>
            cl.course_id === course.id &&
            (cl.class_code || '').toUpperCase() === classCode
        );
        if (existingCls) {
          if (teacherId && existingCls.teacher_id !== teacherId && existingCls.dosen_id !== teacherId) {
            await classApiAdapter.update(existingCls.id, {
              ...existingCls,
              course_id: course.id,
              class_code: classCode,
              teacher_id: teacherId,
              academic_year: existingCls.academic_year || '2026/2027',
            });
          }
          classIds.push(existingCls.id);
        } else if (teacherId) {
          const createdClass = await classApiAdapter.create({
            course_id: course.id,
            class_code: classCode,
            teacher_id: teacherId,
            academic_year: '2026/2027',
          });
          if (createdClass?.id) {
            classIds.push(createdClass.id);
          }
        }
      }
    }
  }

  return { courseIds, classIds };
}

export default function MasterTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newNip, setNewNip] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [infoBanner, setInfoBanner] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newClasses, setNewClasses] = useState('');
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTeachers = async () => {
    const loadedTeachers = await accountApiAdapter.getTeachers();
    setTeachers(Array.isArray(loadedTeachers) ? loadedTeachers : []);
  };

  const filtered = teachers.filter((t) => {
    const name = t.full_name || t.name || '';
    const nip = t.nim_nip || t.nip || '';
    const subject = (t.course_names || []).join(', ') || t.subject || '-';
    return (
      !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      nip.includes(search) ||
      subject.toLowerCase().includes(search.toLowerCase())
    );
  });

  React.useEffect(() => {
    loadTeachers().catch(() => setTeachers([]));
  }, []);

  const handleAddTeacher = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const cleanNip = newNip.trim();
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim();

    if (!cleanNip || !cleanName || !cleanEmail) {
      setFormError('NIP, nama, dan email wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const createdTeacher = await accountApiAdapter.create({
        username: cleanNip,
        email: cleanEmail,
        full_name: cleanName,
        nim_nip: cleanNip,
        password: newPassword.trim() || undefined,
        role_id: 'role-guru',
      });

      try {
        const { courseIds, classIds } = await resolveCoursesAndClasses(
          newSubject,
          newClasses,
          createdTeacher.id
        );
        if (courseIds.length || classIds.length) {
          await accountApiAdapter.update(createdTeacher.id, {
            role_id: 'role-guru',
            course_ids: courseIds,
            class_ids: classIds,
          });
        }
      } catch (assignErr) {
        console.warn('Penugasan mapel/kelas guru perlu dilengkapi:', assignErr);
      }

      await loadTeachers();
      const pwdInfo = createdTeacher.generated_password || newPassword.trim();
      setInfoBanner(
        pwdInfo
          ? `Akun guru ${cleanName} berhasil dibuat. NIP/Username: ${cleanNip} | Kata Sandi Awal: ${pwdInfo}`
          : `Akun guru ${cleanName} berhasil dibuat.`
      );
      setIsAddModalOpen(false);
      setNewNip('');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setFormError('');
      setNewSubject('');
      setNewClasses('');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setNewNip(teacher.nim_nip || teacher.nip || teacher.username || '');
    setNewName(teacher.full_name || teacher.name || '');
    setNewEmail(teacher.email || '');
    setNewPassword('');
    setNewSubject((teacher.course_names || []).join(', '));
    setNewClasses((teacher.class_codes || []).join(', '));
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleEditTeacher = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const cleanNip = newNip.trim();
    const cleanName = newName.trim();
    const cleanEmail = newEmail.trim();

    if (!editingTeacher || !cleanNip || !cleanName || !cleanEmail) {
      setFormError('NIP, nama, dan email wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const { courseIds, classIds } = await resolveCoursesAndClasses(
        newSubject,
        newClasses,
        editingTeacher.id
      );

      await accountApiAdapter.update(editingTeacher.id, {
        username: cleanNip,
        email: cleanEmail,
        full_name: cleanName,
        nim_nip: cleanNip,
        role_id: 'role-guru',
        course_ids: courseIds,
        class_ids: classIds,
      });
      await loadTeachers();
      setInfoBanner(`Data guru ${cleanName} berhasil diperbarui.`);
      setIsEditModalOpen(false);
      setEditingTeacher(null);
      setFormError('');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (teacher) => {
    const name = teacher.full_name || teacher.name || teacher.username;
    if (!window.confirm(`Reset kata sandi untuk guru ${name}?`)) return;

    try {
      const res = await accountApiAdapter.resetPassword(teacher, { sendEmail: true });
      const newPwd = res?.new_password || res?.NewPassword || '';
      setInfoBanner(
        newPwd
          ? `Kata sandi guru ${name} (Username: ${teacher.username || teacher.nim_nip}) berhasil direset menjadi: ${newPwd}`
          : `Kata sandi guru ${name} berhasil direset.`
      );
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
      setInfoBanner(`Akun guru ${name} telah dihapus.`);
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
          onClick={() => {
            setFormError('');
            setNewNip('');
            setNewName('');
            setNewEmail('');
            setNewPassword('');
            setNewSubject('');
            setNewClasses('');
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Tambah Guru Baru</span>
        </button>
      </div>

      {infoBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-3">
          <span>{infoBanner}</span>
          <button
            type="button"
            onClick={() => setInfoBanner('')}
            className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    Belum ada data guru pengajar yang terdaftar.
                  </td>
                </tr>
              ) : (
                filtered.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 tabular-nums font-mono text-slate-500">
                      {teacher.nim_nip || teacher.nip || teacher.username}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {teacher.full_name || teacher.name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {(teacher.course_names || []).join(', ') || teacher.subject || '-'}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-600 font-medium">
                      {(teacher.class_codes || []).join(', ') || teacher.classes || '-'}
                    </td>
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
                          onClick={() => handleResetPassword(teacher)}
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
                ))
              )}
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
              loading={isSubmitting}
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
              Nomor Induk Pegawai (NIP) / Username
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
              Kata Sandi Awal (Opsional)
            </label>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Kosongkan untuk buat kata sandi otomatis"
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
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={handleEditTeacher}
            >
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
