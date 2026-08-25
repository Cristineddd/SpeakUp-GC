import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ROLE_COLORS, ROLE_LABELS, CODI_ROLE_DESCRIPTION } from '../../types/representative';
import type { RepresentativeRole } from '../../types/representative';

interface CodiRoleBadgeProps {
  role?: string | null;
  className?: string;
}

export function CodiRoleBadge({ role, className }: CodiRoleBadgeProps) {
  if (!role) return null;

  const label = ROLE_LABELS[role as RepresentativeRole] || role;
  const colorClass = ROLE_COLORS[role as RepresentativeRole] || 'bg-gray-100 text-gray-800';

  const isCodiMember = label === 'CODI' || label === 'CODI member';

  if (!isCodiMember) {
    return <Badge className={`${colorClass} ${className ?? ''}`}>{label}</Badge>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${colorClass} cursor-help ${className ?? ''}`}>{label}</Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-center">
        {CODI_ROLE_DESCRIPTION}
      </TooltipContent>
    </Tooltip>
  );
}
