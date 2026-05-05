/**
 * HandlerTimeline Component
 * Shows the history of handler assignments for a case
 */

import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { User, Clock, ArrowRight, FileText } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '../../types/representative';
import type { AdminReport } from '../../services/adminReportService';
import { format } from 'date-fns';

interface HandlerTimelineProps {
  complaint: AdminReport;
}

export function HandlerTimeline({ complaint }: HandlerTimelineProps) {
  const handlerHistory = complaint.handlerHistory || [];

  if (handlerHistory.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-muted-foreground text-center">
          No handler assignments yet
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Handler Assignment History
      </h3>
      
      <div className="space-y-4">
        {handlerHistory.map((entry, index) => {
          const isActive = !entry.unassignedAt;
          const assignedDate = new Date(entry.assignedAt);
          const unassignedDate = entry.unassignedAt ? new Date(entry.unassignedAt) : null;
          
          // Calculate duration
          let duration = '';
          if (unassignedDate) {
            const hours = Math.round((unassignedDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            
            if (days > 0) {
              duration = `${days}d ${remainingHours}h`;
            } else {
              duration = `${hours}h`;
            }
          } else {
            const hours = Math.round((new Date().getTime() - assignedDate.getTime()) / (1000 * 60 * 60));
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            
            if (days > 0) {
              duration = `${days}d ${remainingHours}h (ongoing)`;
            } else {
              duration = `${hours}h (ongoing)`;
            }
          }

          return (
            <div key={index} className="relative">
              {/* Timeline line */}
              {index < handlerHistory.length - 1 && (
                <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border" />
              )}
              
              <div className={`
                relative p-4 rounded-lg border
                ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-background'}
              `}>
                {/* Handler Info */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`
                      p-2 rounded-full
                      ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                    `}>
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{entry.handlerName}</p>
                      <Badge className={ROLE_COLORS[entry.handlerRole as any] || 'bg-gray-100 text-gray-800'}>
                        {ROLE_LABELS[entry.handlerRole as any] || entry.handlerRole}
                      </Badge>
                    </div>
                  </div>
                  
                  {isActive && (
                    <Badge variant="default">Active</Badge>
                  )}
                </div>

                {/* Assignment Details */}
                <div className="ml-12 space-y-2">
                  {/* Assigned */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned:</span>
                    <span className="font-medium">{format(assignedDate, 'PPp')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">By:</span>
                    <span className="font-medium">{entry.assignedByName}</span>
                  </div>

                  {/* Unassigned (if applicable) */}
                  {unassignedDate && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Unassigned:</span>
                        <span className="font-medium">{format(unassignedDate, 'PPp')}</span>
                      </div>
                      
                      {entry.unassignedReason && (
                        <div className="flex items-start gap-2 text-sm">
                          <FileText className="h-3 w-3 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">Reason:</span>
                          <span className="font-medium">{entry.unassignedReason}</span>
                        </div>
                      )}
                    </>
                  )}

                  {/* Duration */}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium ml-2">{duration}</span>
                  </div>

                  {/* Notes */}
                  {entry.notes && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p className="text-muted-foreground mb-1">Notes:</p>
                      <p>{entry.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {handlerHistory.length > 1 && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Handlers:</p>
              <p className="font-semibold text-lg">{handlerHistory.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Reassignments:</p>
              <p className="font-semibold text-lg">{handlerHistory.length - 1}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default HandlerTimeline;
