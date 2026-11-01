'use client';

import { Text } from '@/components/Text';
import NavLink from '@/components/navbar/NavLink';
import Logo from '@/components/Logo';
import Icon from '@/components/Icon';

export default function DocsPage() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <Text variant={'heading'} level={'h1'}>
        Ini Page Dokumentasi
      </Text>
      <NavLink href={'/'}>Kembali Ke Home</NavLink>
      <div className="w-8 h-8 bg-amber-300">
        <Icon name={'calendar'} />
      </div>
      <NavLink href={'/docs'}>Kembali Ke Docs</NavLink>
      <Logo />
    </div>
  );
}
