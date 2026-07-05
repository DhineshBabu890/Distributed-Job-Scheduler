import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, IconButton, Alert, FormControl, InputLabel, Select, MenuItem, Tooltip,
} from '@mui/material';
import { Add, PlayArrow, Pause, LayersOutlined } from '@mui/icons-material';
import { queuesApi, projectsApi } from '../services/api';

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
            background: 'linear-gradient(90deg,#e2e8f0,#94a3b8)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Queues</Typography>
          <Typography sx={{ color: '#475569', fontSize: '0.875rem', mt: 0.5 }}>
            {queues.length} queue{queues.length !== 1 ? 's' : ''} configured
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<Add />}
          onClick={() => setOpen(true)}
          sx={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}
        >
          New Queue
        </Button>
      </Box>

      {queues.length === 0 && !isLoading ? (
        <Box sx={{
          py: 8, textAlign: 'center',
          background: 'rgba(13,17,32,0.5)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <LayersOutlined sx={{ fontSize: 48, color: '#334155', mb: 2 }} />
          <Typography sx={{ color: '#475569' }}>No queues yet. Create your first queue to get started.</Typography>
        </Box>
      ) : (
        <Box sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(13,17,32,0.85)' }}>
          <Table>
            <TableHead>
              <TableRow>
                {['Queue Name', 'Description', 'Priority', 'Concurrency', 'Status', 'Stats', 'Actions'].map(h => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {queues.map((queue: any) => (
                <TableRow key={queue.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: queue.isPaused ? '#f59e0b' : '#10b981',
                        boxShadow: queue.isPaused ? '0 0 6px #f59e0b' : '0 0 6px #10b981',
                      }} />
                      <Typography sx={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.875rem' }}>
                        {queue.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>{queue.description || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{
                      display: 'inline-flex', px: 1.5, py: 0.3, borderRadius: 6,
                      background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                      color: '#9d5ff0', fontWeight: 700, fontSize: '0.8rem',
                    }}>{queue.priority}</Box>
                  </TableCell>
                  <TableCell sx={{ color: '#94a3b8', fontSize: '0.875rem' }}>{queue.concurrencyLimit}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={queue.isPaused ? 'Paused' : 'Active'}
                      sx={{
                        fontWeight: 700, borderRadius: '6px',
                        background: queue.isPaused ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        border: `1px solid ${queue.isPaused ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.35)'}`,
                        color: queue.isPaused ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {queue.statistics ? (
                      <Box sx={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                        <Box sx={{ color: '#94a3b8' }}>Queued: <strong style={{ color: '#e2e8f0' }}>{queue.statistics.queuedJobs}</strong></Box>
                        <Box sx={{ color: '#94a3b8' }}>Running: <strong style={{ color: '#06b6d4' }}>{queue.statistics.runningJobs}</strong></Box>
                        <Box sx={{ color: '#94a3b8' }}>Done: <strong style={{ color: '#10b981' }}>{queue.statistics.completedJobs}</strong></Box>
                      </Box>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={queue.isPaused ? 'Resume queue' : 'Pause queue'}>
                      <IconButton
                        size="small"
                        onClick={() => queue.isPaused ? resumeMutation.mutate(queue.id) : pauseMutation.mutate(queue.id)}
                        sx={{
                          color: queue.isPaused ? '#10b981' : '#f59e0b',
                          background: queue.isPaused ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          borderRadius: '8px', p: 0.8,
                          '&:hover': { background: queue.isPaused ? 'rgba(16,185,129,0.24)' : 'rgba(245,158,11,0.24)' },
                        }}
                      >
                        {queue.isPaused ? <PlayArrow fontSize="small" /> : <Pause fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Create dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          Create New Queue
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}
          <FormControl fullWidth margin="normal">
            <InputLabel>Project</InputLabel>
            <Select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} label="Project">
              {projects.length > 0 ? projects.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>) : <MenuItem value="default-project">Default Project</MenuItem>}
            </Select>
          </FormControl>
          <TextField fullWidth label="Queue Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
          <TextField fullWidth label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} margin="normal" multiline rows={2} />
          <Box sx={{ display: 'flex', gap: 2, mt: 0 }}>
            <TextField fullWidth label="Priority (0-10)" type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} margin="normal" inputProps={{ min: 0, max: 10 }} />
            <TextField fullWidth label="Concurrency" type="number" value={formData.concurrencyLimit} onChange={(e) => setFormData({ ...formData, concurrencyLimit: parseInt(e.target.value) })} margin="normal" inputProps={{ min: 1 }} />
          </Box>
          <TextField fullWidth label="Rate Limit (jobs/min)" type="number" value={formData.rateLimit} onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) })} margin="normal" inputProps={{ min: 1 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate({
              ...formData,
              projectId: formData.projectId || (projects.length > 0 ? projects[0].id : 'default-project'),
            })} variant="contained"
            disabled={!formData.name || createMutation.isPending}
            sx={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}
          >
            {createMutation.isPending ? 'Creating…' : 'Create Queue'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
