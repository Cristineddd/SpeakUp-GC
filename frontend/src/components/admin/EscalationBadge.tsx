/**
 * EscalationBadge Component
 * Visual indicator for complaint escalation level
 */

import { Badge } from '../ui/badge';
import { 
  FileText, 
  Clock, 
  AlertTriangle, 
  AlertOctagon,
  TrendingUp,
  Shield
} from 'lucide-react';
import type { EscalationLevel } from '../../types/escalation';
import { 
  ESCALATION_LABELS, 
  ESCALATION_COLORS 
} from '../../types/escalation';

interface EscalationBadgeProps {
  level: EscalationLevel;
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  autoEscalated?: boolean;
  className?: string;
}

export function EscalationBadge({
  level,
  showIcon = true,
  showLabel = true,
  size = 'md',
  autoEscalated = false,
  className = '',
}: EscalationBadgeProps) {
  
  // Get icon based on level
  const getIcon = () => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    const iconClass = iconSize;

    switch (level) {
      case 3:
        return <AlertOctagon className={iconClass} />;
      case 2:
        return <AlertTriangle className={iconClass} />;
      case 1:
        return <Clock className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  // Get badge variant
  const getBadgeColor = () => {
    return ESCALATION_COLORS[level];
  };

  // Get text size
  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  const label = ESCALATION_LABELS[level];
  const colorClass = getBadgeColor();

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <Badge 
        variant="outline" 
        className={`${colorClass} ${getTextSize()} font-medium border px-2 py-1 flex items-center gap-1`}
      >
        {showIcon && getIcon()}
        {showLabel && <span>{label}</span>}
      </Badge>
      
      {autoEscalated && (
        <Badge 
          variant="outline" 
          className="bg-purple-50 text-purple-700 border-purple-200 text-xs px-1.5 py-0.5"
          title="Automatically escalated by system"
        >
          <TrendingUp className="h-3 w-3" />
          Auto
        </Badge>
      )}
    </div>
  );
}

/**
 * SLA Breach Indicator
 */
interface SLAIndicatorProps {
  isBreached: boolean;
  hoursRemaining?: number;
  percentComplete?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function SLAIndicator({
  isBreached,
  hoursRemaining = 0,
  percentComplete = 0,
  size = 'md',
}: SLAIndicatorProps) {
  
  const getColor = () => {
    if (isBreached) return 'text-red-600 bg-red-50 border-red-300';
    if (percentComplete >= 80) return 'text-orange-600 bg-orange-50 border-orange-300';
    if (percentComplete >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    return 'text-green-600 bg-green-50 border-green-300';
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    if (isBreached) {
      return <AlertOctagon className={iconSize} />;
    }
    return <Shield className={iconSize} />;
  };

  const getText = () => {
    if (isBreached) {
      return 'SLA Breached';
    }
    if (hoursRemaining <= 0) {
      return 'Due Now';
    }
    if (hoursRemaining < 24) {
      return `${hoursRemaining}h left`;
    }
    const days = Math.floor(hoursRemaining / 24);
    return `${days}d left`;
  };

  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <Badge 
      variant="outline" 
      className={`${getColor()} ${textSize} font-medium border px-2 py-1 flex items-center gap-1`}
    >
      {getIcon()}
      <span>{getText()}</span>
    </Badge>
  );
}

/**
 * Compact Escalation Info (for tables)
 */
interface CompactEscalationInfoProps {
  level: EscalationLevel;
  hoursUnprocessed: number;
  slaBreached?: boolean;
}

export function CompactEscalationInfo({
  level,
  hoursUnprocessed,
  slaBreached = false,
}: CompactEscalationInfoProps) {
  const days = Math.floor(hoursUnprocessed / 24);
  const hours = hoursUnprocessed % 24;
  
  const timeText = days > 0 
    ? `${days}d ${hours}h` 
    : `${hours}h`;

  return (
    <div className="flex items-center gap-2">
      <EscalationBadge 
        level={level} 
        size="sm" 
        showLabel={false}
      />
      <span className="text-xs text-muted-foreground">
        {timeText}
      </span>
      {slaBreached && (
        <span title="SLA Breached">
          <AlertOctagon className="h-3 w-3 text-red-500" />
        </span>
      )}
    </div>
  );
}
