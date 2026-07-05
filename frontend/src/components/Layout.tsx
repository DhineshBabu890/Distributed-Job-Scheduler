import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Avatar, Typography, Tooltip, IconButton, Menu, MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Queue as QueueIcon,
  Work as WorkIcon,
  Computer as ComputerIcon,
  Logout as LogoutIcon,
  FiberManualRecord as DotIcon,
  BoltOutlined as BoltIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const DRAWER_W = 260;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', color: '#7c3aed' },
  { text: 'Queues', icon: <QueueIcon />, path: '/queues', color: '#06b6d4' },
  { text: 'Jobs', icon: <WorkIcon />, path: '/jobs', color: '#10b981' },
  { text: 'Workers', icon: <ComputerIcon />, path: '/workers', color: '#f59e0b' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#080c18' }}>

      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <Box sx={{
        width: DRAWER_W, flexShrink: 0, display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        background: 'rgba(10,14,26,0.85)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        zIndex: 1200,
      }}>
        {/* Logo */}
        <Box sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(124,58,237,0.5)',
            }}>
              <BoltIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.1 }}>
                JobFlow
              </Typography>
              <Typography sx={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 500, letterSpacing: '0.05em' }}>
                SCHEDULER
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Nav items */}
        <Box sx={{ flex: 1, px: 1.5, pt: 1 }}>
          <Typography sx={{ px: 1.5, mb: 1, fontSize: '0.65rem', color: '#475569', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Navigation
          </Typography>
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {menuItems.map((item) => {
              const active = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton onClick={() => navigate(item.path)} sx={{
                    borderRadius: '10px',
                    py: 1.2, px: 1.5,
                    background: active ? `${item.color}18` : 'transparent',
                    border: active ? `1px solid ${item.color}30` : '1px solid transparent',
                    '&:hover': { background: `${item.color}12`, borderColor: `${item.color}22` },
                    transition: 'all 0.15s ease',
                  }}>
                    <ListItemIcon sx={{ minWidth: 36, color: active ? item.color : '#475569' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: active ? 700 : 500,
                        fontSize: '0.875rem',
                        color: active ? item.color : '#94a3b8',
                      }}
                    />
                    {active && (
                      <Box sx={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: item.color,
                        boxShadow: `0 0 8px ${item.color}`,
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
          m: 1.5, p: 1.5, borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <Avatar sx={{
            width: 34, height: 34, fontSize: '0.75rem', fontWeight: 700,
            background: 'linear-gradient(135deg,#7c3aed,#06b6d4)',
            boxShadow: '0 0 12px rgba(124,58,237,0.4)',
          }}>
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#e2e8f0', lineHeight: 1.2 }} noWrap>
              {user?.firstName} {user?.lastName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DotIcon sx={{ fontSize: 8, color: '#10b981' }} />
              <Typography sx={{ fontSize: '0.7rem', color: '#64748b' }}>Online</Typography>
            </Box>
          </Box>
          <Tooltip title="Logout">
            <IconButton size="small" onClick={handleLogout} sx={{ color: '#475569', '&:hover': { color: '#ef4444' } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <Box sx={{ flex: 1, ml: `${DRAWER_W}px`, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Top bar */}
        <Box sx={{
          height: 60, px: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 1100,
          background: 'rgba(8,12,24,0.8)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>
            {menuItems.find(m =>
              location.pathname === m.path ||
              (m.path !== '/' && location.pathname.startsWith(m.path))
            )?.text ?? 'Dashboard'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#475569', fontFamily: 'monospace' }}>
              {time.toLocaleTimeString()}
            </Typography>
            <Box sx={{
              px: 1.5, py: 0.4, borderRadius: 6,
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', gap: 0.7,
            }}>
              <DotIcon sx={{ fontSize: 8, color: '#10b981', animation: 'running-pulse 2s ease-in-out infinite' }} />
              <Typography sx={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Live</Typography>
            </Box>
          </Box>
        </Box>

        {/* Page content */}
        <Box sx={{ flex: 1, p: 3, animation: 'fadeInUp 0.3s ease both' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
