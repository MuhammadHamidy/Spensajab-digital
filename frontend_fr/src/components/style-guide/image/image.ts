// src/components/style-guide/image.ts
const IMAGE_PATH = '/image';

interface ImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const Images: Record<string, ImageProps> = {
  logo: {src: `${IMAGE_PATH}/logo-jabon.png`, alt: 'SMP Negeri 1 Jabon', width: 120, height: 120},
};
