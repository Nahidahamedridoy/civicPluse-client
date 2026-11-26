"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Alert, Button, Card, Chip, Separator } from "@heroui/react";
import {
  AlertCircle,
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  History,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import {
  IssueActivityLog,
  IssueProgressReport,
  ManagerIssue,
  StaffWorkloadItem,
  assignIssueToStaff,
  fetchIssueActivity,
  fetchIssueProgressReports,
  getPriorityMeta,
  getStatusMeta,
  updateDepartmentIssueStatus,
  updateIssuePriority,
  verifyDepartmentIssue,
} from "@/lib/manager-api";
import { getRoleLabel } from "@/lib/auth";

interface ManagerIssueModalProps {
  issue: ManagerIssue | null;
  token: string;
  staffList: StaffWorkloadItem[];
  initialFocusAction?: "overview" | "verify" | "assign" | "history";
  onClose: () => void;
  onIssueUpdated: (updatedIssue: ManagerIssue, feedbackMessage: string) => void;
}

const PRIORITY_CHOICES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "assigned", "closed"],
  under_review: ["assigned", "in_progress", "closed"],
  assigned: ["in_progress", "under_review", "closed"],
  in_progress: ["resolved", "assigned", "under_review"],
  resolved: ["closed", "in_progress"],
  closed: ["under_review"],
};

function getActionLabel(action: string): string {
  switch (action?.toLowerCase()) {
    case "created":
      return "Issue Reported";
    case "verified":
      return "Verified & Reviewed";
    case "assigned":
      return "Staff Assigned";
    case "status_changed":
      return "Status Changed";
    case "progress_reported":
      return "Progress Report";
    case "updated":
      return "Details Updated";
    default:
      return action?.replace(/_/g, " ") || "Activity";
  }
}

export function ManagerIssueModal({
  issue,
  token,
  staffList,
  initialFocusAction = "overview",
  onClose,
  onIssueUpdated,
}: ManagerIssueModalProps) {
  const [currentIssue, setCurrentIssue] = useState<ManagerIssue | null>(issue);
  const [activeTab, setActiveTab] = useState<"details" | "history" | "reports">(
    initialFocusAction === "history" ? "history" : "details"
  );

  // Action states
  const [priorityInput, setPriorityInput] = useState<string>(issue?.priority || "medium");
  const [verifyNotes, setVerifyNotes] = useState<string>("");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    issue?.assignedTo?._id || ""
  );
  const [selectedNextStatus, setSelectedNextStatus] = useState<string>(() => {
    const allowed = issue?.status
      ? ALLOWED_TRANSITIONS[issue.status.toLowerCase()] || []
      : [];
    return allowed[0] || "";
  });
  const [statusNotes, setStatusNotes] = useState<string>("");

  // Submission & feedback states
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // History & Progress reports
  const [activityLogs, setActivityLogs] = useState<IssueActivityLog[]>([]);
  const [progressReports, setProgressReports] = useState<IssueProgressReport[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(Boolean(issue?._id));
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Image lightbox state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const issueId = issue?._id;

  // Manual refresh callback for activity history and progress reports
  const loadHistoryAndReports = useCallback(async () => {
    if (!issueId || !token) return;
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const [logsRes, reportsRes] = await Promise.all([
        fetchIssueActivity(token, issueId),
        fetchIssueProgressReports(token, issueId),
      ]);
      setActivityLogs(logsRes);
      setProgressReports(reportsRes);
    } catch (err: unknown) {
      setHistoryError(
        err instanceof Error ? err.message : "Failed to load status and resolution history."
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, [issueId, token]);

  // Initial load of activity history and progress reports
  useEffect(() => {
    if (!issueId || !token) return;
    let active = true;

    Promise.all([
      fetchIssueActivity(token, issueId),
      fetchIssueProgressReports(token, issueId),
    ])
      .then(([logsRes, reportsRes]) => {
        if (!active) return;
        setActivityLogs(logsRes);
        setProgressReports(reportsRes);
        setHistoryError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setHistoryError(
          err instanceof Error ? err.message : "Failed to load status and resolution history."
        );
      })
      .finally(() => {
        if (active) setIsHistoryLoading(false);
      });

    return () => {
      active = false;
    };
  }, [issueId, token]);

  if (!currentIssue) return null;

  const statusMeta = getStatusMeta(currentIssue.status);
  const priorityMeta = getPriorityMeta(currentIssue.priority);
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentIssue.status?.toLowerCase()] || [];

  const formattedCreatedAt = new Date(currentIssue.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedUpdatedAt = new Date(currentIssue.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const applyUpdatedIssue = (updated: ManagerIssue, message: string) => {
    setCurrentIssue(updated);
    setPriorityInput(updated.priority || "medium");
    setSelectedStaffId(updated.assignedTo?._id || "");
    const nextAllowed = ALLOWED_TRANSITIONS[updated.status?.toLowerCase()] || [];
    setSelectedNextStatus(nextAllowed[0] || "");
    setActionSuccess(message);
    setActionError(null);
    onIssueUpdated(updated, message);
    loadHistoryAndReports();
  };

  // Action 1: Verify submitted issue & assign priority
  const handleVerifyIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await verifyDepartmentIssue(token, currentIssue._id, {
        priority: priorityInput,
        notes: verifyNotes.trim() || undefined,
      });
      setVerifyNotes("");
      applyUpdatedIssue(res.issue, res.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to verify issue.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action 2: Update issue priority
  const handleUpdatePriority = async () => {
    if (!priorityInput || priorityInput === currentIssue.priority) return;
    setIsSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await updateIssuePriority(token, currentIssue._id, priorityInput);
      applyUpdatedIssue(res.issue, res.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update priority.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action 3: Assign maintenance staff
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setActionError("Please select a maintenance staff member to assign.");
      return;
    }

    setIsSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await assignIssueToStaff(token, currentIssue._id, selectedStaffId);
      applyUpdatedIssue(res.issue, res.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to assign staff.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Action 4: Transition issue status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNextStatus) return;

    setIsSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await updateDepartmentIssueStatus(
        token,
        currentIssue._id,
        selectedNextStatus,
        statusNotes
      );
      setStatusNotes("");
      applyUpdatedIssue(res.issue, res.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manager-issue-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <Card className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-border bg-surface shadow-2xl rounded-2xl p-5 sm:p-7 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                #{currentIssue._id.slice(-6).toUpperCase()}
              </span>
              <Chip color={statusMeta.color} variant="soft" size="sm">
                {statusMeta.label}
              </Chip>
              <Chip color={priorityMeta.color} variant="secondary" size="sm">
                Priority: {priorityMeta.label}
              </Chip>
              <span className="text-xs text-muted font-medium px-2 py-0.5 rounded-md bg-surface-secondary">
                {currentIssue.category}
              </span>
            </div>
            <h2
              id="manager-issue-modal-title"
              className="text-lg sm:text-2xl font-bold text-foreground"
            >
              {currentIssue.title}
            </h2>
          </div>

          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={onClose}
            aria-label="Close issue modal"
            className="cursor-pointer shrink-0 text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Feedback Alerts inside modal */}
        {actionError && (
          <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </Alert>
        )}

        {actionSuccess && (
          <Alert className="border border-success/40 bg-success/10 text-success rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </Alert>
        )}

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "details"
                ? "bg-accent text-accent-foreground shadow-xs"
                : "text-muted hover:text-foreground hover:bg-surface-secondary"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Details & Actions
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-accent text-accent-foreground shadow-xs"
                : "text-muted hover:text-foreground hover:bg-surface-secondary"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Status History
            {activityLogs.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === "history"
                    ? "bg-white/20 text-white"
                    : "bg-surface-secondary text-muted"
                }`}
              >
                {activityLogs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "reports"
                ? "bg-accent text-accent-foreground shadow-xs"
                : "text-muted hover:text-foreground hover:bg-surface-secondary"
            }`}
          >
            <Wrench className="h-3.5 w-3.5" />
            Resolution Reports
            {progressReports.length > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === "reports"
                    ? "bg-white/20 text-white"
                    : "bg-surface-secondary text-muted"
                }`}
              >
                {progressReports.length}
              </span>
            )}
          </button>
        </div>

        {/* =================================================================
            TAB 1: DETAILS & MANAGER WORKFLOW ACTIONS
            ================================================================= */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Issue Information */}
            <div className="lg:col-span-7 space-y-5">
              {/* Description */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Incident Description
                </h3>
                <p className="text-sm text-foreground leading-relaxed bg-surface-secondary/40 border border-border/60 rounded-xl p-4 whitespace-pre-line">
                  {currentIssue.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 bg-surface-secondary/30">
                  <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-muted block">
                      Location
                    </span>
                    <span className="font-medium text-foreground break-words">
                      {currentIssue.location?.address || "No street address provided"}
                    </span>
                    {currentIssue.location?.latitude != null &&
                      currentIssue.location?.longitude != null && (
                        <span className="block text-[10px] font-mono text-muted mt-0.5">
                          {currentIssue.location.latitude.toFixed(5)},{" "}
                          {currentIssue.location.longitude.toFixed(5)}
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 bg-surface-secondary/30">
                  <Building className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-muted block">
                      Department
                    </span>
                    <span className="font-medium text-foreground">
                      {currentIssue.department?.name || "Assigned Department"}
                      {currentIssue.department?.code ? ` (${currentIssue.department.code})` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 bg-surface-secondary/30">
                  <Calendar className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted block">
                      Reported On
                    </span>
                    <span className="font-medium text-foreground">{formattedCreatedAt}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 bg-surface-secondary/30">
                  <Clock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted block">
                      Last Updated
                    </span>
                    <span className="font-medium text-foreground">{formattedUpdatedAt}</span>
                  </div>
                </div>
              </div>

              {/* Citizen Reporter & Assigned Crew Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border/70 bg-surface-secondary/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-accent" /> Reported By
                  </span>
                  {currentIssue.reportedBy ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">
                        {currentIssue.reportedBy.name}
                      </p>
                      {currentIssue.reportedBy.email && (
                        <p className="text-[11px] text-muted flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {currentIssue.reportedBy.email}
                        </p>
                      )}
                      {currentIssue.reportedBy.phone && (
                        <p className="text-[11px] text-muted flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" /> {currentIssue.reportedBy.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">Citizen account</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-border/70 bg-surface-secondary/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-accent" /> Assigned Crew
                  </span>
                  {currentIssue.assignedTo ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">
                        {currentIssue.assignedTo.name}
                      </p>
                      {currentIssue.assignedTo.email && (
                        <p className="text-[11px] text-muted flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 shrink-0" /> {currentIssue.assignedTo.email}
                        </p>
                      )}
                      {currentIssue.assignedTo.phone && (
                        <p className="text-[11px] text-muted flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" /> {currentIssue.assignedTo.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-warning font-medium">Unassigned — needs crew dispatch</p>
                  )}
                </div>
              </div>

              {/* Evidence Photos */}
              {currentIssue.images && currentIssue.images.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" /> Citizen Photos ({currentIssue.images.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {currentIssue.images.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPreviewImage(imgUrl)}
                        className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-surface-secondary cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`Issue evidence ${idx + 1}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Manager Operations Panel */}
            <div className="lg:col-span-5 space-y-4">
              {/* 1. Verify Submitted Issue (when status === 'submitted') */}
              {currentIssue.status === "submitted" && (
                <form
                  onSubmit={handleVerifyIssue}
                  className="p-4 rounded-2xl border border-warning/40 bg-warning/5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-warning" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Verify Submitted Issue
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Confirm incident validity, set triage priority, and move status to{" "}
                    <span className="font-semibold text-foreground">Under Review</span>.
                  </p>

                  <div className="space-y-1">
                    <label
                      htmlFor="verify-priority"
                      className="text-[11px] font-semibold text-foreground block"
                    >
                      Assign Priority
                    </label>
                    <select
                      id="verify-priority"
                      value={priorityInput}
                      onChange={(e) => setPriorityInput(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {PRIORITY_CHOICES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="verify-notes"
                      className="text-[11px] font-semibold text-foreground block"
                    >
                      Verification Notes (Optional)
                    </label>
                    <textarea
                      id="verify-notes"
                      rows={2}
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="Add triage or inspection notes..."
                      className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isDisabled={isSubmittingAction}
                    className="w-full cursor-pointer font-semibold gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {isSubmittingAction ? "Verifying..." : "Verify & Set Priority"}
                  </Button>
                </form>
              )}

              {/* 2. Update Priority (when already past 'submitted') */}
              {currentIssue.status !== "submitted" && (
                <div className="p-4 rounded-2xl border border-border bg-surface-secondary/30 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Adjust Issue Priority
                  </h4>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Issue Priority"
                      value={priorityInput}
                      onChange={(e) => setPriorityInput(e.target.value)}
                      className="flex-1 h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {PRIORITY_CHOICES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      isDisabled={
                        isSubmittingAction || priorityInput === currentIssue.priority
                      }
                      onPress={handleUpdatePriority}
                      className="cursor-pointer text-xs font-semibold shrink-0"
                    >
                      Save Priority
                    </Button>
                  </div>
                </div>
              )}

              {/* 3. Assign Maintenance Staff */}
              <form
                onSubmit={handleAssignStaff}
                className="p-4 rounded-2xl border border-border bg-surface-secondary/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-accent" />
                    {currentIssue.assignedTo ? "Reassign Crew Member" : "Assign Maintenance Staff"}
                  </h4>
                </div>

                {staffList.length === 0 ? (
                  <p className="text-xs text-muted bg-surface p-3 rounded-xl border border-dashed border-border">
                    No active maintenance staff available in your department.
                  </p>
                ) : (
                  <>
                    <select
                      aria-label="Select maintenance staff member"
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">-- Select Maintenance Staff --</option>
                      {staffList.map((item) => (
                        <option key={item.staff._id} value={item.staff._id}>
                          {item.staff.name} ({item.activeWorkload} active{" "}
                          {item.activeWorkload === 1 ? "task" : "tasks"})
                        </option>
                      ))}
                    </select>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isDisabled={
                        isSubmittingAction ||
                        !selectedStaffId ||
                        selectedStaffId === currentIssue.assignedTo?._id
                      }
                      className="w-full cursor-pointer font-semibold gap-1.5"
                    >
                      <UserCheck className="h-4 w-4" />
                      {isSubmittingAction
                        ? "Assigning..."
                        : currentIssue.assignedTo
                          ? "Reassign Staff"
                          : "Assign to Staff"}
                    </Button>
                  </>
                )}
              </form>

              {/* 4. Status Transition Panel */}
              {allowedNextStatuses.length > 0 && (
                <form
                  onSubmit={handleUpdateStatus}
                  className="p-4 rounded-2xl border border-border bg-surface-secondary/30 space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Update Workflow Status
                  </h4>

                  <div className="space-y-1">
                    <label
                      htmlFor="next-status-select"
                      className="text-[11px] font-semibold text-foreground block"
                    >
                      Transition To
                    </label>
                    <select
                      id="next-status-select"
                      value={selectedNextStatus}
                      onChange={(e) => setSelectedNextStatus(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {allowedNextStatuses.map((statusKey) => (
                        <option key={statusKey} value={statusKey}>
                          {getStatusMeta(statusKey).label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="status-notes-input"
                      className="text-[11px] font-semibold text-foreground block"
                    >
                      Status Notes (Optional)
                    </label>
                    <textarea
                      id="status-notes-input"
                      rows={2}
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Explain status transition or closure..."
                      className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    isDisabled={isSubmittingAction || !selectedNextStatus}
                    className="w-full cursor-pointer font-semibold"
                  >
                    {isSubmittingAction ? "Updating Status..." : "Apply Status Update"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 2: STATUS & ACTIVITY HISTORY
            ================================================================= */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Audit Trail & Status History
                </h3>
                <p className="text-xs text-muted">
                  Chronological log of all verification, assignment, and resolution events
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onPress={loadHistoryAndReports}
                isDisabled={isHistoryLoading}
                className="cursor-pointer text-xs gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isHistoryLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {isHistoryLoading ? (
              <div className="p-10 text-center space-y-2 border border-border rounded-2xl bg-surface-secondary/20">
                <span className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs text-muted">Loading activity history...</p>
              </div>
            ) : historyError ? (
              <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{historyError}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={loadHistoryAndReports}
                  className="cursor-pointer text-xs"
                >
                  Retry
                </Button>
              </Alert>
            ) : activityLogs.length === 0 ? (
              <div className="p-10 text-center space-y-2 border border-dashed border-border rounded-2xl">
                <History className="h-8 w-8 text-muted mx-auto" />
                <p className="text-sm font-semibold text-foreground">No Activity Recorded</p>
                <p className="text-xs text-muted">
                  Status updates and verification actions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => {
                  const prevMeta = log.previousStatus ? getStatusMeta(log.previousStatus) : null;
                  const newMeta = log.newStatus ? getStatusMeta(log.newStatus) : null;
                  const logDate = new Date(log.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={log._id}
                      className="p-4 rounded-xl border border-border bg-surface-secondary/20 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {getActionLabel(log.action)}
                          </span>
                          {prevMeta && newMeta && log.previousStatus !== log.newStatus && (
                            <div className="flex items-center gap-1">
                              <Chip color={prevMeta.color} variant="soft" size="sm">
                                {prevMeta.label}
                              </Chip>
                              <ArrowRight className="h-3 w-3 text-muted" />
                              <Chip color={newMeta.color} variant="soft" size="sm">
                                {newMeta.label}
                              </Chip>
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-muted">{logDate}</span>
                      </div>

                      <p className="text-xs text-foreground/90">{log.description}</p>

                      {log.performedBy && (
                        <div className="text-[11px] text-muted flex items-center gap-1.5 pt-1">
                          <User className="h-3 w-3" />
                          <span>{log.performedBy.name}</span>
                          <span>•</span>
                          <span>{getRoleLabel(log.performedBy.role)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 3: RESOLUTION & PROGRESS REPORTS
            ================================================================= */}
        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Field Progress & Resolution Reports
                </h3>
                <p className="text-xs text-muted">
                  Work completion notes and repair verification photos submitted by maintenance staff
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onPress={loadHistoryAndReports}
                isDisabled={isHistoryLoading}
                className="cursor-pointer text-xs gap-1"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isHistoryLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {isHistoryLoading ? (
              <div className="p-10 text-center space-y-2 border border-border rounded-2xl bg-surface-secondary/20">
                <span className="h-5 w-5 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs text-muted">Loading resolution reports...</p>
              </div>
            ) : progressReports.length === 0 ? (
              <div className="p-10 text-center space-y-2 border border-dashed border-border rounded-2xl">
                <Wrench className="h-8 w-8 text-muted mx-auto" />
                <p className="text-sm font-semibold text-foreground">
                  No Progress Reports Submitted Yet
                </p>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Assigned maintenance staff submit work completion notes and field photographs
                  here before marking an issue resolved.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {progressReports.map((report) => {
                  const reportDate = new Date(report.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={report._id}
                      className="p-4 rounded-xl border border-border bg-surface-secondary/20 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-[11px]">
                            {report.staff?.name?.charAt(0).toUpperCase() || "S"}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              {report.staff?.name || "Maintenance Staff"}
                            </span>
                            {report.staff?.phone && (
                              <span className="text-[10px] text-muted">{report.staff.phone}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[11px] text-muted">{reportDate}</span>
                      </div>

                      <p className="text-xs text-foreground leading-relaxed bg-surface p-3 rounded-lg border border-border/60">
                        {report.note}
                      </p>

                      {report.images && report.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {report.images.map((imgUrl, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImage(imgUrl)}
                              className="group aspect-video overflow-hidden rounded-lg border border-border cursor-pointer"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imgUrl}
                                alt={`Completion report photo ${idx + 1}`}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onPress={onClose} className="cursor-pointer">
            Close
          </Button>
        </div>
      </Card>

      {/* Lightbox Image Preview */}
      {previewImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="Full size preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain"
            />
            <Button
              variant="secondary"
              isIconOnly
              size="sm"
              onPress={() => setPreviewImage(null)}
              aria-label="Close preview"
              className="absolute top-3 right-3 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
