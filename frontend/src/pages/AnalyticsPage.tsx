import { Box, Grid, Typography, CircularProgress } from '@mui/material';
import {
    InsightsOutlined, DonutLargeOutlined, BarChartOutlined,
    SpeedOutlined, TrendingUp,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { queuesApi, jobsApi } from '../services/api';
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid,
    AreaChart, Area,
    RadialBarChart, RadialBar,
} from 'recharts';

const COLORS = {
    COMPLETED: '#10b981',
    RUNNING: '#3b82f6',
    FAILED: '#ef4444',
    QUEUED: '#94a3b8',
    DEAD_LETTER: '#f87171',
    CANCELLED: '#64748b',
};

const QUEUE_COLORS = ['#00d4aa', '#7c3aed', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#06b6d4'];

export default function AnalyticsPage() {
    const { data: queuesData, isLoading: qLoading } = useQuery({
        queryKey: ['queues'],
        queryFn: async () => (await queuesApi.list()).data,
        refetchInterval: 5000,
    });

    const { data: jobsData, isLoading: jLoading } = useQuery({
        queryKey: ['jobs'],
        queryFn: async () => (await jobsApi.list()).data,
        refetchInterval: 5000,
    });

    const queues = queuesData?.queues || [];
    const jobs = jobsData?.data || [];

    /* ── Computed analytics data ── */

    // Status distribution
    const statusCounts: Record<string, number> = {};
    jobs.forEach((j: any) => { statusCounts[j.status] = (statusCounts[j.status] || 0) + 1; });
    const pieData = Object.entries(statusCounts).map(([name, value]) => ({
        name, value, color: (COLORS as any)[name] || '#475569',
    }));

    // Jobs by queue (horizontal bar)
    const queueBarData = queues.map((q: any) => ({
        name: q.name?.length > 14 ? q.name.slice(0, 14) + '…' : q.name,
        total: q.statistics?.totalJobs || 0,
        completed: q.statistics?.completedJobs || 0,
        failed: q.statistics?.failedJobs || 0,
        running: q.statistics?.runningJobs || 0,
    }));

    // Success rate for radial gauge
    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((j: any) => j.status === 'COMPLETED').length;
    const successRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
    const radialData = [
        { name: 'Success Rate', value: successRate, fill: '#00d4aa' },
    ];

    // Job type distribution
    const typeCounts: Record<string, number> = {};
    jobs.forEach((j: any) => { typeCounts[j.type] = (typeCounts[j.type] || 0) + 1; });
    const typeData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

    // Processing timeline (group jobs by hour)
    const timelineMap: Record<string, { hour: string; completed: number; failed: number; queued: number }> = {};
    jobs.forEach((j: any) => {
        const d = new Date(j.createdAt);
        const h = `${String(d.getHours()).padStart(2, '0')}:00`;
        if (!timelineMap[h]) timelineMap[h] = { hour: h, completed: 0, failed: 0, queued: 0 };
        if (j.status === 'COMPLETED') timelineMap[h].completed++;
        else if (j.status === 'FAILED') timelineMap[h].failed++;
        else timelineMap[h].queued++;
    });
    const timelineData = Object.values(timelineMap).sort((a, b) => a.hour.localeCompare(b.hour));

    const isLoading = qLoading || jLoading;

    if (isLoading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
            <CircularProgress sx={{ color: '#00d4aa' }} />
        </Box>
    );

    const tooltipStyle = {
        background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10, fontSize: '0.78rem', color: '#e2e8f0',
    };

    const ChartCard = ({ children, title, icon: Icon, delay = 0, height = 340 }: any) => (
        <Box sx={{
            p: 3, borderRadius: '18px', height,
            background: 'rgba(10,14,28,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(12px)',
            animation: `fadeInUp 0.5s ease ${delay}s both`,
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon sx={{ color: '#00d4aa', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem' }}>
                    {title}
                </Typography>
            </Box>
            {children}
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
                    Analytics
                </Typography>
                <Typography sx={{ color: '#334155', fontSize: '0.85rem', mt: 0.5 }}>
                    Comprehensive insights into job processing and queue performance
                </Typography>
            </Box>

            {/* ── Summary stats row ── */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {[
                    { label: 'Total Jobs', value: totalJobs, color: '#7c3aed' },
                    { label: 'Success Rate', value: `${successRate}%`, color: '#00d4aa' },
                    { label: 'Active Queues', value: queues.filter((q: any) => !q.isPaused).length, color: '#3b82f6' },
                    { label: 'Failed Jobs', value: jobs.filter((j: any) => j.status === 'FAILED').length, color: '#ef4444' },
                ].map((s, i) => (
                    <Grid item xs={6} md={3} key={s.label}>
                        <Box sx={{
                            p: 2.5, borderRadius: '14px',
                            background: 'rgba(10,14,28,0.9)',
                            border: `1px solid ${s.color}18`,
                            animation: `fadeInUp 0.4s ease ${i * 0.06}s both`,
                            textAlign: 'center',
                        }}>
                            <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: s.color, lineHeight: 1 }}>
                                {s.value}
                            </Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', mt: 0.5 }}>
                                {s.label}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>

            {/* ── Charts ── */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {/* Job Status Distribution */}
                <Grid item xs={12} md={4}>
                    <ChartCard title="Status Distribution" icon={DonutLargeOutlined} delay={0.2}>
                        {pieData.length > 0 ? (
                            <Box>
                                <ResponsiveContainer width="100%" height={180}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                                            paddingAngle={3} dataKey="value" stroke="none">
                                            {pieData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RTooltip contentStyle={tooltipStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                    {pieData.map((d) => (
                                        <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box sx={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                                            <Typography sx={{ fontSize: '0.68rem', color: '#64748b' }}>
                                                {d.name} ({d.value})
                                            </Typography>
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                                <Typography sx={{ color: '#334155' }}>No data</Typography>
                            </Box>
                        )}
                    </ChartCard>
                </Grid>

                {/* Success Rate Gauge */}
                <Grid item xs={12} md={4}>
                    <ChartCard title="Success Rate" icon={SpeedOutlined} delay={0.25}>
                        <Box sx={{ position: 'relative' }}>
                            <ResponsiveContainer width="100%" height={200}>
                                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%"
                                    data={radialData} startAngle={180} endAngle={0} barSize={14}>
                                    <RadialBar
                                        background={{ fill: 'rgba(255,255,255,0.04)' }}
                                        dataKey="value"
                                        cornerRadius={10}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <Box sx={{
                                position: 'absolute', top: '45%', left: '50%',
                                transform: 'translate(-50%, -50%)', textAlign: 'center',
                            }}>
                                <Typography sx={{ fontSize: '2.2rem', fontWeight: 900, color: '#00d4aa', lineHeight: 1 }}>
                                    {successRate}%
                                </Typography>
                                <Typography sx={{ fontSize: '0.68rem', color: '#475569', fontWeight: 600 }}>
                                    SUCCESS
                                </Typography>
                            </Box>
                        </Box>
                        <Box sx={{ textAlign: 'center', mt: 1 }}>
                            <Typography sx={{ fontSize: '0.78rem', color: '#64748b' }}>
                                {completedJobs} of {totalJobs} jobs completed successfully
                            </Typography>
                        </Box>
                    </ChartCard>
                </Grid>

                {/* Job Type Distribution */}
                <Grid item xs={12} md={4}>
                    <ChartCard title="Job Types" icon={BarChartOutlined} delay={0.3}>
                        {typeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={typeData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis type="number" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                                    <RTooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="value" fill="#7c3aed" radius={[0, 6, 6, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                                <Typography sx={{ color: '#334155' }}>No data</Typography>
                            </Box>
                        )}
                    </ChartCard>
                </Grid>
            </Grid>

            <Grid container spacing={2.5}>
                {/* Jobs by Queue */}
                <Grid item xs={12} md={7}>
                    <ChartCard title="Jobs by Queue" icon={TrendingUp} delay={0.35} height={360}>
                        {queueBarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={queueBarData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <RTooltip contentStyle={tooltipStyle} />
                                    <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={24} />
                                    <Bar dataKey="running" stackId="a" fill="#3b82f6" />
                                    <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                                <Typography sx={{ color: '#334155' }}>Create queues to see data</Typography>
                            </Box>
                        )}
                    </ChartCard>
                </Grid>

                {/* Processing Timeline */}
                <Grid item xs={12} md={5}>
                    <ChartCard title="Processing Timeline" icon={InsightsOutlined} delay={0.4} height={360}>
                        {timelineData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={timelineData}>
                                    <defs>
                                        <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#00d4aa" stopOpacity={0.35} />
                                            <stop offset="100%" stopColor="#00d4aa" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="fGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <RTooltip contentStyle={tooltipStyle} />
                                    <Area type="monotone" dataKey="completed" stroke="#00d4aa" fill="url(#aGrad)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#fGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                                <Typography sx={{ color: '#334155' }}>No timeline data yet</Typography>
                            </Box>
                        )}
                    </ChartCard>
                </Grid>
            </Grid>

            {/* ── Queue Comparison Table ── */}
            {queues.length > 0 && (
                <Box sx={{
                    mt: 3, p: 3, borderRadius: '18px',
                    background: 'rgba(10,14,28,0.9)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    animation: 'fadeInUp 0.5s ease 0.5s both',
                }}>
                    <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.9rem', mb: 2.5 }}>
                        Queue Performance Comparison
                    </Typography>
                    <Box sx={{ overflowX: 'auto' }}>
                        <Box component="table" sx={{
                            width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px',
                            '& th': {
                                textAlign: 'left', fontSize: '0.7rem', color: '#475569',
                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                                pb: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)',
                            },
                            '& td': {
                                py: 1.5, px: 2, fontSize: '0.82rem',
                            },
                        }}>
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: 16 }}>Queue</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th>Completed</th>
                                    <th>Running</th>
                                    <th>Failed</th>
                                    <th>Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queues.map((q: any, i: number) => {
                                    const s = q.statistics || {};
                                    const total = s.totalJobs || 0;
                                    const completed = s.completedJobs || 0;
                                    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
                                    return (
                                        <tr key={q.id} style={{
                                            background: 'rgba(255,255,255,0.02)',
                                            borderRadius: 12,
                                        }}>
                                            <td style={{ paddingLeft: 16, fontWeight: 600, color: '#e2e8f0', borderRadius: '12px 0 0 12px' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Box sx={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: QUEUE_COLORS[i % QUEUE_COLORS.length],
                                                    }} />
                                                    {q.name}
                                                </Box>
                                            </td>
                                            <td>
                                                <Box sx={{
                                                    display: 'inline-flex', px: 1.2, py: 0.3, borderRadius: 6,
                                                    background: q.isPaused ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                                                    border: `1px solid ${q.isPaused ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`,
                                                }}>
                                                    <Typography sx={{
                                                        fontSize: '0.7rem', fontWeight: 700,
                                                        color: q.isPaused ? '#f59e0b' : '#10b981',
                                                    }}>
                                                        {q.isPaused ? 'Paused' : 'Active'}
                                                    </Typography>
                                                </Box>
                                            </td>
                                            <td style={{ color: '#94a3b8', fontWeight: 600 }}>{total}</td>
                                            <td style={{ color: '#10b981', fontWeight: 600 }}>{completed}</td>
                                            <td style={{ color: '#3b82f6', fontWeight: 600 }}>{s.runningJobs || 0}</td>
                                            <td style={{ color: '#ef4444', fontWeight: 600 }}>{s.failedJobs || 0}</td>
                                            <td style={{ borderRadius: '0 12px 12px 0' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Box sx={{
                                                        flex: 1, height: 6, borderRadius: 3,
                                                        background: 'rgba(255,255,255,0.06)',
                                                        overflow: 'hidden',
                                                    }}>
                                                        <Box sx={{
                                                            width: `${rate}%`, height: '100%', borderRadius: 3,
                                                            background: rate > 80 ? '#10b981' : rate > 50 ? '#f59e0b' : '#ef4444',
                                                            transition: 'width 0.5s ease',
                                                        }} />
                                                    </Box>
                                                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8', minWidth: 36 }}>
                                                        {rate}%
                                                    </Typography>
                                                </Box>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Box>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
