import { useQuery } from '@tanstack/react-query';
import { Box, Typography, CircularProgress, LinearProgress, Grid } from '@mui/material';
import {
  FiberManualRecord as DotIcon,
  MemoryOutlined as MemIcon,
  SpeedOutlined as CpuIcon,
  ComputerOutlined as CompIcon,
} from '@mui/icons-material';
import { workersApi } from '../services/api';
import { formatDistanceToNow } from 'date-fns';

const STATUS_MAP: Record<string, { color: string; bg: string; label: string }> = {
  IDLE: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Idle' },
  BUSY: { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', label: 'Busy' },
  SHUTTING_DOWN: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Shutting Down' },
  STOPPED: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Stopped' },
};

export default function WorkersPage() {
  const { data: workersData, isLoading, error } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => (await workersApi.list()).data,
    refetchInterval: 3000,
  });
  const workers = workersData?.workers || [];

  if (isLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <CircularProgress sx={{ color: '#7c3aed' }} />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{
          background: 'linear-gradient(90deg,#e2e8f0,#94a3b8)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>Workers</Typography>
        <Typography sx={{ color: '#475569', fontSize: '0.875rem', mt: 0.5 }}>
          {workers.length} worker{workers.length !== 1 ? 's' : ''} registered — refreshes every 3s
        </Typography>
      </Box>

      {error && <Typography sx={{ color: '#ef4444', mb: 2 }}>Error loading workers</Typography>}

      {workers.length === 0 ? (
        <Box sx={{
          py: 8, textAlign: 'center',
          background: 'rgba(13,17,32,0.5)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <CompIcon sx={{ fontSize: 48, color: '#334155', mb: 2 }} />
          <Typography sx={{ color: '#475569' }}>No active workers. Start the worker service to process jobs.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {workers.map((worker: any, i: number) => {
            const latestHb = worker.heartbeats?.[0];
            const st = STATUS_MAP[worker.status] || STATUS_MAP['STOPPED'];
            const cpuPct = latestHb?.cpuUsage != null ? Math.min(latestHb.cpuUsage * 100, 100) : null;
            const memMb = latestHb?.memoryUsage != null ? Math.round(latestHb.memoryUsage) : null;
            const memPct = memMb != null ? Math.min((memMb / 512) * 100, 100) : null;
            const jobPct = worker.maxConcurrency > 0 ? (worker.currentJobs / worker.maxConcurrency) * 100 : 0;

            return (
              <Grid item xs={12} md={6} xl={4} key={worker.id}>
                <Box sx={{
                  p: 3, borderRadius: '16px',
                  background: 'rgba(13,17,32,0.85)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  backdropFilter: 'blur(12px)',
                  animation: `fadeInUp 0.4s ease ${i * 0.08}s both`,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' },
                }}>
                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: '12px',
                        background: `${st.color}18`, border: `1px solid ${st.color}35`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CompIcon sx={{ color: st.color, fontSize: 20 }} />
                      </Box>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.875rem' }} noWrap>
                          {worker.name}
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: '0.72rem' }}>{worker.hostname}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 0.7,
                      px: 1.5, py: 0.5, borderRadius: 6,
                      background: st.bg, border: `1px solid ${st.color}35`,
                      height: 'fit-content',
                    }}>
                      <DotIcon sx={{
                        fontSize: 8, color: st.color,
                        animation: worker.status === 'BUSY' ? 'running-pulse 1.5s ease-in-out infinite' : 'none',
                      }} />
                      <Typography sx={{ fontSize: '0.72rem', color: st.color, fontWeight: 700 }}>
                        {st.label}
                      </Typography>
                    </Box>
                  </Box>

                  {/* PID / Jobs */}
                  <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
                    <Box sx={{ flex: 1, p: 1.5, borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography sx={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>PID</Typography>
                      <Typography sx={{ fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{worker.pid}</Typography>
                    </Box>
                    <Box sx={{ flex: 1, p: 1.5, borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography sx={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.3 }}>Jobs</Typography>
                      <Typography sx={{ fontWeight: 700, color: '#06b6d4' }}>
                        {worker.currentJobs} <span style={{ color: '#334155' }}>/ {worker.maxConcurrency}</span>
                      </Typography>
                    </Box>
                  </Box>

                  {/* Job usage bar */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Job Load</Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>{Math.round(jobPct)}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={jobPct} sx={{
                      height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)',
                      '& .MuiLinearProgress-bar': { background: jobPct > 80 ? '#ef4444' : 'linear-gradient(90deg,#7c3aed,#06b6d4)', borderRadius: 3 },
                    }} />
                  </Box>

                  {/* CPU */}
                  {cpuPct != null && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CpuIcon sx={{ fontSize: 13, color: '#64748b' }} />
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>CPU</Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.72rem', color: cpuPct > 80 ? '#ef4444' : '#94a3b8', fontWeight: 700 }}>{Math.round(cpuPct)}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={cpuPct} sx={{
                        height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)',
                        '& .MuiLinearProgress-bar': { background: cpuPct > 80 ? '#ef4444' : '#f59e0b', borderRadius: 3 },
                      }} />
                    </Box>
                  )}

                  {/* Memory */}
                  {memMb != null && memPct != null && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MemIcon sx={{ fontSize: 13, color: '#64748b' }} />
                          <Typography sx={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Memory</Typography>
                        </Box>
                        <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700 }}>{memMb} MB</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={memPct} sx={{
                        height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)',
                        '& .MuiLinearProgress-bar': { background: '#10b981', borderRadius: 3 },
                      }} />
                    </Box>
                  )}

                  {/* Heartbeat */}
                  <Box sx={{ pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 0.7 }}>
                    <DotIcon sx={{ fontSize: 8, color: '#10b981' }} />
                    <Typography sx={{ fontSize: '0.72rem', color: '#475569' }}>
                      Last seen {formatDistanceToNow(new Date(worker.lastHeartbeat), { addSuffix: true })}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
