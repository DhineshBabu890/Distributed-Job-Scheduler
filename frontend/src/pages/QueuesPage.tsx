import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, IconButton, Alert, FormControl, InputLabel, Select, MenuItem,
  Tooltip, Grid, LinearProgress,
} from '@mui/material';
import { Add, PlayArrow, Pause, LayersOutlined } from '@mui/icons-material';
import { queuesApi, projectsApi } from '../services/api';

const CARD_COLORS = ['#00d4aa', '#7c3aed', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#06b6d4', '#ec4899'];

const defaultForm = { projectId: '', name: '', description: '', priority: 5, concurrencyLimit: 10, rateLimit: 100 };

export default function QueuesPage() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await projectsApi.list()).data,
  });
  const { data: queuesData, isLoading } = useQuery({
    queryKey: ['queues'],
    queryFn: async () => (await queuesApi.list()).data,
    refetchInterval: 3000,
  });

  const createMutation = useMutation({
    mutationFn: queuesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['queues'] }); setOpen(false); setFormData(defaultForm); setError(''); },
    onError: (e: any) => {
      const resp = e.response?.data;
      if (resp?.details && Array.isArray(resp.details)) {
        const details = resp.details.map((d: any) => `${d.path}: ${d.message}`).join('; ');
        setError(`${resp.error || 'Validation error'} — ${details}`);
      } else {
        setError(resp?.error || 'Failed to create queue');
      }
    },
  });
  const pauseMutation = useMutation({ mutationFn: queuesApi.pause, onSuccess: () => qc.invalidateQueries({ queryKey: ['queues'] }) });
  const resumeMutation = useMutation({ mutationFn: queuesApi.resume, onSuccess: () => qc.invalidateQueries({ queryKey: ['queues'] }) });

  const queues = queuesData?.queues || [];
  const projects = projectsData?.projects || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{
            background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Queues</Typography>
          <Typography sx={{ color: '#334155', fontSize: '0.85rem', mt: 0.5 }}>
            {queues.length} queue{queues.length !== 1 ? 's' : ''} configured
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<Add />}
          onClick={() => setOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #00d4aa, #7c3aed)', borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,212,170,0.3)',
          }}
        >
          New Queue
        </Button>
      </Box>

      {queues.length === 0 && !isLoading ? (
        <Box sx={{
          py: 10, textAlign: 'center', borderRadius: '20px',
          background: 'rgba(10,14,28,0.6)',
          border: '1px dashed rgba(255,255,255,0.08)',
          animation: 'fadeInUp 0.4s ease both',
        }}>
          <LayersOutlined sx={{ fontSize: 56, color: '#1e293b', mb: 2 }} />
          <Typography sx={{ color: '#334155', fontSize: '0.9rem' }}>No queues yet. Create your first queue to get started.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {queues.map((queue: any, i: number) => {
            const color = CARD_COLORS[i % CARD_COLORS.length];
            const s = queue.statistics || {};
            const total = s.totalJobs || 0;
            const completed = s.completedJobs || 0;
            const running = s.runningJobs || 0;
            const failed = s.failedJobs || 0;
            const usagePct = queue.concurrencyLimit > 0 ? Math.min((running / queue.concurrencyLimit) * 100, 100) : 0;

            return (
              <Grid item xs={12} sm={6} lg={4} key={queue.id}>
                <Box sx={{
                  p: 3, borderRadius: '18px',
                  background: 'rgba(10,14,28,0.9)',
                  border: `1px solid ${color}18`,
                  backdropFilter: 'blur(12px)',
                  position: 'relative', overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  animation: `fadeInUp 0.4s ease ${i * 0.06}s both`,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 16px 48px ${color}20`,
                    borderColor: `${color}35`,
                  },
                }}>
                  {/* Top accent */}
                  <Box sx={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, ${color}, transparent)`,
                  }} />

                  {/* Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: queue.isPaused ? '#f59e0b' : '#10b981',
                        boxShadow: `0 0 8px ${queue.isPaused ? '#f59e0b' : '#10b981'}60`,
                      }} />
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.95rem' }}>
                          {queue.name}
                        </Typography>
                        <Typography sx={{ color: '#475569', fontSize: '0.72rem' }}>
                          {queue.description || 'No description'}
                        </Typography>
                      </Box>
                    </Box>
                    <Tooltip title={queue.isPaused ? 'Resume queue' : 'Pause queue'}>
                      <IconButton
                        size="small"
                        onClick={() => queue.isPaused ? resumeMutation.mutate(queue.id) : pauseMutation.mutate(queue.id)}
                        sx={{
                          color: queue.isPaused ? '#10b981' : '#f59e0b',
                          background: queue.isPaused ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                          borderRadius: '10px', p: 0.8,
                          border: `1px solid ${queue.isPaused ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                          '&:hover': {
                            background: queue.isPaused ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                          },
                        }}
                      >
                        {queue.isPaused ? <PlayArrow fontSize="small" /> : <Pause fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Box>

                  {/* Stats row */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 2.5 }}>
                    {[
                      { label: 'Total', value: total, clr: '#94a3b8' },
                      { label: 'Done', value: completed, clr: '#10b981' },
                      { label: 'Failed', value: failed, clr: '#ef4444' },
                    ].map((st) => (
                      <Box key={st.label} sx={{
                        p: 1.2, borderRadius: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                        textAlign: 'center',
                      }}>
                        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: st.clr, lineHeight: 1 }}>
                          {st.value}
                        </Typography>
                        <Typography sx={{ fontSize: '0.62rem', color: '#334155', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', mt: 0.3 }}>
                          {st.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Concurrency bar */}
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>
                        Concurrency ({running}/{queue.concurrencyLimit})
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                        {Math.round(usagePct)}%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={usagePct} sx={{
                      height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.05)',
                      '& .MuiLinearProgress-bar': {
                        background: usagePct > 80 ? '#ef4444' : `linear-gradient(90deg, ${color}, ${color}80)`,
                        borderRadius: 3,
                      },
                    }} />
                  </Box>

                  {/* Bottom meta */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.5, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <Box sx={{
                      px: 1.2, py: 0.3, borderRadius: 6,
                      background: `${color}12`, border: `1px solid ${color}25`,
                    }}>
                      <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color }}>
                        P{queue.priority}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.68rem', color: '#334155' }}>
                      Rate: {queue.rateLimit}/min
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          Create New Queue
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}
          <FormControl fullWidth margin="normal">
            <InputLabel>Project</InputLabel>
            <Select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} label="Project">
              {projects.length > 0 ? projects.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>) : <MenuItem value="default-project">Default Project</MenuItem>}
            </Select>
          </FormControl>
          <TextField fullWidth label="Queue Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} margin="normal" multiline rows={2} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Priority (0-10)" type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} margin="normal" inputProps={{ min: 0, max: 10 }} />
            <TextField fullWidth label="Concurrency" type="number" value={formData.concurrencyLimit} onChange={(e) => setFormData({ ...formData, concurrencyLimit: parseInt(e.target.value) })} margin="normal" inputProps={{ min: 1 }} />
          </Box>
          <TextField fullWidth label="Rate Limit (jobs/min)" type="number" value={formData.rateLimit} onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })} margin="normal" inputProps={{ min: 1 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({
              ...formData,
              projectId: formData.projectId || (projects.length > 0 ? projects[0].id : 'default-project'),
            })} variant="contained"
            disabled={!formData.name || createMutation.isPending}
            sx={{ background: 'linear-gradient(135deg, #00d4aa, #7c3aed)' }}
          >
            {createMutation.isPending ? 'Creating…' : 'Create Queue'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
