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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">
            Compliance Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Generate privacy-compliant analytics and compliance reports
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-700">GDPR Compliant</span>
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
        <>
          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-green-900">About Compliance Reports</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-green-800">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                <span>All reports are <strong>GDPR and data privacy compliant</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                <span>Personal data can be <strong>anonymized automatically</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                <span>Reports include <strong>frequency analysis, trends, and performance metrics</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                <span>Export reports in <strong>PDF, Excel, CSV, or JSON format</strong></span>
              </li>
            </ul>
          </div>

          {/* Report Types Comparison */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <h3 className="font-semibold text-blue-900 mb-4">📊 What's Included in Each Report Type?</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              {/* Complete Reports */}
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <div className="font-semibold text-blue-900 mb-2">Complete Summary Reports</div>
                <div className="text-xs text-blue-700 mb-2">Monthly • Quarterly • Annual</div>
                <ul className="space-y-1 text-blue-800">
                  <li>✅ Frequency Analysis</li>
                  <li>✅ Trend Analysis</li>
                  <li>✅ Resolution Metrics</li>
                  <li>✅ Staff Performance</li>
                </ul>
              </div>

              {/* Specific Reports */}
              <div className="p-4 bg-white rounded-lg border border-blue-200">
                <div className="font-semibold text-blue-900 mb-2">Focused Analysis Reports</div>
                <div className="text-xs text-blue-700 mb-2">Frequency • Trend • Resolution • Staff</div>
                <ul className="space-y-1 text-blue-800">
                  <li>📊 One specific analysis type</li>
                  <li>📈 In-depth detailed data</li>
                  <li>🎯 Targeted insights</li>
                  <li>⚡ Quick generation</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ComplianceReportsPage;
