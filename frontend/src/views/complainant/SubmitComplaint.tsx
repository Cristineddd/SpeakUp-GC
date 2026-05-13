import React, { useState } from 'react';
import { useNavigate } from '../../compat/router';
import { submitComplaint } from '../../services/complaints';
import type { Complaint } from '../../types/complaint';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function SubmitComplaint() {
  const [form, setForm] = useState<Partial<Complaint>>({
    title: '',
    description: '',
    anonymous: false,
    location: { city: 'Olongapo' },
  });
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) {
      toast({ title: 'Error', description: 'Please fill title and description', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const id = await submitComplaint({
        reporterId: user?.uid || null,
        anonymous: form.anonymous || false,
        title: form.title!,
        description: form.description!,
        location: {
          city: form.location?.city || 'Olongapo',
          building: form.location?.building,
          room: form.location?.room,
        },
        attachmentsFiles: files,
      } as any);

      toast({ title: 'Reported', description: 'Your report was submitted.' });
      navigate(`/report/${id}`);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message || 'Failed to submit report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl bg-card p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Report an Incident</h2>
        <label className="block mb-2">
          <span className="text-sm">City/Municipality *</span>
          <input 
            type="text"
            className="w-full mt-1 bg-muted" 
            value="Olongapo" 
            disabled 
            readOnly
          />
        </label>
        <label className="block mb-2">
          <span className="text-sm">Title *</span>
          <input className="w-full mt-1" value={form.title || ''} onChange={(e) => setForm(s => ({ ...s, title: e.target.value }))} />
        </label>
        <label className="block mb-2">
          <span className="text-sm">Description *</span>
          <textarea className="w-full mt-1 h-32" value={form.description || ''} onChange={(e) => setForm(s => ({ ...s, description: e.target.value }))} />
        </label>
        <label className="block mb-4">
          <span className="text-sm">Attachments (optional)</span>
          <input type="file" multiple onChange={handleFileChange} className="mt-1" />
        </label>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.anonymous || false} onChange={(e) => setForm(s => ({ ...s, anonymous: e.target.checked }))} />
            <span className="text-sm">Submit anonymously</span>
          </label>
          <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit Report'}</Button>
        </div>
      </form>
    </div>
  );
}
