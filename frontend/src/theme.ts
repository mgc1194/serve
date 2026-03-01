// theme.ts — MUI theme configuration for SERVE.
//
// Palette:
//   Primary     #1e2235 — navy (wordmark)
//   Secondary   #AABBFF — periwinkle, AAA on navy (8.43:1)
//               #2c48ba — periwinkle dark, AAA on bg (7.02:1)
//   Accent      #C8ADFF — wisteria, AAA on navy (8.15:1)
//               #7025bb — wisteria dark, AAA on bg (7.21:1)
//   Tertiary    #f99090 — coral red, AAA on navy (7.17:1)
//               #a10c0c — deep red, AAA on bg (7.48:1)
//   Rainbow     all seven colors AAA on navy

import { createTheme, keyframes } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    accent: Palette['primary'];
    tertiary: Palette['primary'];

    rainbowText: {
      red: string;
      orange: string;
      yellow: string;
      green: string;
      blue: string;
      indigo: string;
      violet: string;
    };
  }

  interface PaletteOptions {
    accent?: PaletteOptions['primary'];
    tertiary?: PaletteOptions['primary'];

    rainbowText?: {
      red: string;
      orange: string;
      yellow: string;
      green: string;
      blue: string;
      indigo: string;
      violet: string;
    };
  }

  interface Theme {
    rainbow: {
      em: {
        fontStyle: 'normal';
        animation: string;
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none';
          color: string;
        };
      };
    };
  }

  interface ThemeOptions {
    rainbow?: Theme['rainbow'];
  }
}

const rainbowCycle = keyframes`
    0%   { color: #ff8f8f }
    15%  { color: #f59942 }
    30%  { color: #f5de7f }
    45%  { color: #9ce89d }
    60%  { color: #a3d6f0 }
    75%  { color: #afadff }
    90%  { color: #c4a1f2 }
    100% { color: #ff8f8f }
  `;

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e2235',
      light: '#2d3352',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#AABBFF',
      light: '#C4CCFF',
      dark: '#2c48ba',   // AAA on bg (7.02:1)
      contrastText: '#1e2235',
    },
    accent: {
      main: '#C8ADFF',
      light: '#DDD0FF',
      dark: '#7025bb',   // AAA on bg (7.21:1)
      contrastText: '#1e2235',
    },
    tertiary: {
      main: '#f99090',
      dark: '#a10c0c',
      contrastText: '#1e2235',
    },

    rainbowText: {
      red: '#ff8f8f',
      orange: '#f59942',
      yellow: '#f5de7f',
      green: '#9ce89d',
      blue: '#a3d6f0',
      indigo: '#afadff',
      violet: '#c4a1f2',
    },

    error: {
      main: '#c0392b',
    },
    background: {
      default: '#f4f5f7',
      paper: '#ffffff',
    },
    text: {
      primary: '#1e2235',
      secondary: '#5a5f7a',
    },
    divider: '#e0e2ea',
  },
  typography: {
    fontFamily: '"DM Sans", system-ui, sans-serif',
    h1: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
    h2: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
    h3: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
    h4: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
    h5: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
    h6: { fontFamily: '"DM Serif Display", Georgia, serif', fontWeight: 400 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          '&:hover': { backgroundColor: '#2d3352' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: '#ffffff' },
      },
    },
  },
  rainbow: {
    em: {
      fontStyle: 'normal',
      animation: `${rainbowCycle} 5s linear infinite`,
      '@media (prefers-reduced-motion: reduce)': {
        animation: 'none',
        color: '#c4a1f2', // violet fallback
      },
    },
  },
});

export default theme;
