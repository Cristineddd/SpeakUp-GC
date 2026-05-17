/**
 * CommunityFeed — redesigned to match SpeakUp GC design system.
 * Route: /know-your-rights (or /community-feed)
 */

import React, { useState } from "react";
import {
  Users,
  UserCircle,
  Bell,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  X,
  AlertCircle,
  Info,
} from "lucide-react";
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalStep = "type" | "details" | null;
type ConcernType = "personal" | "community" | null;

// ─── Static data ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Academic",
  "Facilities",
  "Misconduct",
  "Safety",
  "Mental Health",
  "Policy",
  "Other",
];

const GUIDELINES = [
  "Be respectful and constructive",
  "Do not name or identify individuals",
  "Keep posts relevant to community concerns",
  "Avoid sharing unverified information",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Topbar({ onShare }: { onShare: () => void }) {
  const { currentUser } = useAuth();
  const displayName = currentUser?.displayName || currentUser?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  return (
    <header className="bg-white border-b border-[#ebebeb] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
      <p className="text-sm text-gray-500">
        Welcome,{" "}
        <span className="font-medium text-green-700">{displayName}</span>
      </p>
      <div className="flex items-center gap-4">
        {/* Bell */}
        <button className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="h-4.5 w-4.5 text-gray-500 h-[18px] w-[18px]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
          <span className="text-xs font-medium text-white">{initial}</span>
        </div>
      </div>
    </header>
  );
}

function GuideCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-[#ebebeb] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors duration-150"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            How to post without name-dropping
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Guide for responsible posting
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#ebebeb] pt-4 space-y-2">
          <p className="text-sm text-gray-600 leading-relaxed">
            When describing your concern, refer to people by their role rather
            than their name. This keeps the conversation constructive and protects
            everyone involved.
          </p>
          <ul className="space-y-1.5 mt-2">
            {[
              'Say "a faculty member" instead of naming the person.',
              'Say "a classmate" instead of giving identifiers.',
              "Focus on the situation, not the individual.",
              "If it is a formal complaint, use the File a Complaint form instead.",
            ].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

function ModalStep1({
  selected,
  onSelect,
  onContinue,
  onClose,
}: {
  selected: ConcernType;
  onSelect: (v: ConcernType) => void;
  onContinue: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#ebebeb]">
          <div>
            <p className="text-base font-medium text-gray-900">Share a concern</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Select the type of concern you want to share.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Type cards */}
        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          {(
            [
              {
                value: "personal" as ConcernType,
                label: "Personal concern",
                desc: "This directly affects you or a specific individual.",
                icon: UserCircle,
              },
              {
                value: "community" as ConcernType,
                label: "Community concern",
                desc: "This affects a group, class, or the school community.",
                icon: Users,
              },
            ] as { value: ConcernType; label: string; desc: string; icon: React.ElementType }[]
          ).map((opt) => {
            const Icon = opt.icon;
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value!}
                onClick={() => onSelect(opt.value)}
                className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-all duration-150 ${
                  isSelected
                    ? "border-green-600 bg-[#f0fdf4]"
                    : "border-[#ebebeb] hover:border-gray-300 bg-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${isSelected ? "text-green-600" : "text-gray-400"}`}
                />
                <p
                  className={`text-sm font-medium ${
                    isSelected ? "text-green-800" : "text-gray-900"
                  }`}
                >
                  {opt.label}
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Info box */}
        <div className="mx-6 mb-5 bg-gray-50 border border-[#ebebeb] rounded-lg p-4">
          <p className="text-xs font-medium text-gray-700 mb-2">
            What happens to your post?
          </p>
          <ol className="space-y-1.5">
            {[
              "Your concern is submitted for review.",
              "The DEIU team checks it for guideline compliance.",
              "Approved posts appear in the Community Feed.",
              "Similar concerns are grouped in the weekly digest.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onContinue}
            disabled={!selected}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors duration-150"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalStep2({
  onBack,
  onClose,
}: {
  onBack: () => void;
  onClose: () => void;
}) {
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { currentUser } = useAuth();
  const displayName = currentUser?.displayName || currentUser?.email || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const MAX_DESC = 500;

  const canSubmit = category && title.trim() && description.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#ebebeb] flex-shrink-0">
          <div>
            <p className="text-base font-medium text-gray-900">Post details</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Fill in the details of your concern.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Community guidelines */}
          <div>
            <button
              onClick={() => setGuidelinesOpen((v) => !v)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 border border-[#ebebeb] rounded-lg text-left"
            >
              <span className="text-xs font-medium text-gray-700">
                Community guidelines
              </span>
              {guidelinesOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              )}
            </button>
            {guidelinesOpen && (
              <ul className="mt-2 space-y-1.5 px-1">
                {GUIDELINES.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                    <Info className="h-3 w-3 text-gray-400 flex-shrink-0 mt-0.5" />
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A brief title for your concern"
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, MAX_DESC))
                }
                placeholder='Describe the concern without naming individuals. Use roles (e.g. "a faculty member") instead.'
                rows={4}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 resize-y min-h-[90px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <span className="absolute bottom-2 right-3 text-[11px] text-gray-400">
                {description.length}/{MAX_DESC}
              </span>
            </div>
          </div>

          {/* Anonymous toggle */}
          <div className="bg-gray-50 border border-[#ebebeb] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Post anonymously</p>
                <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
                  Your name won't appear publicly. Admin can still see it internally.
                </p>
              </div>
              {/* Toggle */}
              <button
                onClick={() => setIsAnonymous((v) => !v)}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  isAnonymous ? "bg-green-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    isAnonymous ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Will appear as */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#ebebeb]">
              <p className="text-xs text-gray-400 flex-shrink-0">Will appear as</p>
              {isAnonymous ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-500">?</span>
                  </div>
                  <span className="text-sm text-gray-500">Anonymous</span>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                    <span className="text-[10px] font-medium text-white">{initial}</span>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">{displayName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#ebebeb] flex-shrink-0">
          <button
            onClick={onBack}
            className="bg-white hover:bg-gray-50 text-gray-600 text-sm px-4 py-2 border border-gray-200 rounded-lg transition-colors duration-150"
          >
            Back
          </button>
          <button
            disabled={!canSubmit}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-lg transition-colors duration-150"
          >
            Submit for review
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function CommunityFeed() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const [modalStep, setModalStep] = useState<ModalStep>(null);
  const [concernType, setConcernType] = useState<ConcernType>(null);
  const [search, setSearch] = useState("");

  const openModal = () => {
    setConcernType(null);
    setModalStep("type");
  };

  const closeModal = () => {
    setModalStep(null);
    setConcernType(null);
  };

  // Only show Topbar if not on /know-your-rights
  const showTopbar = !pathname.startsWith('/know-your-rights');

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f7]">
      {showTopbar && <Topbar onShare={openModal} />}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Page title row */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Community Feed</h1>
                <p className="text-sm text-gray-400 mt-1">
                  Share concerns, read community updates, and stay informed.
                </p>
              </div>
              <button
                onClick={openModal}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                Share concern
              </button>
            </div>

            {/* Guide card */}
            <GuideCard />

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts..."
                className="w-full text-sm pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Empty state */}
            <div className="bg-white border border-[#ebebeb] rounded-xl px-6 py-12 text-center">
              <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No posts yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Be the first to share a concern with the community.
              </p>
              <button
                onClick={openModal}
                className="mt-4 text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
              >
                Share a concern
              </button>
            </div>
          </div>
        </main>

      {/* Modals */}
      {modalStep === "type" && (
        <ModalStep1
          selected={concernType}
          onSelect={setConcernType}
          onContinue={() => setModalStep("details")}
          onClose={closeModal}
        />
      )}
      {modalStep === "details" && (
        <ModalStep2
          onBack={() => setModalStep("type")}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
