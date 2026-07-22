/**
 * CaseHandlerDashboard — SpeakUp GC (CODI Member View)
 *
 * Use-case coverage (per system documentation):
 *   UC-06 Assign Case to CODI    — shows cases assigned to this CODI member
 *   UC-07 Investigate Case       — links to investigation workspace
 *   UC-08 Update Case Status     — quick status update from the card
 *   UC-09 Generate Case Report   — PDF export via jsPDF (pdfService.ts)
 *
 * Role: UserRole.CODI | 'codi'
 *
 * Tech stack: React, Tailwind CSS, Firebase Firestore (real-time onSnapshot),
 *             jsPDF + jspdf-autotable (PDF generation), Next.js router compat shim
 */
import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "../../compat/router";
import { db } from "../../firebase";
import {
  collection, query, where, onSnapshot, Unsubscribe, orderBy,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { NotificationService } from "../../services/notificationService";
import type { Notification as AppNotification } from "../../types/notification";
import { formatDistanceToNow } from "date-fns";
import { generateSummaryReport } from "../../services/pdfService";
import {
  Briefcase, FileText, Clock, CheckCircle, AlertTriangle,
  Bell, Download, MessageSquare, Search, ArrowRight,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AssignedCase {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  filedDate: Date;
  updatedAt: Date;
  complainant: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeToDate = (v: any): Date => {
  if (!v) return new Date();
  if (v instanceof Date) return isNaN(v.getTime()) ? new Date() : v;
  if (v?.toDate) { try { return v.toDate(); } catch { return new Date(); } }
  const p = new Date(v);
  return isNaN(p.getTime()) ? new Date() : p;
};

const statusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes("resolv"))
    return <Badge className="bg-green-100 text-green-700 text-xs">Resolved</Badge>;
  if (s.includes("dismiss"))
    return <Badge className="bg-red-100 text-red-700 text-xs">Dismissed</Badge>;
  if (s.includes("investigat"))
    return <Badge className="bg-yellow-100 text-yellow-700 text-xs">Investigating</Badge>;
  if (s.includes("deliberat"))
    return <Badge className="bg-purple-100 text-purple-700 text-xs">Under Deliberation</Badge>;
  if (s.includes("review"))
    return <Badge className="bg-blue-100 text-blue-700 text-xs">Under Review</Badge>;
  if (s.includes("await"))
    return <Badge className="bg-orange-100 text-orange-700 text-xs">Awaiting Response</Badge>;
  return <Badge className="bg-gray-100 text-gray-700 text-xs">{status}</Badge>;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function CaseHandlerDashboard() {
  const { user, currentUser } = useAuth();
  const navigate = useNavigate();

  const [cases, setCases] = useState<AssignedCase[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [search, setSearch] = useState("");

  const userName = user?.displayName?.split(" ")[0] || "CODI Member";
  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  // ── Real-time assigned cases ──────────────────────────────────────────────
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }

    // Query cases where assignedTo (CODI member) = current user
    const unsub: Unsubscribe = onSnapshot(
      query(
        collection(db, "complaints"),
        where("assignedTo", "==", user.uid),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const items: AssignedCase[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || "Untitled Case",
            category: data.category || data.type || "General",
            severity: data.severity || "medium",
            status: data.status || "submitted",
            filedDate: safeToDate(data.createdAt || data.filedDate),
            updatedAt: safeToDate(data.updatedAt || data.lastUpdated),
            complainant: data.complainantName || data.isAnonymous ? "Anonymous" : "Unknown",
          };
        });
        setCases(items);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [user?.uid]);

  // ── Notifications ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) { setNotifications([]); return; }
    const unsub = NotificationService.subscribeToNotifications(
      currentUser.uid,
      (items) => setNotifications(items),
      { limit: 5 }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const active = cases.filter(
    (c) => !c.status.includes("resolv") && !c.status.includes("dismiss")
  ).length;
  const resolved = cases.filter((c) => c.status.includes("resolv")).length;
  const awaiting = cases.filter((c) => c.status.includes("await")).length;

  const filtered = cases.filter(
    (c) =>
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.category.toLowerCase().includes(search.toLowerCase())
  );

  // ── PDF export ────────────────────────────────────────────────────────────
  const handleDownloadReport = async () => {
    setPdfLoading(true);
    try {
      generateSummaryReport({
        generatedDate: new Date().toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        }),
        period: "All time",
        totalCases: cases.length,
        resolved,
        pending: cases.filter(
          (c) => c.status.includes("submitted") || c.status.includes("review")
        ).length,
        inProgress: active,
        dismissed: cases.filter((c) => c.status.includes("dismiss")).length,
        byCategory: cases.reduce<Record<string, number>>((acc, c) => {
          acc[c.category] = (acc[c.category] || 0) + 1;
          return acc;
        }, {}),
        bySeverity: cases.reduce<Record<string, number>>((acc, c) => {
          acc[c.severity] = (acc[c.severity] || 0) + 1;
          return acc;
        }, {}),
        cases: cases.map((c, i) => ({
          caseId: `CASE-${String(i + 1).padStart(3, "0")}`,
          title: c.title,
          status: c.status,
          category: c.category,
          severity: c.severity,
          filedDate: c.filedDate.toLocaleDateString("en-US"),
          handler: userName,
        })),
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">CODI Member Portal</p>
              <p className="text-xs text-gray-500">SpeakUp GC — Gordon College DEIU</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              disabled={pdfLoading || cases.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {pdfLoading ? "Generating…" : "Export PDF"}
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/admin/reports")}
              className="bg-[#1D9E75] hover:bg-[#178F65] text-white flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              All Reports
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {userName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your assigned cases, update statuses, and generate reports.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{loading ? "–" : cases.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total Assigned</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{loading ? "–" : active}</p>
              <p className="text-xs text-gray-500 mt-1">Active Cases</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-500">{loading ? "–" : awaiting}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting Response</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{loading ? "–" : resolved}</p>
              <p className="text-xs text-gray-500 mt-1">Resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cases list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold text-gray-900 flex-1">Assigned Cases</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cases…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/40 bg-white"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D9E75]" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="bg-white">
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    {search ? "No cases match your search." : "No cases assigned to you yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((c) => (
                <Card key={c.id} className="bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{c.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.category} · {c.severity} severity · Filed{" "}
                          {c.filedDate.toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </div>
                      {statusBadge(c.status)}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => navigate(`/case-tracking/${c.id}`)}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        View Case
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-[#1D9E75] hover:bg-[#178F65] text-white"
                        onClick={() => navigate(`/case-chat/${c.id}`)}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs ml-auto"
                        onClick={() => navigate(`/admin/reports/${c.id}`)}
                      >
                        Update Status
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Notifications */}
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge className="bg-[#1D9E75] text-white text-xs ml-auto">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notifications.slice(0, 3).length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No notifications yet.</p>
                ) : (
                  notifications.slice(0, 3).map((n) => {
                    const isUnread = n.status === "unread";
                    const time = n.createdAt
                      ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                      : "";
                    return (
                      <div
                        key={n.id}
                        className={`p-3 rounded-lg border text-xs ${
                          isUnread
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <p className="font-medium text-gray-900 line-clamp-2">{n.message || n.title}</p>
                        {!!time && <p className="text-gray-500 mt-0.5">{time}</p>}
                      </div>
                    );
                  })
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => navigate("/notifications")}
                >
                  View all
                </Button>
              </CardContent>
            </Card>

            {/* Quick navigation */}
            <Card className="bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Quick Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  onClick={() => navigate("/admin/reports")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  All Reports Queue
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  onClick={() => navigate("/chat")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  onClick={() => navigate("/admin")}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
