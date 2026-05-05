/**
 * Compliance Reports Page
 * Main page for generating and viewing compliance reports
 */

import React, { useState } from 'react';
import { FileText, Shield } from 'lucide-react';
import { ComplianceReportGenerator } from '../../components/admin/ComplianceReportGenerator';
import { ComplianceReportViewer } from '../../components/admin/ComplianceReportViewer';
import { ComplianceSummaryReport } from '../../types/complianceReport';

const ComplianceReportsPage: React.FC = () => {
  const [currentReport, setCurrentReport] = useState<ComplianceSummaryReport | null>(null);

  const handleReportGenerated = (report: ComplianceSummaryReport) => {
    setCurrentReport(report);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            Compliance Reports
          </h1>
          <p className="text-gray-600 mt-2">
            Generate privacy-compliant analytics and compliance reports
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-700">GDPR Compliant</span>
        </div>
      </div>

      {/* Report Generator */}
      <ComplianceReportGenerator onReportGenerated={handleReportGenerated} />

      {/* Report Viewer */}
      {currentReport && (
        <div className="mt-8">
          <ComplianceReportViewer report={currentReport} />
        </div>
      )}

      {/* Info Section */}
      {!currentReport && (
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">About Compliance Reports</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>All reports are GDPR and data privacy compliant</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Personal data can be anonymized automatically</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Reports include frequency analysis, trends, and performance metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Export reports in PDF, Excel, CSV, or JSON format</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ComplianceReportsPage;
