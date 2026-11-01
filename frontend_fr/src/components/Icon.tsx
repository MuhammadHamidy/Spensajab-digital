// src/components/style-guide/Icon.tsx
import React from 'react';
import Image from 'next/image';
import { Icons } from '@/components/style-guide/icon';

type IconName = keyof typeof Icons;

interface IconComponentProps extends React.HTMLAttributes<HTMLImageElement> {
  name: IconName;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
}

const Icon: React.FC<IconComponentProps> = ({ name, src, alt, width, height, ...props }) => {
  const icon = Icons[name];

  if (!icon) {
    console.warn(`Icon "${name}" does not exist.`);
    return null;
  }

  return (
    <Image
      src={src ?? icon.src}
      alt={alt ?? icon.alt}
      width={width ?? icon.width}
      height={height ?? icon.height}
      draggable={false}
      {...props}
    />
  );
};

export default Icon;
