import { Box, Grid, Typography, CircularProgress } from '@mui/material';
import {
  Queue as QueueIcon, Work as WorkIcon,
  CheckCircle, ErrorOutline,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { queuesApi } from '../services/api';

const CARDS = [
  { key: 'activeQueues', label: 'Active Queues', color: '#7c3aed', icon: QueueIcon, glow: 'rgba(124,58,237,0.35)' },
  { key: 'totalJobs', label: 'Total Jobs', color: '#06b6d4', icon: WorkIcon, glow: 'rgba(6,182,212,0.35)' },
  { key: 'completedJobs', label: 'Completed', color: '#10b981', icon: CheckCircle, glow: 'rgba(16,185,129,0.35)' },
  { key: 'failedJobs', label: 'Failed', color: '#ef4444', icon: ErrorOutline, glow: 'rgba(239,68,68,0.35)' },
];

export default function DashboardPage() {
  const { data: queuesData, isLoading, error } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await queuesApi.list()).data,
    refetchInterval: 3000,
  });

  const queues = queuesData?.queues || [];
  const stats = queues.reduce(
    (acc: any, q: any) => {
      const s = q.statistics || {};
      acc.totalJobs += s.totalJobs || 0;
      acc.completedJobs += s.completedJobs || 0;
      acc.failedJobs += s.failedJobs || 0;
      if (!q.isPaused) acc.activeQueues += 1;
      return acc;
    },
    { activeQueues: 0, totalJobs: 0, completedJobs: 0, failedJobs: 0 }
  );

  if (isLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <CircularProgress sx={{ color: '#7c3aed' }} />
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{
          background: 'linear-gradient(90deg,#e2e8f0,#94a3b8)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Dashboard
        </Typography>
        <Typography sx={{ color: '#475569', fontSize: '0.875rem', mt: 0.5 }}>
          Live system overview — auto-refreshes every 3s
        </Typography>
      </Box>

      {error && (
        <Typography sx={{ color: '#ef4444', mb: 2 }}>Error loading data</Typography>
      )}

      {/* Stat cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <Grid item xs={12} sm={6} md={3} key={card.key}>
              <Box sx={{
                p: 3, borderRadius: '16px',
                background: 'rgba(13,17,32,0.85)',
                border: `1px solid ${card.color}22`,
                backdropFilter: 'blur(12px)',
                position: 'relative', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                animation: `fadeInUp 0.4s ease ${i * 0.08}s both`,
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: `0 12px 40px ${card.glow}`,
                },
              }}>
                {/* Background glow */}
                <Box sx={{
                  position: 'absolute', top: -20, right: -20,
                  width: 100, height: 100, borderRadius: '50%',
                  background: `radial-gradient(circle, ${card.color}22 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}>
                      {card.label}
                    </Typography>
                    <Typography sx={{ fontSize: '2.4rem', fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>
                      {value}
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: `${card.color}22`,
                    border: `1px solid ${card.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon sx={{ color: card.color, fontSize: 22 }} />
                  </Box>
                </Box>

                {/* Bottom accent line */}
                <Box sx={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, ${card.color}, transparent)`,
                }} />
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Welcome banner */}
      <Box sx={{
        p: 3, borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.08) 100%)',
        border: '1px solid rgba(124,58,237,0.2)',
        backdropFilter: 'blur(12px)',
      }}>
        <Typography variant="h6" sx={{ color: '#e2e8f0', mb: 0.5 }}>Getting Started</Typography>
        <Typography sx={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.7 }}>
          Create a <strong style={{ color: '#7c3aed' }}>Queue</strong> first, then add{' '}
          <strong style={{ color: '#10b981' }}>Jobs</strong> to it. The worker will automatically
          pick them up and process them. Monitor live progress on this dashboard.
        </Typography>

        {queues.length > 0 && (
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
              Active Queues
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {queues.map((q: any) => (
                <Box key={q.id} sx={{
                  px: 2, py: 0.7, borderRadius: '8px',
                  background: q.isPaused ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                  border: `1px solid ${q.isPaused ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
                  display: 'flex', alignItems: 'center', gap: 1,
                }}>
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: q.isPaused ? '#f59e0b' : '#10b981',
                  }} />
                  <Typography sx={{ fontSize: '0.8rem', color: q.isPaused ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                    {q.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
