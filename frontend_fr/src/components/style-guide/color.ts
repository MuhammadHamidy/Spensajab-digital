// src/components/style-guide/color.ts
// Palet Warna Resmi Berdasarkan Lambang SMP Negeri 1 Jabon

export const JabonPalette = {
  // 1. Royal Navy Blue (Warna Utama Perisai Lambang)
  royalBlue: {
    50: '#EFF4FE',
    100: '#DBE6FD',
    200: '#BFD3FB',
    300: '#93B7F7',
    400: '#5F93F1',
    500: '#2B67E2',
    600: '#1E4DBD', // Biru Interaktif Utama
    700: '#193D9B', // Biru Tua Lambang (Perisai)
    800: '#15327B',
    900: '#0F2256',
  },

  // 2. Golden Wings & Star (Warna Sayap & Bintang Kembar)
  gold: {
    50: '#FEFCE8',
    100: '#FEF9C3',
    200: '#FEF08A',
    300: '#FDE047',
    400: '#FACC15',
    500: '#EAB308', // Kuning Emas Lambang
    600: '#CA8A04', // Emas Tua / Aksen
    700: '#A16207',
    800: '#854D0E',
  },

  // 3. Torch Flame (Warna Api Obor Semangat Belajar)
  flame: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    500: '#EF4444',
    600: '#DC2626', // Merah Api Obor
    700: '#B91C1C',
  },

  // 4. Forest Emerald (Warna Tangkai Obor & Teks Pita Sekolah)
  emerald: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    500: '#22C55E',
    600: '#16A34A', // Hijau Tangkai Obor
    700: '#15803D', // Hijau Tulisan "SMP NEGERI 1 JABON"
    800: '#166534',
  },

  // 5. Neutral & Surface (Warna Buku Terbuka & Pena)
  neutral: {
    white: '#FFFFFF',
    surface: '#F8FAFC',
    subtle: '#F1F5F9',
    border: '#E2E8F0',
    borderStrong: '#CBD5E1',
    textMuted: '#94A3B8',
    textSecondary: '#64748B',
    textPrimary: '#0F172A',
  },
};

// Aliases for compatibility
export const Colors = {
  primary: {
    p1: JabonPalette.royalBlue[700],
    p2: JabonPalette.royalBlue[600],
    p3: JabonPalette.royalBlue[500],
  },
  secondary: {
    gold: JabonPalette.gold[500],
    green: JabonPalette.emerald[700],
    red: JabonPalette.flame[600],
    blue: JabonPalette.royalBlue[600],
  },
  neutral: {
    n01: '#FFFFFF',
    n02: JabonPalette.neutral.surface,
    n03: JabonPalette.neutral.subtle,
    n04: JabonPalette.neutral.textSecondary,
    n05: '#334155',
    n06: '#1E293B',
    n07: JabonPalette.neutral.textPrimary,
  },
};

export default JabonPalette;
