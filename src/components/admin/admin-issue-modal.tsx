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
  AdminIssue,
  DepartmentOption,
  IssueActivityLog,
  IssueProgressReport,
  MaintenanceStaffOption,
  assignIssueByAdmin,
  fetchIssueActivity,
  fetchIssueProgressReports,
  fetchMaintenanceStaff,
  getPriorityMeta,
  getStatusMeta,
  updateIssueDetailsByAdmin,
  updateIssueStatusByAdmin,
  verifyIssueByAdmin,
} from "@/lib/admin-api";
import { getRoleLabel } from "@/lib/auth";

interface AdminIssueModalProps {
  issue: AdminIssue | null;
  token: string;
  departments: DepartmentOption[];
  initialFocusAction?: "overview" | "verify" | "assign" | "status" | "history";
  onClose: () => void;
  onIssueUpdated: (updatedIssue: AdminIssue, feedbackMessage: string) => void;
}

const PRIORITY_CHOICES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const ADMIN_STATUS_CHOICES = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

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

export function AdminIssueModal({
  issue,
  token,
  departments,
  initialFocusAction = "overview",
  onClose,
  onIssueUpdated,
}: AdminIssueModalProps) {
  const [currentIssue, setCurrentIssue] = useState<AdminIssue | null>(issue);
  const [activeTab, setActiveTab] = useState<"details" | "history" | "reports">(
    initialFocusAction === "history" ? "history" : "details"
  );

  // Form states
  const [priorityInput, setPriorityInput] = useState<string>(issue?.priority || "medium");
  const [departmentInput, setDepartmentInput] = useState<string>(issue?.department?._id || "");
  const [verifyNotes, setVerifyNotes] = useState<string>("");

  const [selectedStaffId, setSelectedStaffId] = useState<string>(issue?.assignedTo?._id || "");
  const [departmentStaff, setDepartmentStaff] = useState<MaintenanceStaffOption[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(Boolean(token && issue?.department?._id));

  const [nextStatusInput, setNextStatusInput] = useState<string>(issue?.status || "under_review");
  const [statusNotes, setStatusNotes] = useState<string>("");

  // Submission & feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // History & Progress reports
  const [activityLogs, setActivityLogs] = useState<IssueActivityLog[]>([]);
  const [progressReports, setProgressReports] = useState<IssueProgressReport[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(Boolean(issue?._id));
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Image lightbox preview state
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const issueId = issue?._id;
  const currentDeptId = currentIssue?.department?._id;

  // Load staff belonging to the issue's department
  useEffect(() => {
    if (!token || !currentDeptId) return;
    let active = true;

    fetchMaintenanceStaff(token, currentDeptId)
      .then((staff) => {
        if (active) setDepartmentStaff(staff);
      })
      .catch(() => {
        if (active) setDepartmentStaff([]);
      })
      .finally(() => {
        if (active) setIsStaffLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, currentDeptId]);

  // Load activity history and progress reports
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
        err instanceof Error ? err.message : "Failed to load audit history."
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }, [issueId, token]);

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
          err instanceof Error ? err.message : "Failed to load audit history."
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

  const applyUpdated = (updated: AdminIssue, msg: string) => {
    setCurrentIssue(updated);
    setPriorityInput(updated.priority || "medium");
    setDepartmentInput(updated.department?._id || "");
    setSelectedStaffId(updated.assignedTo?._id || "");
    setNextStatusInput(updated.status);
    setActionSuccess(msg);
    setActionError(null);
    onIssueUpdated(updated, msg);
    loadHistoryAndReports();
  };

  // Action 1: Admin verifies submitted issue
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await verifyIssueByAdmin(token, currentIssue._id, {
        priority: priorityInput,
        department: departmentInput || undefined,
        notes: verifyNotes.trim() || undefined,
      });
      setVerifyNotes("");
      applyUpdated(res.issue, res.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to verify issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action 2: Admin assigns maintenance staff
  const handleAssignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setActionError("Please select a maintenance staff member to assign.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await assignIssueByAdmin(token, currentIssue._id, selectedStaffId);
      applyUpdated(res.issue, res.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to assign staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action 3: Admin reassigns department or priority
  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasPriorityChanged = priorityInput !== currentIssue.priority;
    const hasDeptChanged = departmentInput !== currentIssue.department?._id;

    if (!hasPriorityChanged && !hasDeptChanged) {
      setActionError("No changes detected in priority or department.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await updateIssueDetailsByAdmin(token, currentIssue._id, {
        priority: priorityInput,
        department: departmentInput || undefined,
      });
      applyUpdated(res.issue, res.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update issue details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action 4: Admin updates status
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nextStatusInput === currentIssue.status) {
      setActionError("Selected status is already the current status.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await updateIssueStatusByAdmin(
        token,
        currentIssue._id,
        nextStatusInput,
        statusNotes
      );
      setStatusNotes("");
      applyUpdated(res.issue, res.message);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-issue-modal-title"
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
              <Chip color="default" variant="secondary" size="sm" className="font-medium">
                {currentIssue.category}
              </Chip>
              {currentIssue.department && (
                <span className="text-xs text-muted font-medium px-2 py-0.5 rounded-md bg-surface-secondary">
                  {currentIssue.department.name} ({currentIssue.department.code})
                </span>
              )}
            </div>
            <h2
              id="admin-issue-modal-title"
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
            aria-label="Close modal"
            className="cursor-pointer shrink-0 text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Feedback Alerts */}
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

        {/* Tabs */}
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
            Details & Admin Controls
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
            Audit Trail
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
            Field Reports
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
            TAB 1: DETAILS & ADMIN ACTIONS
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
                      {currentIssue.department?.name || "Unassigned"}
                      {currentIssue.department?.code ? ` (${currentIssue.department.code})` : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border/70 bg-surface-secondary/30">
                  <Calendar className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-muted block">
                      Submission Date
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

              {/* Reporter & Assigned Crew */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border/70 bg-surface-secondary/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-accent" /> Citizen Reporter
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
                    <p className="text-muted">Registered Citizen</p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-border/70 bg-surface-secondary/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-accent" /> Assigned Maintenance Crew
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
                    <p className="text-warning font-medium">Unassigned</p>
                  )}
                </div>
              </div>

              {/* Citizen Photographs */}
              {currentIssue.images && currentIssue.images.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5" /> Citizen Evidence Photos ({currentIssue.images.length})
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
                          alt={`Evidence ${idx + 1}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Admin Management Controls */}
            <div className="lg:col-span-5 space-y-4">
              {/* 1. Verify Submitted Issue */}
              {currentIssue.status === "submitted" && (
                <form
                  onSubmit={handleVerify}
                  className="p-4 rounded-2xl border border-warning/40 bg-warning/5 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-warning" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Verify & Triage Submitted Issue
                    </h4>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Verify incident legitimacy, assign initial priority, confirm department, and transition
                    to <span className="font-semibold text-foreground">Under Review</span>.
                  </p>

                  <div className="space-y-1">
                    <label htmlFor="verify-dept" className="text-[11px] font-semibold text-foreground block">
                      Target Department
                    </label>
                    <select
                      id="verify-dept"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="verify-prio" className="text-[11px] font-semibold text-foreground block">
                      Triage Priority
                    </label>
                    <select
                      id="verify-prio"
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
                    <label htmlFor="verify-notes-input" className="text-[11px] font-semibold text-foreground block">
                      Verification Notes (Optional)
                    </label>
                    <textarea
                      id="verify-notes-input"
                      rows={2}
                      value={verifyNotes}
                      onChange={(e) => setVerifyNotes(e.target.value)}
                      placeholder="Add triage comments or notes..."
                      className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isDisabled={isSubmitting}
                    className="w-full cursor-pointer font-semibold gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {isSubmitting ? "Verifying..." : "Verify Issue"}
                  </Button>
                </form>
              )}

              {/* 2. Assign Maintenance Staff */}
              <form
                onSubmit={handleAssignStaff}
                className="p-4 rounded-2xl border border-border bg-surface-secondary/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-accent" />
                    {currentIssue.assignedTo ? "Reassign Maintenance Staff" : "Assign Maintenance Staff"}
                  </h4>
                  {currentIssue.department && (
                    <span className="text-[10px] text-muted font-mono uppercase">
                      {currentIssue.department.code}
                    </span>
                  )}
                </div>

                {isStaffLoading ? (
                  <p className="text-xs text-muted">Loading department personnel...</p>
                ) : departmentStaff.length === 0 ? (
                  <p className="text-xs text-muted bg-surface p-3 rounded-xl border border-dashed border-border">
                    No active maintenance staff registered in this issue&apos;s department (
                    {currentIssue.department?.name || "Unassigned"}).
                  </p>
                ) : (
                  <>
                    <select
                      aria-label="Select maintenance staff member"
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="">-- Select Crew Member --</option>
                      {departmentStaff.map((staff) => (
                        <option key={staff._id} value={staff._id}>
                          {staff.name} ({staff.email})
                        </option>
                      ))}
                    </select>

                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isDisabled={
                        isSubmitting ||
                        !selectedStaffId ||
                        selectedStaffId === currentIssue.assignedTo?._id
                      }
                      className="w-full cursor-pointer font-semibold gap-1.5"
                    >
                      <UserCheck className="h-4 w-4" />
                      {isSubmitting
                        ? "Assigning..."
                        : currentIssue.assignedTo
                        ? "Reassign Staff"
                        : "Assign to Staff"}
                    </Button>
                  </>
                )}
              </form>

              {/* 3. Reassign Department or Priority */}
              <form
                onSubmit={handleUpdateDetails}
                className="p-4 rounded-2xl border border-border bg-surface-secondary/30 space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-accent" />
                  Department & Priority Configuration
                </h4>

                <div className="space-y-1">
                  <label htmlFor="edit-dept" className="text-[11px] font-semibold text-foreground block">
                    Assigned Department
                  </label>
                  <select
                    id="edit-dept"
                    value={departmentInput}
                    onChange={(e) => setDepartmentInput(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="edit-prio" className="text-[11px] font-semibold text-foreground block">
                    Priority Level
                  </label>
                  <select
                    id="edit-prio"
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

                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  isDisabled={
                    isSubmitting ||
                    (priorityInput === currentIssue.priority &&
                      departmentInput === currentIssue.department?._id)
                  }
                  className="w-full cursor-pointer text-xs font-semibold"
                >
                  Save Department / Priority
                </Button>
              </form>

              {/* 4. Update Status */}
              <form
                onSubmit={handleUpdateStatus}
                className="p-4 rounded-2xl border border-border bg-surface-secondary/30 space-y-3"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                  Workflow Lifecycle Status
                </h4>

                <div className="space-y-1">
                  <label htmlFor="admin-status-select" className="text-[11px] font-semibold text-foreground block">
                    Status
                  </label>
                  <select
                    id="admin-status-select"
                    value={nextStatusInput}
                    onChange={(e) => setNextStatusInput(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {ADMIN_STATUS_CHOICES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="admin-status-notes" className="text-[11px] font-semibold text-foreground block">
                    Status Notes (Optional)
                  </label>
                  <textarea
                    id="admin-status-notes"
                    rows={2}
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Enter reason for status override or closure..."
                    className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isDisabled={isSubmitting || nextStatusInput === currentIssue.status}
                  className="w-full cursor-pointer font-semibold"
                >
                  {isSubmitting ? "Updating..." : "Update Status"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* =================================================================
            TAB 2: STATUS & ACTIVITY AUDIT TRAIL
            ================================================================= */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Complete Audit Trail
                </h3>
                <p className="text-xs text-muted">
                  Detailed timeline of citizen reports, verification, staff assignments, and status updates
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
                <p className="text-xs text-muted">Loading audit timeline...</p>
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
                <p className="text-sm font-semibold text-foreground">No Audit Records Logged</p>
                <p className="text-xs text-muted">
                  Events will appear here as administrative actions occur.
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
                  Maintenance Completion Reports
                </h3>
                <p className="text-xs text-muted">
                  Photographs and progress notes filed by maintenance crew upon field execution
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
                <p className="text-xs text-muted">Loading progress reports...</p>
              </div>
            ) : progressReports.length === 0 ? (
              <div className="p-10 text-center space-y-2 border border-dashed border-border rounded-2xl">
                <Wrench className="h-8 w-8 text-muted mx-auto" />
                <p className="text-sm font-semibold text-foreground">
                  No Completion Reports Filed Yet
                </p>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Assigned maintenance personnel submit completion notes and field photos before resolution.
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
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onPress={onClose} className="cursor-pointer text-xs">
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
