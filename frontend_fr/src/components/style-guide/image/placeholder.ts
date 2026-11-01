// src/components/style-guide/image.ts
const PLACEHOLDER_PATH = '/image/placeholder';

interface PlaceholderProps {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const Placeholders: Record<string, PlaceholderProps> = {
  blog: { src: `${PLACEHOLDER_PATH}/image-placeholder-blog.svg`, alt: 'Blog Placeholder', width: 1119.99, height: 646.92 },
  header: { src: `${PLACEHOLDER_PATH}/image-placeholder-header.svg`, alt: 'Header Placeholder', width: 1120, height: 392 },
  default: { src: `${PLACEHOLDER_PATH}/image-placeholder.svg`, alt: 'Default Placeholder', width: 1440, height: 860 },
  instagram: { src: `${PLACEHOLDER_PATH}/instagram-image.svg`, alt: 'Instagram Placeholder', width: 262, height: 262 },
};
