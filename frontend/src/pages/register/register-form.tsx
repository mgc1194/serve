// pages/register/register-form.tsx — Registration form component.
import { Alert, Box, Button, TextField } from '@mui/material';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';


import { useAuth } from '@serve/context/auth-context';
import { register } from '@serve/services/auth';

export function RegisterForm() {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await register({
        email,
        password,
        confirm_password: confirmPassword,
        first_name: firstName,
        last_name: lastName,
      });
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
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          id="firstName"
          label="First name"
          autoComplete="given-name"
          fullWidth
          value={firstName}
          onChange={e => setFirstName(e.target.value)}
        />
        <TextField
          id="lastName"
          label="Last name"
          autoComplete="family-name"
          fullWidth
          value={lastName}
          onChange={e => setLastName(e.target.value)}
        />
      </Box>

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
        autoComplete="new-password"
        required
        fullWidth
        value={password}
        onChange={e => setPassword(e.target.value)}
        helperText="At least 14 characters with uppercase, lowercase, a number, and a special character."
      />
      <TextField
        id="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        required
        fullWidth
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={isSubmitting}
        size="large"
        sx={{ mt: 1 }}
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </Button>
    </Box>
  );
}
