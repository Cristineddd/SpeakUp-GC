/**
 * PDF Service — SpeakUp GC
 * Generates formatted case documentation reports using jsPDF + jspdf-autotable.
 *
 * Tech stack reference: jsPDF (client-side PDF generation)
 * Used by: Admin dashboard (case reports), Complainant case export
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CaseReportData {
  caseId: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  filedDate: string;
  updatedDate: string;
  complainant: {
    name: string;
    email?: string;
    department?: string;
    isAnonymous?: boolean;
  };
  respondent?: {
    name: string;
    position?: string;
    department?: string;
  };
  description: string;
  location?: string;
  incidentDate?: string;
  assignedHandler?: string;
  statusHistory?: { status: string; date: string; note?: string }[];
  evidence?: { name: string; type: string }[];
}

export interface SummaryReportData {
  generatedDate: string;
  period: string;
  totalCases: number;
  resolved: number;
  pending: number;
  inProgress: number;
  dismissed: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  cases: Array<{
    caseId: string;
    title: string;
    status: string;
    category: string;
    severity: string;
    filedDate: string;
    handler?: string;
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRAND_GREEN = [26, 122, 69] as [number, number, number];
const LIGHT_GREEN = [232, 245, 238] as [number, number, number];
const GRAY = [107, 114, 128] as [number, number, number];
const DARK = [17, 24, 39] as [number, number, number];

function addPageHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageW = doc.internal.pageSize.getWidth();

  // Green header bar
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, pageW, 28, "F");

  // Logo placeholder circle
  doc.setFillColor(255, 255, 255);
  doc.circle(18, 14, 8, "F");
  doc.setTextColor(...BRAND_GREEN);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("GC", 18, 15.5, { align: "center" });

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("SpeakUp GC", 30, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(title, 30, 18);

  if (subtitle) {
    doc.setFontSize(7.5);
    doc.text(subtitle, 30, 24);
  }

  // Reset text color
  doc.setTextColor(...DARK);
}

function addFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...BRAND_GREEN);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 14, pageW - 14, pageH - 14);

  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text("SpeakUp GC", 14, pageH - 8);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageW - 14, pageH - 8, { align: "right" });
}

function statusColor(status: string): [number, number, number] {
  const s = status.toLowerCase();
  if (s.includes("resolv")) return [22, 163, 74];
  if (s.includes("dismiss")) return [220, 38, 38];
  if (s.includes("progress") || s.includes("investigat")) return [59, 130, 246];
  if (s.includes("pending") || s.includes("review")) return [234, 179, 8];
  return [107, 114, 128];
}

// ─── Case Report ─────────────────────────────────────────────────────────────

/**
 * generateCaseReport
 * Creates a single-case detailed PDF report.
 *
 * Activity flow: Admin / CODI Member → Reports section → select case → download PDF
 */
export function generateCaseReport(data: CaseReportData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  addPageHeader(
    doc,
    `Case Report: ${data.caseId}`,
    `Generated ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`
  );

  let y = 38;

  // ── Case Summary Box ──────────────────────────────────────────────
  doc.setFillColor(...LIGHT_GREEN);
  doc.roundedRect(14, y, pageW - 28, 28, 3, 3, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...DARK);
  doc.text(data.title, 20, y + 7);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRAY);
  doc.text(
    [
      `Case ID: ${data.caseId}`,
      `Category: ${data.category}`,
      `Severity: ${data.severity}`,
      `Filed: ${data.filedDate}`,
      `Last Updated: ${data.updatedDate}`,
    ].join("   ·   "),
    20,
    y + 15
  );

  // Status badge
  const [sr, sg, sb] = statusColor(data.status);
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(pageW - 50, y + 4, 34, 8, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(data.status.toUpperCase(), pageW - 33, y + 9, { align: "center" });

  y += 34;

  // ── Parties ──────────────────────────────────────────────────────
  const partiesData: string[][] = [];

  partiesData.push([
    "Complainant",
    data.complainant.isAnonymous ? "Anonymous" : data.complainant.name,
    data.complainant.isAnonymous ? "—" : (data.complainant.email || "—"),
    data.complainant.department || "—",
  ]);

  if (data.respondent) {
    partiesData.push([
      "Respondent",
      data.respondent.name,
      data.respondent.position || "—",
      data.respondent.department || "—",
    ]);
  }

  if (data.assignedHandler) {
    partiesData.push(["CODI Member", data.assignedHandler, "—", "—"]);
  }

  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Parties Involved", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Role", "Name", "Contact / Position", "Department"]],
    body: partiesData,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Incident Details ──────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text("Incident Details", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    body: [
      ["Location", data.location || "Not specified"],
      ["Incident Date", data.incidentDate || "Not specified"],
      ["Description", data.description],
    ],
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 38, fillColor: LIGHT_GREEN } },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Status History ────────────────────────────────────────────────
  if (data.statusHistory && data.statusHistory.length > 0) {
    if (y > 220) {
      doc.addPage();
      addPageHeader(doc, `Case Report: ${data.caseId} (continued)`);
      y = 38;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text("Case Status Timeline", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Status", "Notes"]],
      body: data.statusHistory.map((h) => [h.date, h.status, h.note || "—"]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Evidence ─────────────────────────────────────────────────────
  if (data.evidence && data.evidence.length > 0) {
    if (y > 220) {
      doc.addPage();
      addPageHeader(doc, `Case Report: ${data.caseId} (continued)`);
      y = 38;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text("Submitted Evidence", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["#", "File Name", "Type"]],
      body: data.evidence.map((e, i) => [String(i + 1), e.name, e.type]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      columnStyles: { 0: { cellWidth: 12 } },
      margin: { left: 14, right: 14 },
    });
  }

  // ── Footers ───────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`SpeakUpGC_Case_${data.caseId}_${Date.now()}.pdf`);
}

// ─── Summary / Admin Report ───────────────────────────────────────────────────

/**
 * generateSummaryReport
 * Creates an admin-level summary PDF for governance / accreditation review.
 *
 * Activity flow: Admin → Reports section → select filters → download PDF
 */
export function generateSummaryReport(data: SummaryReportData): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  addPageHeader(
    doc,
    "Complaint Summary Report",
    `Period: ${data.period}   ·   Generated: ${data.generatedDate}`
  );

  let y = 38;

  // ── Stats overview ────────────────────────────────────────────────
  const statBoxes = [
    { label: "Total Cases", value: data.totalCases, color: BRAND_GREEN },
    { label: "Resolved", value: data.resolved, color: [22, 163, 74] as [number, number, number] },
    { label: "In Progress", value: data.inProgress, color: [59, 130, 246] as [number, number, number] },
    { label: "Pending", value: data.pending, color: [234, 179, 8] as [number, number, number] },
    { label: "Dismissed", value: data.dismissed, color: [220, 38, 38] as [number, number, number] },
  ];

  const boxW = (pageW - 28) / statBoxes.length - 2;
  statBoxes.forEach((box, i) => {
    const x = 14 + i * (boxW + 2);
    doc.setFillColor(...box.color);
    doc.roundedRect(x, y, boxW, 20, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(box.value), x + boxW / 2, y + 11, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(box.label, x + boxW / 2, y + 17, { align: "center" });
  });

  y += 28;

  // ── By Category + By Severity side-by-side ────────────────────────
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("By Category", 14, y);
  doc.text("By Severity", pageW / 2 + 4, y);
  y += 2;

  const categoryRows = Object.entries(data.byCategory).map(([k, v]) => [k, String(v)]);
  const severityRows = Object.entries(data.bySeverity).map(([k, v]) => [k, String(v)]);

  autoTable(doc, {
    startY: y,
    head: [["Category", "Count"]],
    body: categoryRows.length ? categoryRows : [["No data", "0"]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: BRAND_GREEN, textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: pageW / 2 + 4 },
    tableWidth: pageW / 2 - 20,
  });

  autoTable(doc, {
    startY: y,
    head: [["Severity", "Count"]],
    body: severityRows.length ? severityRows : [["No data", "0"]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: BRAND_GREEN, textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: pageW / 2 + 4, right: 14 },
    tableWidth: pageW / 2 - 20,
  });

  y = Math.max((doc as any).lastAutoTable.finalY, y + 20) + 8;

  // ── Cases Table ───────────────────────────────────────────────────
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Case List", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Case ID", "Title", "Category", "Severity", "Status", "Date Filed", "Handler"]],
    body: data.cases.map((c) => [
      c.caseId,
      c.title.length > 40 ? c.title.slice(0, 38) + "…" : c.title,
      c.category,
      c.severity,
      c.status,
      c.filedDate,
      c.handler || "Unassigned",
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: BRAND_GREEN, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 60 },
      4: { cellWidth: 28 },
      5: { cellWidth: 24 },
    },
  });

  // ── Footers ───────────────────────────────────────────────────────
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`SpeakUpGC_Summary_Report_${Date.now()}.pdf`);
}
