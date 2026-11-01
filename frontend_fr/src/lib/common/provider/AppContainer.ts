// src/lib/common/provider/AppContainer.ts

import { AuthContainer } from '@/lib/features/auth/AuthContainer';

export class AppContainer {
  static auth = AuthContainer.getInstance();
  // static user = UserContainer.getInstance();
}
