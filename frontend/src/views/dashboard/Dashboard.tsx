/**
 * Dashboard — Complainant View (SpeakUp GC)
 *
 * Shows a role-aware overview for authenticated complainant users:
 *  - Real-time case statistics (Total, Pending, In Progress, Resolved)
 *  - Recent complaints table (from "reports" + "complaints" Firestore collections)
 *  - Live notifications (NotificationService)
 *  - Messages widget (MessageService — most recent case chat)
 *  - Quick actions
 *
 * Related views: RespondentDashboard, AdminDashboard, DashboardRouter
 * Tech stack: React + Tailwind CSS + Firebase Firestore (real-time onSnapshot)
 */
import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useNavigate, Link } from "../../compat/router";
import { useAuth } from "../../contexts/AuthContext";
import {
  FileText, Clock, CheckCircle, AlertTriangle, Bell, Shield,
  MessageSquare, Plus, ArrowRight, User, Lock,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { ComplaintStatus } from "../../types/complaints";
import { collection, query, where, onSnapshot, Unsubscribe, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { NotificationService } from "../../services/notificationService";
import type { Notification as AppNotification } from "../../types/notification";
import { formatDistanceToNow } from "date-fns";
import { MessageService } from "../../services/messageService";
import type { ChatRoom } from "../../types/message";
import ProfileSetupModal from "../../components/ProfileSetupModal";
import GBVChatbot from "../../components/GBVChatbot";

// ─── Helpers ───
const safeToDate = (dateValue: any): Date => {
  if (!dateValue) return new Date();
  if (dateValue instanceof Date) return isNaN(dateValue.getTime()) ? new Date() : dateValue;
  if (dateValue && typeof dateValue.toDate === "function") {
    try { return dateValue.toDate(); } catch { return new Date(); }
  }
  if (typeof dateValue === "string" || typeof dateValue === "number") {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

const toComplaintStatus = (status: string): ComplaintStatus => {
  const map: Record<string, ComplaintStatus> = {
    draft: ComplaintStatus.DRAFT,
    submitted: ComplaintStatus.SUBMITTED,
    under_review: ComplaintStatus.UNDER_REVIEW,
    requirements_pending: ComplaintStatus.REQUIREMENTS_PENDING,
    validated: ComplaintStatus.VALIDATED,
    investigating: ComplaintStatus.INVESTIGATING,
    awaiting_response: ComplaintStatus.AWAITING_RESPONSE,
    under_deliberation: ComplaintStatus.UNDER_DELIBERATION,
    resolved: ComplaintStatus.RESOLVED,
    dismissed: ComplaintStatus.DISMISSED,
    withdrawn: ComplaintStatus.WITHDRAWN,
    pending: ComplaintStatus.SUBMITTED,
    in_progress: ComplaintStatus.INVESTIGATING,
    inProgress: ComplaintStatus.INVESTIGATING,
    "in progress": ComplaintStatus.INVESTIGATING,
    inprogress: ComplaintStatus.INVESTIGATING,
    closed: ComplaintStatus.RESOLVED,
  };

  return map[status] || map[status?.toLowerCase()] || ComplaintStatus.SUBMITTED;
};

const formatEnum = (v: string) => v.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

interface SimpleComplaint {
  id: string;
  title: string;
  status: ComplaintStatus;
  createdAt: Date;
  updatedAt: Date;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, currentUser } = useAuth();
  const [complaints, setComplaints] = useState<SimpleComplaint[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  // ── Profile setup modal ──────────────────────────────────────────────────
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [alias, setAlias] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (!snap.exists() || !snap.data()?.profileSetupComplete) {
          setShowProfileSetup(true);
        } else {
          setAlias(snap.data()?.alias ?? null);
        }
      } catch {
        // non-blocking — skip modal if check fails
      }
    })();
  }, [currentUser?.uid]);

  const userName = alias || user?.displayName?.split(" ")[0] || "User";

  // ─── Real-time complaint counts ───
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    let reportsUnsub: Unsubscribe | null = null;
    let complaintsUnsub: Unsubscribe | null = null;
    let reportsData: SimpleComplaint[] = [];
    let complaintsData: SimpleComplaint[] = [];

    const merge = () => {
      const map = new Map<string, SimpleComplaint>();
      const seen = new Set<string>();
      const key = (c: SimpleComplaint) => {
        const t = c.title.toLowerCase().trim();
        const d = Math.floor((isNaN(c.createdAt.getTime()) ? Date.now() : c.createdAt.getTime()) / 86400000);
        return `${t}-${d}`;
      };
      complaintsData.forEach((c) => { map.set(c.id, c); seen.add(key(c)); });
      reportsData.forEach((r) => { if (!seen.has(key(r))) { map.set(r.id, r); seen.add(key(r)); } });
      const arr = Array.from(map.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setComplaints(arr);
      setLoading(false);
    };

    try {
      reportsUnsub = onSnapshot(
        query(collection(db, "reports"), where("userId", "==", user.uid)),
        (snap) => {
          reportsData = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || data.description || "Untitled Report",
              status: toComplaintStatus(data.status || "submitted"),
              createdAt: safeToDate(data.reportedAt || data.createdAt),
              updatedAt: safeToDate(data.lastUpdated || data.updatedAt),
            };
          });
          merge();
        }
      );
    } catch (e) { console.error(e); }

    try {
      complaintsUnsub = onSnapshot(
        query(collection(db, "complaints"), where("complainantId", "==", user.uid)),
        (snap) => {
          complaintsData = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || "Untitled Complaint",
              status: toComplaintStatus(data.status || "submitted"),
              createdAt: safeToDate(data.createdAt),
              updatedAt: safeToDate(data.updatedAt || data.createdAt),
            };
          });
          merge();
        }
      );
    } catch (e) { console.error(e); }

    return () => { reportsUnsub?.(); complaintsUnsub?.(); };
  }, [user]);

  // ─── Notifications ───
  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      return;
    }

    const unsubscribe = NotificationService.subscribeToNotifications(
      currentUser.uid,
      (items) => setNotifications(items),
      { limit: 5 }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const topNotifications = notifications.slice(0, 2);

  const onNotificationClick = async (n: AppNotification) => {
    try {
      if (n.status === "unread") {
        await NotificationService.markAsRead(n.id);
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: "read" } : x)));
      }
    } catch {
      // non-blocking
    }
    if (n.actionUrl) navigate(n.actionUrl);
    else navigate("/notifications");
  };

  // ─── Messages / Chat rooms (dashboard preview) ───
  useEffect(() => {
    if (!currentUser?.uid) {
      setChatRooms([]);
      return;
    }

    const unsub = MessageService.subscribeToUserChatRooms(
      currentUser.uid,
      (rooms) => setChatRooms(rooms),
      { limit: 3 }
    );

    return () => unsub();
  }, [currentUser?.uid]);

  // ─── Derived counts ───
  const total = complaints.length;

  const isStatus = (complaint: SimpleComplaint, ...statuses: (string | ComplaintStatus)[]) => {
    const statusStr = String(complaint.status);
    return statuses.some(s => String(s) === statusStr);
  };

  const pending = complaints.filter(
    (c) => isStatus(c, 'pending', 'submitted', ComplaintStatus.SUBMITTED, ComplaintStatus.UNDER_REVIEW, ComplaintStatus.REQUIREMENTS_PENDING)
  ).length;

  const inProgress = complaints.filter(
    (c) => isStatus(c, 'inProgress', ComplaintStatus.VALIDATED, ComplaintStatus.INVESTIGATING, ComplaintStatus.AWAITING_RESPONSE, ComplaintStatus.UNDER_DELIBERATION)
  ).length;

  const resolved = complaints.filter((c) =>
    isStatus(c, 'resolved', ComplaintStatus.RESOLVED)
  ).length;

  const recentComplaints = complaints.slice(0, 4);

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case ComplaintStatus.RESOLVED:
        return <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs font-medium">Resolved</Badge>;
      case ComplaintStatus.DISMISSED:
        return <Badge className="bg-red-50 text-red-700 border border-red-200 text-xs font-medium">Dismissed</Badge>;
      case ComplaintStatus.INVESTIGATING:
        return <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-medium">Investigating</Badge>;
      case ComplaintStatus.UNDER_REVIEW:
        return <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">Under Review</Badge>;
      case ComplaintStatus.AWAITING_RESPONSE:
        return <Badge className="bg-orange-50 text-orange-700 border border-orange-200 text-xs font-medium">Awaiting Response</Badge>;
      default:
        return <Badge className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">{formatEnum(status)}</Badge>;
    }
  };

  const isNewUser = !loading && total === 0 && notifications.length === 0 && chatRooms.length === 0;

  return (
    // ─── Page background: light green-tinted (applied at layout level) ───
    <div className="min-h-full">
      <ProfileSetupModal
        isOpen={showProfileSetup}
        onComplete={(completedAlias?: string) => {
          if (completedAlias) setAlias(completedAlias);
          setShowProfileSetup(false);
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-5">

        {/* ─── Welcome Header ─── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, <span className="text-[#16A34A]">{userName}</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">Here's what's happening with your cases today.</p>
        </div>

        {/* ─── Privacy Notice ─── */}
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: "#F0FDF4", border: "0.5px solid #86EFAC" }}
        >
          <div className="rounded-lg p-2 shrink-0" style={{ background: "#DCFCE7" }}>
            <Lock className="h-4 w-4 text-[#16A34A]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#15803D]">Your privacy is protected</p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#4B7C55" }}>
              All complaints are handled with strict confidentiality by the DEIU office.
              Your identity is <strong>never disclosed</strong> to respondents without your consent.
              You may also file anonymously.
            </p>
          </div>
        </div>

        {/* ─── Stats Row ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Filed",  value: total,      icon: FileText,      iconColor: "text-gray-500",   bg: "#F3F4F6" },
            { label: "Pending",      value: pending,    icon: Clock,         iconColor: "text-yellow-600", bg: "#FEFCE8" },
            { label: "In Progress",  value: inProgress, icon: AlertTriangle, iconColor: "text-blue-600",   bg: "#EFF6FF" },
            { label: "Resolved",     value: resolved,   icon: CheckCircle,   iconColor: "text-[#16A34A]",  bg: "#DCFCE7" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ background: "#fff", border: "0.5px solid #e2f0e5" }}
              >
                <div className="rounded-xl p-2.5 shrink-0" style={{ background: stat.bg }}>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{loading ? "–" : stat.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* ─── Main Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Recent Cases ── */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#fff", border: "0.5px solid #e2f0e5" }}
            >
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "0.5px solid #e8f4ea" }}
              >
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  Recent Cases
                </p>
                {total > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/complaints")}
                    className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium flex items-center gap-1"
                  >
                    View all <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="p-4 min-h-[240px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#16A34A]" />
                  </div>
                ) : recentComplaints.length > 0 ? (
                  <div className="space-y-2">
                    {recentComplaints.map((complaint, idx) => (
                      <button
                        key={complaint.id}
                        type="button"
                        className="w-full text-left flex items-center justify-between gap-3 p-3 rounded-xl transition-colors hover:bg-[#F0FDF4]"
                        style={{ border: "0.5px solid transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = "#86EFAC")}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
                        onClick={() => navigate(`/case-tracking/${complaint.id}`)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="rounded-lg p-2 shrink-0" style={{ background: "#DCFCE7" }}>
                            <FileText className="h-4 w-4 text-[#16A34A]" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{complaint.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              CASE-{String(idx + 1).padStart(3, "0")} · {safeToDate(complaint.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {complaint.status === ComplaintStatus.SUBMITTED || complaint.status === ComplaintStatus.UNDER_REVIEW ? (
                            <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-medium">Pending</Badge>
                          ) : complaint.status === ComplaintStatus.INVESTIGATING ? (
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">In Progress</Badge>
                          ) : complaint.status === ComplaintStatus.RESOLVED ? (
                            <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs font-medium">Resolved</Badge>
                          ) : (
                            getStatusBadge(complaint.status)
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-10 text-center px-6">
                    <div
                      className="rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center"
                      style={{ background: "#DCFCE7" }}
                    >
                      <Shield className="h-8 w-8 text-[#16A34A]" />
                    </div>
                    <p className="text-gray-800 font-semibold text-sm">You're all set — we're here when you need us</p>
                    <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
                      If you've experienced harassment, bullying, or any misconduct, you can file a complaint confidentially.
                      Once submitted, a case handler will review and update you every step of the way.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate("/complaints/new")}
                      className="mt-5 bg-[#16A34A] hover:bg-[#15803D] text-white px-5"
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> File a Complaint
                    </Button>
                    <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Anonymous filing is available
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="space-y-4">

            {isNewUser ? (
              /* ── Onboarding checklist ── */
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "#fff", border: "0.5px solid #e2f0e5" }}
              >
                <div className="px-5 py-3.5" style={{ borderBottom: "0.5px solid #e8f4ea" }}>
                  <p className="text-sm font-semibold text-gray-800">Getting Started</p>
                  <p className="text-xs text-gray-400 mt-0.5">Follow these steps to get the most out of SpeakUp GC</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { step: 1, label: "Complete your profile",      desc: "Add your details so we can contact you if needed", link: "/account" },
                    { step: 2, label: "File your first complaint",   desc: "Submit a case — it only takes a few minutes",       link: "/complaints/new" },
                    { step: 3, label: "Track its status",           desc: "Once filed, monitor updates in My Cases",           link: "/complaints" },
                  ].map((item) => (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => navigate(item.link)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-[#F0FDF4]"
                      style={{ border: "0.5px solid #e2f0e5" }}
                    >
                      <div
                        className="rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold"
                        style={{ background: "#DCFCE7", color: "#16A34A" }}
                      >
                        {item.step}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-300 shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Notifications ── */
              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: "#fff", border: "0.5px solid #e2f0e5" }}
              >
                <div
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: "0.5px solid #e8f4ea" }}
                >
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Bell className="h-4 w-4 text-gray-400" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="bg-[#16A34A] text-white text-xs rounded-full px-2 py-0.5 font-medium">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/notifications")}
                    className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium"
                  >
                    See all
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {topNotifications.length === 0 ? (
                    <div className="py-6 text-center">
                      <Bell className="h-7 w-7 text-gray-200 mx-auto mb-1" />
                      <p className="text-xs text-gray-400">You're all caught up.</p>
                    </div>
                  ) : (
                    topNotifications.map((n) => {
                      const isUnread = n.status === "unread";
                      const time = n.createdAt ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }) : "";
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className="w-full text-left p-3 rounded-xl transition-colors"
                          style={{
                            background: isUnread ? "#F0FDF4" : "#F9FAFB",
                            border: `0.5px solid ${isUnread ? "#86EFAC" : "#e2f0e5"}`,
                          }}
                          onClick={() => onNotificationClick(n)}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                              style={{ background: isUnread ? "#16A34A" : "#D1D5DB" }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-800 leading-snug">{n.message || n.title}</p>
                              {!!time && <p className="text-xs text-gray-400 mt-0.5">{time}</p>}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── Messages ── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#fff", border: "0.5px solid #e2f0e5" }}
            >
              <div
                className="flex items-center justify-between px-5 py-3.5"
                style={{ borderBottom: "0.5px solid #e8f4ea" }}
              >
                <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  Messages
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/chat")}
                  className="text-xs text-[#16A34A] hover:text-[#15803D] font-medium"
                >
                  See all
                </button>
              </div>
              <div className="p-4">
                {chatRooms.length === 0 ? (
                  <div className="text-center py-5">
                    <MessageSquare className="h-7 w-7 text-gray-200 mx-auto mb-1" />
                    <p className="text-xs text-gray-400">Messages with your case handler will appear here once a case is filed.</p>
                  </div>
                ) : (
                  chatRooms.slice(0, 1).map((room) => {
                    const unread = room.unreadCount?.[currentUser?.uid || ""] || 0;
                    const preview = room.lastMessage?.content || "Open chat";
                    return (
                      <button
                        key={room.id}
                        type="button"
                        className="w-full text-left p-3 rounded-xl transition-colors hover:bg-[#F0FDF4]"
                        style={{ background: "#F9FFF9", border: "0.5px solid #e2f0e5" }}
                        onClick={() => navigate(`/case-chat/${room.complaintId}`)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{room.complaintTitle || "Case Chat"}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{preview}</p>
                          </div>
                          {unread > 0 && (
                            <span className="bg-[#16A34A] text-white text-xs rounded-full px-1.5 py-0.5 font-medium shrink-0">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#fff", border: "0.5px solid #e2f0e5" }}
            >
              <div className="px-5 py-3.5" style={{ borderBottom: "0.5px solid #e8f4ea" }}>
                <p className="text-sm font-semibold text-gray-800">Quick Actions</p>
              </div>
              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => navigate("/complaints/new")}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">File a Complaint</span>
                </button>

                {[
                  { label: "My Cases",       icon: FileText,      path: "/complaints" },
                  { label: "Notifications",  icon: Bell,          path: "/notifications", badge: unreadCount },
                  { label: "Messages",       icon: MessageSquare, path: "/chat" },
                  { label: "My Profile",     icon: User,          path: "/account" },
                ].map(({ label, icon: Icon, path, badge }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigate(path)}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[#F0FDF4]"
                    style={{ background: "#F9FFF9", border: "0.5px solid #e2f0e5" }}
                  >
                    <Icon className="h-4 w-4 text-[#16A34A] shrink-0" />
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    {badge != null && badge > 0 && (
                      <span className="ml-auto bg-[#16A34A] text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
                        {badge > 9 ? "9+" : badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── GBV Chatbot (Laya) ── */}
      <GBVChatbot />
    </div>
  );
}