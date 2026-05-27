import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '../ui/use-toast';
import { CaseActivityService } from '../../services/caseActivityService';
import { ActivityType } from '../../types/caseActivity';
import { useAuth } from '../../contexts/AuthContext';
import { useRepresentativeRole } from '../../hooks/useRepresentativeRole';
import { FileText, Plus } from 'lucide-react';

interface ActivityLoggerProps {
  complaintId: string;
  onActivityLogged?: () => void;
}

export function ActivityLogger({ complaintId, onActivityLogged }: ActivityLoggerProps) {
  const { currentUser } = useAuth();
  const { role } = useRepresentativeRole();
  const { toast } = useToast();
  
  const [activityType, setActivityType] = useState<ActivityType>(ActivityType.INVESTIGATION);
  const [description, setDescription] = useState('');
  const [findings, setFindings] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const activityTypeOptions = [
    { value: ActivityType.DOCUMENT_REVIEW, label: 'Document Review' },
    { value: ActivityType.EVIDENCE_COLLECTION, label: 'Evidence Collection' },
    { value: ActivityType.INTERVIEW, label: 'Interview' },
    { value: ActivityType.INVESTIGATION, label: 'Investigation' },
    { value: ActivityType.REPORT_PREPARATION, label: 'Report Preparation' },
    { value: ActivityType.DELIBERATION, label: 'Deliberation' },
    { value: ActivityType.COMMUNICATION, label: 'Communication' },
    { value: ActivityType.OTHER, label: 'Other' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser || !description.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      await CaseActivityService.createActivity(
        {
          complaintId,
          activityType,
          description: description.trim(),
          findings: findings.trim() || undefined
        },
        currentUser.uid,
        currentUser.displayName || currentUser.email || 'Handler',
        role === 'admin' ? 'admin' : 'handler'
      );

      toast({
        title: 'Success',
        description: 'Activity logged successfully'
      });

      setDescription('');
      setFindings('');
      setShowForm(false);
      
      if (onActivityLogged) {
        onActivityLogged();
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to log activity',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <Button
        onClick={() => setShowForm(true)}
        className="w-full bg-[#1D9E75] hover:bg-emerald-700"
      >
        <Plus className="h-4 w-4 mr-2" />
        Log New Activity
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Log Case Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Activity Type</label>
            <Select
              value={activityType}
              onValueChange={(value) => setActivityType(value as ActivityType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Description <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Conducted formal interview with complainant"
              rows={2}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Key Findings (Optional)
            </label>
            <Textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="e.g., Detailed testimony obtained, supporting evidence collected"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={loading || !description.trim()}
              className="flex-1 bg-[#1D9E75] hover:bg-emerald-700"
            >
              {loading ? 'Logging...' : 'Log Activity'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setDescription('');
                setFindings('');
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
