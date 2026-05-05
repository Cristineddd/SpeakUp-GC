/**
 * RespondentDashboard — SpeakUp GC
 *
 * Defendant (Respondent) role view.
 * Per the system use-case documentation:
 *  - Receive formal notification of a complaint filed against them
 *  - View complaint details relevant to their case (due process)
 *  - Submit responses / formal statements
 *  - Receive notifications on proceedings
 *
 * Tech stack: React, Tailwind CSS, Firebase Firestore (real-time)
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "../../compat/router";
import { db } from "../../firebase";
import {
  collection, query, where, onSnapshot, Unsubscribe,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { NotificationService } from "../../services/notificationService";
import type { Notification as AppNotification } from "../../types/notification";
import { formatDistanceToNow } from "date-fns";
import {
  Shield, FileText, MessageSquare, Bell, AlertTriangle,
  Info, CheckCircle, Clock, LogOut, Download,
} from "lucide-react";
import { generateSummaryReport } from "../../services/pdfService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RespondentCase {
  id: string;
  title: string;
  category: string;
  status: string;
  filedDate: Date;
  respondentNotified: boolean;
  responseDeadline?: Date;
  hasResponse: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Resolved</Badge>;
  if (s.includes("dismiss"))
    return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Dismissed</Badge>;
  if (s.includes("investigat"))
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Under Investigation</Badge>;
  if (s.includes("review"))
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Under Review</Badge>;
  if (s.includes("await"))
    return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Awaiting Your Response</Badge>;
  return <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">{status}</Badge>;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function RespondentDashboard() {
  const { user, currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [cases, setCases] = useState<RespondentCase[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const userName = user?.displayName?.split(" ")[0] || "Respondent";
  const unreadCount = notifications.filter((n) => n.status === "unread").length;
  const awaitingResponse = cases.filter(
    (c) => c.status.toLowerCase().includes("await") || !c.hasResponse
  ).length;

  // ── Real-time cases where user is respondent ──────────────────────
  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }

    let unsub: Unsubscribe | null = null;

    // Query complaints where respondentId matches current user
    unsub = onSnapshot(
      query(
        collection(db, "complaints"),
        where("respondentId", "==", user.uid)
      ),
      (snap) => {
        const items: RespondentCase[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || "Untitled Case",
            category: data.category || data.type || "General",
            status: data.status || "submitted",
            filedDate: safeToDate(data.createdAt || data.filedDate),
            respondentNotified: !!data.respondentNotified,
            responseDeadline: data.responseDeadline
              ? safeToDate(data.responseDeadline)
              : undefined,
            hasResponse: !!data.respondentResponse,
          };
        });
        setCases(items);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub?.();
  }, [user?.uid]);

  // ── Notifications ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) { setNotifications([]); return; }
    const unsub = NotificationService.subscribeToNotifications(
      currentUser.uid,
      (items) => setNotifications(items),
      { limit: 5 }
    );
    return () => unsub();
  }, [currentUser?.uid]);

  const topNotifications = notifications.slice(0, 3);

  const onNotifClick = async (n: AppNotification) => {
    if (n.status === "unread") {
      try { await NotificationService.markAsRead(n.id); } catch { /* no-op */ }
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, status: "read" } : x))
      );
    }
    if (n.actionUrl) navigate(n.actionUrl);
    else navigate("/notifications");
  };

  const [pdfLoading, setPdfLoading] = useState(false);

  /**
   * PDF Export — generates a summary of all cases filed against the respondent.
   * Activity flow: Respondent → Download Case Summary
   */
  const handleDownloadReport = async () => {
    setPdfLoading(true);
    try {
      generateSummaryReport({
        generatedDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        period: "All time",
        totalCases: cases.length,
        resolved: cases.filter((c) => c.status.toLowerCase().includes("resolv")).length,
        pending: cases.filter((c) => c.status.toLowerCase().includes("submitted") || c.status.toLowerCase().includes("review")).length,
        inProgress: cases.filter((c) => c.status.toLowerCase().includes("investigat")).length,
        dismissed: cases.filter((c) => c.status.toLowerCase().includes("dismiss")).length,
        byCategory: {},
        bySeverity: {},
        cases: cases.map((c, i) => ({
          caseId: `CASE-${String(i + 1).padStart(3, "0")}`,
          title: c.title,
          status: c.status,
          category: c.category,
          severity: "N/A",
          filedDate: c.filedDate.toLocaleDateString("en-US"),
        })),
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header banner ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Respondent Portal</p>
              <p className="text-xs text-gray-500">SpeakUp GC — Gordon College DEIU</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* ── Due-process notice ──────────────────────────────────── */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex gap-4">
          <Info className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800 mb-1">
              You have been formally notified of a complaint.
            </p>
            <p className="text-xs text-orange-700 leading-relaxed">
              In accordance with Gordon College's disciplinary process, you are entitled to view the
              complaint details below and submit a formal written response. All information is handled
              with strict confidentiality by the DEIU office. If you need assistance, contact the
              Guidance Counselor.
            </p>
          </div>
        </div>

        {/* ── Welcome + stat cards ─────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              Welcome, {userName}
            </h1>
            <p className="text-sm text-gray-500">
              Review cases filed against you and submit your formal responses.
            </p>
          </div>
          {/* PDF Export — Respondent case summary */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            disabled={pdfLoading || cases.length === 0}
            className="shrink-0 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {pdfLoading ? "Generating…" : "Download Report"}
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{loading ? "–" : cases.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total Cases</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-600">{loading ? "–" : awaitingResponse}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting Response</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {loading ? "–" : cases.filter((c) => c.status.toLowerCase().includes("resolv")).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Resolved</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Main layout ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Cases list */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">Cases Against You</h2>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : cases.length === 0 ? (
              <Card className="bg-white">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No complaints have been filed against you.</p>
                </CardContent>
              </Card>
            ) : (
              cases.map((c) => (
                <Card key={c.id} className="bg-white hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{c.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {c.category} · Filed{" "}
                          {c.filedDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {statusBadge(c.status)}
                    </div>

                    {c.responseDeadline && !c.hasResponse && (
                      <div className="flex items-center gap-1.5 text-xs text-orange-600 mb-3">
                        <Clock className="w-3.5 h-3.5" />
                        Response deadline:{" "}
                        {c.responseDeadline.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    )}

                    {!c.respondentNotified && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-3">
                        <Info className="w-3.5 h-3.5" />
                        Formal notification pending from DEIU
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => navigate(`/case-tracking/${c.id}`)}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-orange-500 hover:bg-orange-600 text-white"
                        onClick={() => navigate(`/case-chat/${c.id}`)}
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        {c.hasResponse ? "View Response" : "Submit Response"}
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
                    <Badge className="bg-orange-500 text-white text-xs ml-auto">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {topNotifications.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No notifications yet.</p>
                ) : (
                  topNotifications.map((n) => {
                    const isUnread = n.status === "unread";
                    const time = n.createdAt
                      ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                      : "";
                    return (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onNotifClick(n)}
                        className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                          isUnread
                            ? "bg-orange-50 border-orange-200 hover:bg-orange-100"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${
                              isUnread ? "bg-orange-500" : "bg-gray-400"
                            }`}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 line-clamp-2">
                              {n.message || n.title}
                            </p>
                            {!!time && (
                              <p className="text-gray-500 mt-0.5">{time}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-1 text-xs"
                  onClick={() => navigate("/notifications")}
                >
                  View all
                </Button>
              </CardContent>
            </Card>

            {/* Quick info */}
            <Card className="bg-white border-l-4 border-orange-400">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Your Rights
                </h3>
                <ul className="text-xs text-gray-600 space-y-1.5 leading-relaxed">
                  <li>• You have the right to view the complaint filed against you.</li>
                  <li>• You may submit a formal written response through this portal.</li>
                  <li>• All proceedings are confidential.</li>
                  <li>• You may request assistance from the Guidance Counselor.</li>
                </ul>
              </CardContent>
            </Card>

            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => navigate("/chat")}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Open Messages
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
