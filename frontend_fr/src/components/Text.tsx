// src/components/Text.tsx
import { CSSProperties, JSX, ReactNode } from 'react';
import { Fonts, FontWeightMap } from './style-guide/font';

type HeadingLevel = keyof typeof Fonts.heading;
type BodyWeight = keyof typeof Fonts.body;
type BodyLevel = keyof (typeof Fonts.body)['regular'];
type ButtonLevel = keyof typeof Fonts.button;

interface TextProps {
  children: ReactNode;
  variant?: 'heading' | 'body' | 'button';
  level?: HeadingLevel | BodyLevel | ButtonLevel;
  weight?: BodyWeight;
  as?: keyof JSX.IntrinsicElements;
  style?: CSSProperties;
}

export const Text = ({
  children,
  variant = 'body',
  level,
  weight = 'regular',
  as: Component = 'span',
  style,
}: TextProps) => {
  let fontStyle: CSSProperties = {};

  if (variant === 'heading' && level && level in Fonts.heading) {
    const h = Fonts.heading[level as HeadingLevel];
    fontStyle = {
      fontFamily: Fonts.family.primary,
      fontWeight: h.fontWeight,
      fontSize: h.fontSize,
      lineHeight: h.lineHeight,
    };
  } else if (variant === 'body') {
    const lvl = level ?? 'text16';
    const bWeight = Fonts.body[weight];
    const b = bWeight[lvl as BodyLevel] as { fontSize: string; lineHeight: string };
    fontStyle = {
      fontFamily: Fonts.family.secondary,
      fontWeight: bWeight ? FontWeightMap[weight] : FontWeightMap.regular,
      fontSize: b.fontSize,
      lineHeight: b.lineHeight,
    };
  } else if (variant === 'button') {
    const lvl = level ?? 'md';
    const b = Fonts.button[lvl as ButtonLevel] as { fontSize: string; lineHeight: string };
    fontStyle = {
      fontFamily: Fonts.family.primary,
      fontWeight: Fonts.button.fontWeight,
      fontSize: b.fontSize,
      lineHeight: b.lineHeight,
      textTransform: 'uppercase',
    };
  }

  return <Component style={{ ...fontStyle, ...style }}>{children}</Component>;
};
