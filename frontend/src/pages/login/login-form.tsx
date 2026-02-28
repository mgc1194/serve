import { Alert, Box, Button, Link, TextField } from '@mui/material';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';

import { useAuth } from '@context/auth-context';
import { login } from '@services/auth';

export function LoginForm() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ email, password });
      setUser(user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <TextField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        fullWidth
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      <TextField
        id="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        required
        fullWidth
        value={password}
        onChange={e => setPassword(e.target.value)}
      />

      {error && (
        <Alert severity="error">
          {error}{' '}
          <Link component={RouterLink} to="/register" fontWeight={600}>
            Create an account
          </Link>
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isSubmitting}
        size="large"
        sx={{ mt: 1 }}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </Box>
  );
}
