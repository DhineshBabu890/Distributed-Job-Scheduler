import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Typography, Tooltip, IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Queue as QueueIcon,
  Work as WorkIcon,
  Computer as ComputerIcon,
  InsightsOutlined as AnalyticsIcon,
  Logout as LogoutIcon,
  FiberManualRecord as DotIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const DRAWER_W = 264;

/* ── Hexagon Logo SVG ── */
const HexLogo = ({ size = 34 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <defs>
      <linearGradient id="hex-s" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#00d4aa" />
        <stop offset="1" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path d="M24 4 L42 14 L42 34 L24 44 L6 34 L6 14 Z" fill="url(#hex-s)" />
    <path d="M24 12 L33 17 L33 29 L24 34 L15 29 L15 17 Z" fill="#080c18" opacity="0.65" />
    <path d="M24 18 L28 20.5 L28 26.5 L24 29 L20 26.5 L20 20.5 Z" fill="url(#hex-s)" opacity="0.55" />
  </svg>
);

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', color: '#00d4aa' },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics', color: '#3b82f6' },
  { text: 'Queues', icon: <QueueIcon />, path: '/queues', color: '#7c3aed' },
  { text: 'Jobs', icon: <WorkIcon />, path: '/jobs', color: '#f59e0b' },
  { text: 'Workers', icon: <ComputerIcon />, path: '/workers', color: '#ef4444' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [time, setTime] = useState(new Date());
  const queryClient = useQueryClient();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const socket = io('/', { path: '/socket.io', transports: ['websocket'] });
    socket.on('job:update', () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['queues'] });
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    });
    return () => { socket.disconnect(); };
  }, [queryClient]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#050816' }}>

      {/* ── SIDEBAR ── */}
      <Box sx={{
        width: DRAWER_W, flexShrink: 0, display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        background: 'rgba(8,12,24,0.9)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        zIndex: 1200,
      }}>
        {/* Logo */}
        <Box sx={{ px: 3, pt: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ animation: 'pulse-glow 4s ease-in-out infinite', borderRadius: '10px' }}>
              <HexLogo size={34} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 900, fontSize: '1rem',
                background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
                backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1.1,
              }}>
                JobFlow
              </Typography>
              <Typography sx={{ fontSize: '0.62rem', color: '#475569', fontWeight: 600, letterSpacing: '0.08em' }}>
                SCHEDULER
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Nav items */}
        <Box sx={{ flex: 1, px: 1.5, pt: 2 }}>
          <Typography sx={{
            px: 1.5, mb: 1.5, fontSize: '0.62rem', color: '#334155', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            Navigation
          </Typography>
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {menuItems.map((item) => {
              const active = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton onClick={() => navigate(item.path)} sx={{
                    borderRadius: '12px',
                    py: 1.2, px: 1.5,
                    position: 'relative',
                    background: active ? `${item.color}12` : 'transparent',
                    border: active ? `1px solid ${item.color}25` : '1px solid transparent',
                    '&:hover': { background: `${item.color}0a`, borderColor: `${item.color}18` },
                    transition: 'all 0.2s ease',
                    overflow: 'hidden',
                  }}>
                    {/* Active left edge glow */}
                    {active && (
                      <Box sx={{
                        position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3,
                        borderRadius: '0 3px 3px 0',
                        background: `linear-gradient(180deg, ${item.color}, transparent)`,
                        boxShadow: `0 0 12px ${item.color}80`,
                      }} />
                    )}
                    <ListItemIcon sx={{ minWidth: 36, color: active ? item.color : '#475569' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: active ? 700 : 500,
                        fontSize: '0.85rem',
                        color: active ? item.color : '#94a3b8',
                      }}
                    />
                    {active && (
                      <Box sx={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: item.color,
                        boxShadow: `0 0 10px ${item.color}`,
                      }} />
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* User card */}
        <Box sx={{
          m: 1.5, p: 2, borderRadius: '14px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Avatar sx={{
            width: 36, height: 36, fontSize: '0.75rem', fontWeight: 700,
            background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
            boxShadow: '0 0 14px rgba(0,212,170,0.35)',
          }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.2 }} noWrap>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DotIcon sx={{ fontSize: 7, color: '#10b981' }} />
              <Typography sx={{ fontSize: '0.68rem', color: '#475569' }}>Online</Typography>
            </Box>
          </Box>
          <Tooltip title="Logout">
            <IconButton size="small" onClick={handleLogout} sx={{
              color: '#475569',
              '&:hover': { color: '#ef4444', background: 'rgba(239,68,68,0.1)' },
            }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── MAIN CONTENT ── */}
      <Box sx={{ flex: 1, ml: `${DRAWER_W}px`, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top bar */}
        <Box sx={{
          height: 56, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 1100,
          background: 'rgba(5,8,22,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#e2e8f0' }}>
            {menuItems.find(m =>
              location.pathname === m.path ||
              (m.path !== '/' && location.pathname.startsWith(m.path))
            )?.text ?? 'Dashboard'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#334155', fontFamily: 'monospace', fontWeight: 500 }}>
              {time.toLocaleTimeString()}
            </Typography>
            <Box sx={{
              px: 1.5, py: 0.4, borderRadius: 8,
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.2)',
              display: 'flex', alignItems: 'center', gap: 0.7,
            }}>
              <DotIcon sx={{ fontSize: 7, color: '#10b981', animation: 'running-pulse 2s ease-in-out infinite' }} />
              <Typography sx={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>Live</Typography>
            </Box>
          </Box>
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, p: 3, animation: 'fadeInUp 0.35s ease both' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
