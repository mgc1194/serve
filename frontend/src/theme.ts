// theme.ts — MUI theme configuration for SERVE.
//
// Colors derived from the SERVE logo:
//   Navy   #1e2235 — wordmark text
//   Red    #8b2020 — dollar sign accent
//   White  #ffffff — backgrounds

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1e2235',
      light: '#2d3352',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#8b2020',
      contrastText: '#ffffff',
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
});

export default theme;
