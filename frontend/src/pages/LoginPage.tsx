import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, InputAdornment, IconButton } from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, BoltOutlined as BoltIcon } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: '#080c18',
    }}>
      {/* Animated gradient blobs */}
      <Box sx={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
        top: '-20%', left: '-10%', filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)',
        bottom: '-15%', right: '-5%', filter: 'blur(40px)', pointerEvents: 'none',
      }} />
      {/* Grid pattern */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Login card */}
      <Box sx={{
        position: 'relative', width: '100%', maxWidth: 420, mx: 2,
        background: 'rgba(13,17,32,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(124,58,237,0.25)',
        borderRadius: '20px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
        p: 4,
        animation: 'fadeInUp 0.5s ease both',
      }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(124,58,237,0.5)',
            animation: 'pulse-glow 3s ease-in-out infinite',
          }}>
            <BoltIcon sx={{ color: '#fff', fontSize: 24 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#e2e8f0' }}>JobFlow</Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.1em' }}>
              DISTRIBUTED SCHEDULER
            </Typography>
          </Box>
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 700, color: '#e2e8f0', mb: 0.5 }}>
          Welcome back
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 3 }}>
          Sign in to your dashboard
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth label="Email address" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            margin="normal" required autoFocus
            InputProps={{
              startAdornment: <InputAdornment position="start"><Email sx={{ color: '#475569', fontSize: 18 }} /></InputAdornment>,
            }}
          />
          <TextField
            fullWidth label="Password" type={showPw ? 'text' : 'password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            margin="normal" required
            InputProps={{
              startAdornment: <InputAdornment position="start"><Lock sx={{ color: '#475569', fontSize: 18 }} /></InputAdornment>,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small" sx={{ color: '#475569' }}>
                    {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button
            fullWidth type="submit" variant="contained" size="large"
            disabled={loading}
            sx={{
              mt: 3, mb: 2, py: 1.5, fontSize: '0.95rem',
              background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
              boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              '&:hover': { boxShadow: '0 6px 28px rgba(124,58,237,0.6)' },
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <Typography align="center" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
            Create one
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
