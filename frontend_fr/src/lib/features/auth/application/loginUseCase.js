import { authApiAdapter } from '../infrastructure/authApiAdapter';
import { tokenStorage } from '@/lib/common/tokenStorage';
import { UserEntity } from '../domain/userEntity';

export async function loginUseCase(username, password) {
  if (!username || !password) {
    throw new Error('Username dan password wajib diisi');
  }

  const result = await authApiAdapter.login(username, password);

  if (result.token && result.account) {
    tokenStorage.setToken(result.token);

    const userEntity = new UserEntity({
      id: result.account.id,
      username: result.account.username,
      fullName: result.account.full_name,
      roleName: result.account.role_name,
      email: result.account.email,
      nimNip: result.account.nim_nip,
      phone: result.account.phone,
      hasFace: result.account.has_face,
      courseNames: result.account.course_names || [],
      courseIds: result.account.course_ids || [],
      classCodes: result.account.class_codes || [],
      classIds: result.account.class_ids || [],
      photoUrl: result.account.photo_url || '',
    });

    tokenStorage.setUser(userEntity);
    return { token: result.token, user: userEntity };
  }

  throw new Error('Gagal memproses otentikasi login');
}

export function logoutUseCase() {
  tokenStorage.clear();
}
