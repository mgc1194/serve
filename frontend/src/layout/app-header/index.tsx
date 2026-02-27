// layout/app-header/index.tsx — Top navigation bar for authenticated pages.

import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { useNavigate } from 'react-router';

import { useAuth } from '@serve/context/auth-context';
import { logout } from '@serve/services/auth';

export function AppHeader() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      // Clear user regardless of whether the API call succeeded,
      // so a failed logout doesn't leave the user stuck.
      setUser(null);
      navigate('/login');
    }
  }

  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar>
        <Box
          component="img"
          src="/images/serve-logo-rainbow-row.svg"
          alt="SERVE"
          sx={{ height: 100, mr: 'auto' }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          {user?.email}
        </Typography>
        <Button onClick={handleLogout} color="primary" size="small">
          Sign out
        </Button>
      </Toolbar>
    </AppBar>
  );
}
