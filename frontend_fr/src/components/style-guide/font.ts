// src/components/style-guide/font.ts

export const FontWeightMap = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

export const Fonts = {
  family: {
    primary: "'Inter', sans-serif",
    secondary: "'Poppins', sans-serif",
  },
  heading: {
    hero: {
      fontWeight: FontWeightMap.medium,
      fontSize: '6rem',
      lineHeight: '6rem',
    },
    h1: {
      fontWeight: FontWeightMap.medium,
      fontSize: '5rem',
      lineHeight: '5.25rem',
    },
    h2: {
      fontWeight: FontWeightMap.medium,
      fontSize: '4.5rem',
      lineHeight: '4.75rem',
    },
    h3: {
      fontWeight: FontWeightMap.medium,
      fontSize: '3.375rem',
      lineHeight: '3.625rem',
    },
    h4: {
      fontWeight: FontWeightMap.medium,
      fontSize: '2.5rem',
      lineHeight: '2.75rem',
    },
    h5: {
      fontWeight: FontWeightMap.medium,
      fontSize: '2.125rem',
      lineHeight: '2.375rem',
    },
    h6: {
      fontWeight: FontWeightMap.medium,
      fontSize: '1.75rem',
      lineHeight: '1.75rem',
    },
    h7: {
      fontWeight: FontWeightMap.medium,
      fontSize: '1.25rem',
      lineHeight: '1.5rem',
    },
  },
  body: {
    regular: {
      fontWeight: FontWeightMap.regular,
      text26: { fontSize: '1.625rem', lineHeight: '2.5rem' },
      text22: { fontSize: '1.375rem', lineHeight: '2.125rem' },
      text20: { fontSize: '1.25rem', lineHeight: '2rem' },
      text18: { fontSize: '1.125rem', lineHeight: '1.875rem' },
      text16: { fontSize: '1rem', lineHeight: '1.625rem' },
      text14: { fontSize: '0.875rem', lineHeight: '1.375rem' },
      text12: { fontSize: '0.75rem', lineHeight: '1.25rem' },
    },
    semibold: {
      fontWeight: FontWeightMap.semibold,
      text26: { fontSize: '1.625rem', lineHeight: '2.5rem' },
      text22: { fontSize: '1.375rem', lineHeight: '2.125rem' },
      text20: { fontSize: '1.25rem', lineHeight: '2rem' },
      text18: { fontSize: '1.125rem', lineHeight: '1.875rem' },
      text16: { fontSize: '1rem', lineHeight: '1.625rem' },
      text14: { fontSize: '0.875rem', lineHeight: '1.375rem' },
      text12: { fontSize: '0.75rem', lineHeight: '1.25rem' },
    },
    bold: {
      fontWeight: FontWeightMap.bold,
      text26: { fontSize: '1.625rem', lineHeight: '2.5rem' },
      text22: { fontSize: '1.375rem', lineHeight: '2.125rem' },
      text20: { fontSize: '1.25rem', lineHeight: '2rem' },
      text18: { fontSize: '1.125rem', lineHeight: '1.875rem' },
      text16: { fontSize: '1rem', lineHeight: '1.625rem' },
      text14: { fontSize: '0.875rem', lineHeight: '1.375rem' },
      text12: { fontSize: '0.75rem', lineHeight: '1.25rem' },
    },
  },
  button: {
    fontWeight: FontWeightMap.medium,
    xl: { fontSize: '1.625rem', lineHeight: '2.375rem' },
    lg: { fontSize: '1.375rem', lineHeight: '2.125rem' },
    md: { fontSize: '1.125rem', lineHeight: '2rem' },
    sm: { fontSize: '1rem', lineHeight: '1.75rem' },
    xs: { fontSize: '0.875rem', lineHeight: '1.5rem' },
  },
};
