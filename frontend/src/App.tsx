import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import QueuesPage from './pages/QueuesPage';
import JobsPage from './pages/JobsPage';
import WorkersPage from './pages/WorkersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00d4aa', light: '#33e0be', dark: '#00a886' },
    secondary: { main: '#7c3aed', light: '#9d5ff0', dark: '#5b21b6' },
    success: { main: '#10b981', light: '#34d399' },
    warning: { main: '#f59e0b', light: '#fbbf24' },
    error: { main: '#ef4444', light: '#f87171' },
    info: { main: '#3b82f6', light: '#60a5fa' },
    background: {
      default: '#050816',
      paper: '#0a0e1a',
    },
    text: {
      primary: '#e2e8f0',
      secondary: '#94a3b8',
    },
    divider: 'rgba(255,255,255,0.06)',
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h4: { fontWeight: 800, letterSpacing: '-0.5px' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '8px 22px',
          transition: 'all 0.25s ease',
          '&:hover': { transform: 'translateY(-1px)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00d4aa 0%, #7c3aed 100%)',
          boxShadow: '0 4px 20px rgba(0,212,170,0.3)',
          '&:hover': { boxShadow: '0 6px 28px rgba(0,212,170,0.45)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          background: 'rgba(10,14,28,0.85)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.05)',
        },
        head: {
          background: 'rgba(0,212,170,0.06)',
          fontWeight: 600,
          color: '#94a3b8',
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 0.2s',
          '&:hover': { background: 'rgba(0,212,170,0.04)' },
          '&:last-child td': { border: 0 },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(0,212,170,0.4)' },
            '&.Mui-focused fieldset': { borderColor: '#00d4aa' },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: '#0a0e1a',
          border: '1px solid rgba(0,212,170,0.2)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          borderRadius: 20,
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  const { checkAuth } = useAuthStore();
  useEffect(() => { checkAuth(); }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="queues" element={<QueuesPage />} />
              <Route path="jobs" element={<JobsPage />} />
              <Route path="workers" element={<WorkersPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
