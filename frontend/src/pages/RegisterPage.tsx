import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, Grid, InputAdornment, IconButton } from '@mui/material';
import {
  Person, Email, Lock, Visibility, VisibilityOff,
  AutoAwesomeOutlined, SecurityOutlined, TuneOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

/* ── Hexagon Logo SVG ── */
const HexLogo = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="hex-r" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00d4aa" />
        <stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path d="M24 4 L42 14 L42 34 L24 44 L6 34 L6 14 Z" fill="url(#hex-r)" />
    <path d="M24 12 L33 17 L33 29 L24 34 L15 29 L15 17 Z" fill="#080c18" opacity="0.65" />
    <path d="M24 18 L28 20.5 L28 26.5 L24 29 L20 26.5 L20 20.5 Z" fill="url(#hex-r)" opacity="0.55" />
  </svg>
);

const PERKS = [
  { icon: AutoAwesomeOutlined, title: 'Instant Setup', desc: 'Create queues and start scheduling jobs in under 60 seconds' },
  { icon: SecurityOutlined, title: 'Enterprise Security', desc: 'Role-based access with JWT authentication and API key support' },
  { icon: TuneOutlined, title: 'Full Control', desc: 'Fine-tune concurrency, rate limits, priorities, and retry policies' },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(formData);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden',
      background: '#050816',
    }}>
      {/* Background elements */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <Box sx={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        top: '-20%', right: '-10%', filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 70%)',
        bottom: '-15%', left: '-5%', filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* ══════ LEFT — Register Form ══════ */}
      <Box sx={{
        flex: { xs: 1, md: '0 0 520px' },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        px: 3, py: 4, position: 'relative',
        animation: 'fadeInLeft 0.6s ease both',
      }}>
        <Box sx={{
          width: '100%', maxWidth: 440,
          background: 'rgba(10,14,28,0.8)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          p: 4,
        }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ animation: 'pulse-glow 4s ease-in-out infinite', borderRadius: '14px' }}>
              <HexLogo size={40} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: '1.15rem',
                background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
                backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>JobFlow</Typography>
              <Typography sx={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600, letterSpacing: '0.1em' }}>
                DISTRIBUTED SCHEDULER
              </Typography>
            </Box>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, color: '#e2e8f0', mb: 0.5 }}>Create account</Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 3 }}>Join the platform and start scheduling</Typography>

          {error && (
            <Alert severity="error" sx={{
              mb: 2, borderRadius: '12px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            }}>{error}</Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField fullWidth label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required autoFocus
                  InputProps={{ startAdornment: <InputAdornment position="start"><Person sx={{ color: '#475569', fontSize: 18 }} /></InputAdornment> }} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
              </Grid>
            </Grid>
            <TextField fullWidth label="Email address" type="email" name="email" value={formData.email} onChange={handleChange} margin="normal" required
              InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: '#475569', fontSize: 18 }} /></InputAdornment> }} />
            <TextField fullWidth label="Password" type={showPw ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} margin="normal" required helperText="Minimum 8 characters"
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock sx={{ color: '#475569', fontSize: 18 }} /></InputAdornment>,
                endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small" sx={{ color: '#475569' }}>{showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>,
              }} />
            <Button fullWidth type="submit" variant="contained" size="large" disabled={loading}
              sx={{
                mt: 3, mb: 2, py: 1.6, fontSize: '0.95rem', fontWeight: 700, borderRadius: '12px',
                background: 'linear-gradient(135deg, #00d4aa 0%, #7c3aed 100%)',
                boxShadow: '0 4px 24px rgba(0,212,170,0.3)',
                '&:hover': { boxShadow: '0 8px 32px rgba(0,212,170,0.45)', transform: 'translateY(-1px)' },
                transition: 'all 0.25s ease',
              }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>

          <Typography align="center" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#00d4aa', fontWeight: 700, textDecoration: 'none' }}>Sign in</Link>
          </Typography>
        </Box>
      </Box>

      {/* ══════ RIGHT — Info Section ══════ */}
      <Box sx={{
        flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column',
        justifyContent: 'center', px: 6, py: 5, position: 'relative',
        animation: 'fadeInRight 0.6s ease both',
      }}>
        <Box sx={{ maxWidth: 460, mx: 'auto' }}>
          <Typography sx={{
            fontSize: '2rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.25, mb: 1.5,
            letterSpacing: '-0.02em',
          }}>
            Start Automating<br />Your Workflows
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.95rem', mb: 4, lineHeight: 1.7 }}>
            Create your account and immediately gain access to powerful job scheduling, real-time analytics, and worker management tools.
          </Typography>

          {/* Perks list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {PERKS.map((p, i) => (
              <Box key={p.title} sx={{
                display: 'flex', gap: 2, p: 2.5, borderRadius: '14px',
                background: 'rgba(10,14,28,0.7)', border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                animation: `fadeInUp 0.5s ease ${0.2 + i * 0.1}s both`,
                transition: 'all 0.25s ease',
                '&:hover': {
                  borderColor: 'rgba(124,58,237,0.3)',
                  transform: 'translateX(6px)',
                },
              }}>
                <Box sx={{
                  width: 40, height: 40, borderRadius: '10px', flexShrink: 0,
                  background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <p.icon sx={{ color: '#7c3aed', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.875rem', mb: 0.3 }}>
                    {p.title}
                  </Typography>
                  <Typography sx={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.5 }}>
                    {p.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
