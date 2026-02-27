// App.tsx — Root component.
//
// Minimal placeholder for the scaffold PR.
// ThemeProvider, routing, and AuthProvider will be wired up in the auth PR.

import { Box, ThemeProvider, CssBaseline } from '@mui/material';

import theme from './theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Box
          component="img"
          src="/images/serve-logo-rainbow-row.svg"
          alt="SERVE — Spending, Earnings, Resources"
          sx={{ width: 320 }}
        />
      </Box>
    </ThemeProvider>
  );
}
