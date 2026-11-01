import { createTheme } from '@mui/material/styles';

// Theme diselaraskan dengan Palet Lambang SMP Negeri 1 Jabon
export const theme = createTheme({
  palette: {
    primary: {
      main: '#1E4DBD', // Biru Perisai Lambang
      dark: '#193D9B',
      light: '#2B67E2',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#CA8A04', // Kuning Emas Sayap & Bintang
      light: '#FACC15',
      dark: '#A16207',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',
      secondary: '#64748B',
      disabled: '#94A3B8',
    },
    success: {
      main: '#15803D', // Hijau Tangkai Obor & Teks Pita
      light: '#DCFCE7',
      dark: '#166534',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#DC2626', // Merah Api Obor
      light: '#FEE2E2',
      dark: '#B91C1C',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#D97706',
      light: '#FEF3C7',
      dark: '#B45309',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#193D9B',
      light: '#DBE6FD',
      dark: '#0F2256',
      contrastText: '#FFFFFF',
    },
    divider: '#E2E8F0',
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'].join(','),
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
    h1: { fontSize: '24px', fontWeight: 700, color: '#0F172A' },
    h2: { fontSize: '18px', fontWeight: 600, color: '#0F172A' },
    body1: { fontSize: '14px', fontWeight: 400, color: '#0F172A' },
    body2: { fontSize: '12px', fontWeight: 500, color: '#64748B' },
    caption: { fontSize: '12px', fontWeight: 500, color: '#64748B' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E2E8F0',
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
        },
      },
    },
  },
});

export default theme;
