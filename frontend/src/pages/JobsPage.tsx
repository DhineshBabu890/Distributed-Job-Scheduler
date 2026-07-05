import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, MenuItem, Select, FormControl, InputLabel, Alert, Tooltip,
} from '@mui/material';
import { Add, Refresh, WorkOutline } from '@mui/icons-material';
import { jobsApi, queuesApi } from '../services/api';
import { format } from 'date-fns';

const defaultForm = {
  queueId: '', name: '', type: 'IMMEDIATE',
  payload: '{\n  "type": "email",\n  "data": {\n    "to": "user@example.com",\n    "subject": "Test"\n  }\n}',
  priority: 5, scheduledFor: '', cronExpression: '',
};

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string; label: string }> = {
  COMPLETED: { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', color: '#10b981', label: 'Completed' },
  RUNNING: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', color: '#3b82f6', label: 'Running' },
  FAILED: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444', label: 'Failed' },
  DEAD_LETTER: { bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)', color: '#f87171', label: 'Dead' },
  QUEUED: { bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', color: '#94a3b8', label: 'Queued' },
  CANCELLED: { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.15)', color: '#64748b', label: 'Cancelled' },
};

const TYPE_COLORS: Record<string, string> = {
  IMMEDIATE: '#00d4aa', DELAYED: '#f59e0b', SCHEDULED: '#3b82f6', RECURRING: '#10b981',
};

export default function JobsPage() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState(defaultForm);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const { data: queuesData } = useQuery({ queryKey: ['queues'], queryFn: async () => (await queuesApi.list()).data });
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => (await jobsApi.list()).data,
    refetchInterval: 3000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => jobsApi.create({
      ...data,
      payload: JSON.parse(data.payload),
      priority: parseInt(data.priority),
      scheduledFor: data.scheduledFor || undefined,
      cronExpression: data.cronExpression || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jobs'] }); setOpen(false); setFormData(defaultForm); setError(''); },
    onError: (e: any) => setError(e.response?.data?.error || 'Failed to create job'),
  });
  const retryMutation = useMutation({
    mutationFn: jobsApi.retry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const queues = queuesData?.queues || [];
  const jobs = jobsData?.data || [];

  const handleSubmit = () => {
    try { JSON.parse(formData.payload); createMutation.mutate(formData); }
    catch { setError('Invalid JSON payload'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{
            background: 'linear-gradient(135deg, #00d4aa, #7c3aed)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Jobs</Typography>
          <Typography sx={{ color: '#334155', fontSize: '0.85rem', mt: 0.5 }}>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} total — refreshes every 3s
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined" startIcon={<Refresh />}
            onClick={() => qc.invalidateQueries({ queryKey: ['jobs'] })}
            sx={{
              borderColor: 'rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: '12px',
              '&:hover': { borderColor: '#00d4aa', color: '#00d4aa', background: 'rgba(0,212,170,0.06)' },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}
            sx={{
              background: 'linear-gradient(135deg, #00d4aa, #7c3aed)', borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0,212,170,0.3)',
            }}
          >
            New Job
          </Button>
        </Box>
      </Box>

      {jobs.length === 0 && !isLoading ? (
        <Box sx={{
          py: 10, textAlign: 'center', borderRadius: '20px',
          background: 'rgba(10,14,28,0.6)',
          border: '1px dashed rgba(255,255,255,0.08)',
          animation: 'fadeInUp 0.4s ease both',
        }}>
          <WorkOutline sx={{ fontSize: 56, color: '#1e293b', mb: 2 }} />
          <Typography sx={{ color: '#334155', fontSize: '0.9rem' }}>No jobs yet. Create a queue first, then add jobs.</Typography>
        </Box>
      ) : (
        <Box sx={{
          borderRadius: '18px', overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(10,14,28,0.9)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeInUp 0.4s ease both',
        }}>
          <Table>
            <TableHead>
              <TableRow>
                {['Job Name', 'Queue', 'Type', 'Status', 'Priority', 'Attempts', 'Created', 'Actions'].map(h => (
                  <TableCell key={h}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((job: any) => {
                const s = STATUS_STYLES[job.status] || STATUS_STYLES['QUEUED'];
                const typeColor = TYPE_COLORS[job.type] || '#94a3b8';
                return (
                  <TableRow key={job.id} sx={{
                    '&:hover': {
                      background: 'rgba(0,212,170,0.03)',
                      boxShadow: 'inset 0 0 0 1px rgba(0,212,170,0.08)',
                    },
                  }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.85rem' }}>{job.name}</Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#475569', fontSize: '0.8rem' }}>{job.queue?.name || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={job.type} sx={{
                        fontWeight: 600, borderRadius: '8px', fontSize: '0.72rem',
                        background: `${typeColor}12`, color: typeColor, border: `1px solid ${typeColor}28`,
                      }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={s.label} sx={{
                        fontWeight: 700, borderRadius: '8px', fontSize: '0.72rem',
                        background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                        animation: job.status === 'RUNNING' ? 'running-pulse 1.5s ease-in-out infinite' : 'none',
                      }} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{
                        display: 'inline-block', px: 1.5, py: 0.2, borderRadius: 8,
                        background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)',
                        color: '#9d5ff0', fontWeight: 700, fontSize: '0.78rem',
                      }}>{job.priority}</Box>
                    </TableCell>
                    <TableCell sx={{ color: '#64748b', fontSize: '0.8rem' }}>
                      <span style={{ color: '#94a3b8' }}>{job.attempt}</span>
                      <span style={{ color: '#1e293b' }}>/{job.maxAttempts}</span>
                    </TableCell>
                    <TableCell sx={{ color: '#475569', fontSize: '0.78rem' }}>
                      {format(new Date(job.createdAt), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      {(job.status === 'FAILED' || job.status === 'DEAD_LETTER') && (
                        <Tooltip title="Retry this job">
                          <Button
                            size="small"
                            onClick={() => retryMutation.mutate(job.id)}
                            disabled={retryMutation.isPending}
                            sx={{
                              fontSize: '0.75rem', fontWeight: 700, px: 1.5, py: 0.4,
                              background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                              border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px',
                              '&:hover': { background: 'rgba(239,68,68,0.18)' },
                            }}
                          >
                            Retry
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Create dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          Create New Job
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Queue</InputLabel>
              <Select value={formData.queueId} onChange={(e) => setFormData({ ...formData, queueId: e.target.value })} label="Queue">
                {queues.map((q: any) => <MenuItem key={q.id} value={q.id}>{q.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="Job Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} margin="normal" required />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Job Type</InputLabel>
              <Select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} label="Job Type">
                <MenuItem value="IMMEDIATE">Immediate</MenuItem>
                <MenuItem value="DELAYED">Delayed</MenuItem>
                <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                <MenuItem value="RECURRING">Recurring (Cron)</MenuItem>
              </Select>
            </FormControl>
            <TextField fullWidth label="Priority (0-10)" type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })} margin="normal" inputProps={{ min: 0, max: 10 }} />
          </Box>
          {(formData.type === 'DELAYED' || formData.type === 'SCHEDULED') && (
            <TextField fullWidth label="Scheduled For" type="datetime-local" value={formData.scheduledFor} onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })} margin="normal" InputLabelProps={{ shrink: true }} />
          )}
          {formData.type === 'RECURRING' && (
            <TextField fullWidth label="Cron Expression (e.g. '0 9 * * *')" value={formData.cronExpression} onChange={(e) => setFormData({ ...formData, cronExpression: e.target.value })} margin="normal" helperText="Standard cron syntax" />
          )}
          <TextField
            fullWidth label="Payload (JSON)" value={formData.payload}
            onChange={(e) => setFormData({ ...formData, payload: e.target.value })}
            margin="normal" multiline rows={8} required
            helperText="Must be valid JSON"
            sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748b' }}>Cancel</Button>
          <Button
            onClick={handleSubmit} variant="contained"
            disabled={!formData.name || !formData.queueId || createMutation.isPending}
            sx={{ background: 'linear-gradient(135deg, #00d4aa, #7c3aed)' }}
          >
            {createMutation.isPending ? 'Creating…' : 'Create Job'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
