import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, InputAdornment, IconButton } from '@mui/material';
import {
  Email, Lock, Visibility, VisibilityOff,
  RocketLaunchOutlined, SpeedOutlined, GroupsOutlined, InsightsOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

/* ── Hexagon Logo SVG ─────────────────────────────── */
const HexLogo = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="hex-g" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00d4aa" />
        <stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path d="M24 4 L42 14 L42 34 L24 44 L6 34 L6 14 Z" fill="url(#hex-g)" />
    <path d="M24 12 L33 17 L33 29 L24 34 L15 29 L15 17 Z" fill="#080c18" opacity="0.65" />
    <path d="M24 18 L28 20.5 L28 26.5 L24 29 L20 26.5 L20 20.5 Z" fill="url(#hex-g)" opacity="0.55" />
  </svg>
);

const FEATURES = [
  { icon: RocketLaunchOutlined, title: 'Lightning Fast', desc: 'Process thousands of jobs per second with optimised queues' },
  { icon: SpeedOutlined, title: 'Priority Scheduling', desc: 'Weighted priority queues ensure critical jobs run first' },
  { icon: GroupsOutlined, title: 'Worker Clusters', desc: 'Auto-scaling workers with real-time health monitoring' },
  { icon: InsightsOutlined, title: 'Live Analytics', desc: 'Rich dashboards and charts to track every metric' },
];

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
      minHeight: '100vh', display: 'flex', position: 'relative', overflow: 'hidden',
      background: '#050816',
    }}>
      {/* ── Animated background particles ── */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <Box sx={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,170,0.12) 0%, transparent 70%)',
        top: '-25%', left: '-15%', filter: 'blur(60px)', pointerEvents: 'none',
      }} />
      <Box sx={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        bottom: '-20%', right: '-10%', filter: 'blur(60px)', pointerEvents: 'none',
      }} />

      {/* ══════ LEFT — Info Card ══════ */}
      <Box sx={{
        flex: 1, display: { xs: 'none', md: 'flex' }, flexDirection: 'column',
        justifyContent: 'center', px: 6, py: 5, position: 'relative',
        animation: 'fadeInLeft 0.6s ease both',
      }}>
        {/* Orbiting decorative ring */}
        <Box sx={{
          position: 'absolute', top: '10%', right: '5%',
          width: 140, height: 140, borderRadius: '50%',
          border: '1px solid rgba(0,212,170,0.15)',
          animation: 'spin-slow 30s linear infinite',
          '&::after': {
            content: '""', position: 'absolute', top: -4, left: '50%',
            width: 8, height: 8, borderRadius: '50%',
            background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
            boxShadow: '0 0 12px rgba(0,212,170,0.6)',
          },
        }} />

        <Box sx={{ maxWidth: 520, mx: 'auto' }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
            <Box sx={{ animation: 'pulse-glow 4s ease-in-out infinite', borderRadius: '14px' }}>
              <HexLogo size={52} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 900, fontSize: '1.6rem', letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
                backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                JobFlow
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Distributed Job Scheduler
              </Typography>
            </Box>
          </Box>

          <Typography sx={{
            fontSize: '2.2rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1.2, mb: 1.5,
            letterSpacing: '-0.02em',
          }}>
            Schedule, Monitor &<br />Scale Jobs Effortlessly
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '1rem', mb: 5, lineHeight: 1.7, maxWidth: 420 }}>
            A powerful distributed job scheduling platform with real-time monitoring, priority queues, and intelligent worker management.
          </Typography>

          {/* Feature grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {FEATURES.map((f, i) => (
              <Box key={f.title} sx={{
                p: 2.5, borderRadius: '14px',
                background: 'rgba(10,14,28,0.7)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.25s ease',
                animation: `fadeInUp 0.5s ease ${0.15 + i * 0.1}s both`,
                '&:hover': {
                  borderColor: 'rgba(0,212,170,0.3)',
                  transform: 'translateY(-3px)',
                  boxShadow: '0 8px 32px rgba(0,212,170,0.12)',
                },
              }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: '10px', mb: 1.5,
                  background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <f.icon sx={{ color: '#00d4aa', fontSize: 18 }} />
                </Box>
                <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.85rem', mb: 0.5 }}>
                  {f.title}
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  {f.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* ══════ RIGHT — Login Form ══════ */}
      <Box sx={{
        flex: { xs: 1, md: '0 0 480px' },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        px: 3, py: 4, position: 'relative',
        animation: 'fadeInRight 0.6s ease both',
      }}>
        <Box sx={{
          width: '100%', maxWidth: 400,
          background: 'rgba(10,14,28,0.8)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,170,0.06)',
          p: 4,
        }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 3 }}>
            <HexLogo size={38} />
            <Typography sx={{
              fontWeight: 800, fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
              backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>JobFlow</Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, color: '#e2e8f0', mb: 0.5, letterSpacing: '-0.01em' }}>
            Welcome back
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '0.875rem', mb: 3.5 }}>
            Sign in to your dashboard
          </Typography>

          {error && (
            <Alert severity="error" sx={{
              mb: 2, borderRadius: '12px',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              '& .MuiAlert-icon': { color: '#ef4444' },
            }}>
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
                mt: 3.5, mb: 2.5, py: 1.6, fontSize: '0.95rem', fontWeight: 700,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #00d4aa 0%, #7c3aed 100%)',
                boxShadow: '0 4px 24px rgba(0,212,170,0.3)',
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(0,212,170,0.45)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.25s ease',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <Typography align="center" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{
              color: '#00d4aa', fontWeight: 700, textDecoration: 'none',
            }}>
              Create one
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
