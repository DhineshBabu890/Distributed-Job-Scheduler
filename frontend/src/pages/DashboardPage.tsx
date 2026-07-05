import { Box, Grid, Typography, CircularProgress } from '@mui/material';
import {
  Queue as QueueIcon, Work as WorkIcon,
  CheckCircle, ErrorOutline, TrendingUp,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { queuesApi, jobsApi } from '../services/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip as RTooltip,
  CartesianGrid,
} from 'recharts';

const CARDS = [
  { key: 'activeQueues', label: 'Active Queues', color: '#00d4aa', icon: QueueIcon, glow: 'rgba(0,212,170,0.3)' },
  { key: 'totalJobs', label: 'Total Jobs', color: '#7c3aed', icon: WorkIcon, glow: 'rgba(124,58,237,0.3)' },
  { key: 'completedJobs', label: 'Completed', color: '#10b981', icon: CheckCircle, glow: 'rgba(16,185,129,0.3)' },
  { key: 'failedJobs', label: 'Failed', color: '#ef4444', icon: ErrorOutline, glow: 'rgba(239,68,68,0.3)' },
];

const PIE_COLORS = ['#10b981', '#7c3aed', '#ef4444', '#3b82f6', '#f59e0b'];

export default function DashboardPage() {
  const { data: queuesData, isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await queuesApi.list()).data,
    refetchInterval: 3000,
  });

  const { data: jobsData } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => (await jobsApi.list()).data,
    refetchInterval: 3000,
  });

  const queues = queuesData?.queues || [];
  const jobs = jobsData?.data || [];

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

  /* Job status distribution for donut chart */
  const statusCounts: Record<string, number> = {};
  jobs.forEach((j: any) => {
    statusCounts[j.status] = (statusCounts[j.status] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  /* Jobs per queue for area chart */
  const queueChartData = queues.map((q: any) => ({
    name: q.name?.length > 10 ? q.name.slice(0, 10) + '…' : q.name,
    total: q.statistics?.totalJobs || 0,
    completed: q.statistics?.completedJobs || 0,
    failed: q.statistics?.failedJobs || 0,
  }));

  /* Recent jobs for activity feed */
  const recentJobs = [...jobs]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const statusColor: Record<string, string> = {
    COMPLETED: '#10b981', RUNNING: '#3b82f6', FAILED: '#ef4444',
    QUEUED: '#94a3b8', DEAD_LETTER: '#f87171', CANCELLED: '#64748b',
  };

  if (isLoading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress sx={{ color: '#00d4aa' }} />
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{
          background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
          backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Dashboard
        </Typography>
        <Typography sx={{ color: '#334155', fontSize: '0.85rem', mt: 0.5 }}>
          Live system overview — auto-refreshes every 3 seconds
        </Typography>
      </Box>

      {/* ── Stat Cards ── */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {CARDS.map((card, i) => {
          const Icon = card.icon;
          const value = stats[card.key];
          return (
            <Grid item xs={12} sm={6} md={3} key={card.key}>
              <Box sx={{
                p: 3, borderRadius: '18px',
                background: 'rgba(10,14,28,0.9)',
                border: `1px solid ${card.color}18`,
                backdropFilter: 'blur(12px)',
                position: 'relative', overflow: 'hidden',
                transition: 'transform 0.25s, box-shadow 0.25s',
                animation: `fadeInUp 0.4s ease ${i * 0.08}s both`,
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: `0 16px 48px ${card.glow}`,
                  borderColor: `${card.color}40`,
                },
              }}>
                <Box sx={{
                  position: 'absolute', top: -30, right: -30,
                  width: 120, height: 120, borderRadius: '50%',
                  background: `radial-gradient(circle, ${card.color}15 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />

                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{
                      fontSize: '0.7rem', color: '#475569', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1,
                    }}>
                      {card.label}
                    </Typography>
                    <Typography sx={{
                      fontSize: '2.6rem', fontWeight: 900, color: '#e2e8f0', lineHeight: 1,
                      letterSpacing: '-0.02em',
                    }}>
                      {value}
                    </Typography>
                  </Box>
                  <Box sx={{
                    width: 46, height: 46, borderRadius: '14px',
                    background: `${card.color}15`,
                    border: `1px solid ${card.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon sx={{ color: card.color, fontSize: 22 }} />
                  </Box>
                </Box>

                <Box sx={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                  background: `linear-gradient(90deg, ${card.color}, transparent)`,
                }} />
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Charts Row ── */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Donut Chart */}
        <Grid item xs={12} md={4}>
          <Box sx={{
            p: 3, borderRadius: '18px', height: 320,
            background: 'rgba(10,14,28,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeInUp 0.5s ease 0.3s both',
          }}>
            <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', mb: 2 }}>
              Job Status Distribution
            </Typography>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie
                    data={pieData} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10, fontSize: '0.78rem', color: '#e2e8f0',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Typography sx={{ color: '#334155', fontSize: '0.85rem' }}>No job data yet</Typography>
              </Box>
            )}
          </Box>
        </Grid>

        {/* Area Chart */}
        <Grid item xs={12} md={8}>
          <Box sx={{
            p: 3, borderRadius: '18px', height: 320,
            background: 'rgba(10,14,28,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeInUp 0.5s ease 0.4s both',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUp sx={{ color: '#00d4aa', fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem' }}>
                Jobs by Queue
              </Typography>
            </Box>
            {queueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={queueChartData}>
                  <defs>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <RTooltip contentStyle={{
                    background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, fontSize: '0.78rem', color: '#e2e8f0',
                  }} />
                  <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#gradCompleted)" strokeWidth={2} />
                  <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#gradFailed)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Typography sx={{ color: '#334155', fontSize: '0.85rem' }}>Create queues to see chart data</Typography>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>

      {/* ── Recent Activity + Queue List ── */}
      <Grid container spacing={2.5}>
        {/* Recent Jobs */}
        <Grid item xs={12} md={7}>
          <Box sx={{
            p: 3, borderRadius: '18px',
            background: 'rgba(10,14,28,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeInUp 0.5s ease 0.5s both',
          }}>
            <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', mb: 2 }}>
              Recent Activity
            </Typography>
            {recentJobs.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentJobs.map((job: any) => (
                  <Box key={job.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    p: 1.5, borderRadius: '12px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.04)',
                    transition: 'all 0.2s',
                    '&:hover': { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' },
                  }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: statusColor[job.status] || '#475569',
                      boxShadow: `0 0 8px ${statusColor[job.status] || '#475569'}60`,
                    }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.82rem' }} noWrap>
                        {job.name}
                      </Typography>
                      <Typography sx={{ color: '#475569', fontSize: '0.72rem' }}>
                        {job.queue?.name || 'Unknown queue'} · {job.type}
                      </Typography>
                    </Box>
                    <Box sx={{
                      px: 1.5, py: 0.3, borderRadius: 6,
                      background: `${statusColor[job.status] || '#475569'}15`,
                      border: `1px solid ${statusColor[job.status] || '#475569'}30`,
                    }}>
                      <Typography sx={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: statusColor[job.status] || '#475569',
                      }}>
                        {job.status}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: '#334155', fontSize: '0.82rem', py: 3, textAlign: 'center' }}>
                No recent activity
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Active Queues */}
        <Grid item xs={12} md={5}>
          <Box sx={{
            p: 3, borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(0,212,170,0.06) 0%, rgba(124,58,237,0.04) 100%)',
            border: '1px solid rgba(0,212,170,0.15)',
            backdropFilter: 'blur(12px)',
            animation: 'fadeInUp 0.5s ease 0.55s both',
          }}>
            <Typography variant="h6" sx={{ color: '#e2e8f0', mb: 1, fontSize: '0.9rem' }}>Getting Started</Typography>
            <Typography sx={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.7, mb: 2 }}>
              Create a <strong style={{ color: '#00d4aa' }}>Queue</strong> first, then add{' '}
              <strong style={{ color: '#10b981' }}>Jobs</strong> to it. Workers automatically pick them up and process them.
            </Typography>

            {queues.length > 0 && (
              <Box>
                <Typography sx={{
                  fontSize: '0.68rem', color: '#334155', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5,
                }}>
                  Active Queues
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {queues.map((q: any) => (
                    <Box key={q.id} sx={{
                      px: 2, py: 0.7, borderRadius: '10px',
                      background: q.isPaused ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)',
                      border: `1px solid ${q.isPaused ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                      <Box sx={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: q.isPaused ? '#f59e0b' : '#10b981',
                        boxShadow: `0 0 6px ${q.isPaused ? '#f59e0b' : '#10b981'}`,
                      }} />
                      <Typography sx={{ fontSize: '0.78rem', color: q.isPaused ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                        {q.name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
