import React from 'react';
import { useParams } from '../../compat/router';
import CaseTracking from '../../components/case/CaseTracking';

const CaseTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  if (!id) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No case ID provided</p>
      </div>
    );
  }

  return <CaseTracking complaintId={id} />;
};

export default CaseTrackingPage;
