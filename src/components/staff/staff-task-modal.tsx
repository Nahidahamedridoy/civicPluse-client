"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Alert, Button, Chip } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Play,
  Upload,
  User,
  Wrench,
  X,
} from "lucide-react";
import {
  StaffActivityItem,
  StaffIssue,
  StaffProgressReport,
  fetchStaffIssueActivity,
  fetchStaffProgressReports,
  getStaffPriorityMeta,
  getStaffStatusMeta,
  submitStaffProgressReport,
  updateStaffTaskStatus,
} from "@/lib/staff-api";

interface StaffTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: StaffIssue | null;
  token: string;
  onSuccess: (updatedTask: StaffIssue, message: string) => void;
}

export function StaffTaskModal({
  isOpen,
  onClose,
  task,
  token,
  onSuccess,
}: StaffTaskModalProps) {
  if (!isOpen || !task) return null;

  return (
    <StaffTaskModalContent
      task={task}
      token={token}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function StaffTaskModalContent({
  task,
  token,
  onClose,
  onSuccess,
}: {
  task: StaffIssue;
  token: string;
  onClose: () => void;
  onSuccess: (updatedTask: StaffIssue, message: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"details" | "progress" | "activity">("details");

  // Activity & Reports states
  const [activityLogs, setActivityLogs] = useState<StaffActivityItem[]>([]);
  const [progressReports, setProgressReports] = useState<StaffProgressReport[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);

  // Status transition state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Progress Report form state
  const [reportNote, setReportNote] = useState("");
  const [reportImageUrl, setReportImageUrl] = useState("");
  const [reportImages, setReportImages] = useState<string[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Lightbox for evidence images
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchStaffIssueActivity(token, task._id),
      fetchStaffProgressReports(token, task._id),
    ])
      .then(([acts, reps]) => {
        if (!active) return;
        setActivityLogs(acts);
        setProgressReports(reps);
      })
      .finally(() => {
        if (active) setIsLoadingDetails(false);
      });

    return () => {
      active = false;
    };
  }, [token, task._id]);

  const priorityMeta = getStaffPriorityMeta(task.priority);
  const statusMeta = getStaffStatusMeta(task.status);

  // Handle Starting Task (Assigned -> In Progress)
  const handleStartTask = async () => {
    setIsUpdatingStatus(true);
    setFeedback(null);

    try {
      const res = await updateStaffTaskStatus(
        token,
        task._id,
        "in_progress",
        "Maintenance technician has started work on this assignment."
      );
      setFeedback({ type: "success", message: res.message });
      onSuccess(res.issue, res.message);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update status to In Progress.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle Submitting Progress Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportNote.trim() || reportNote.trim().length < 5) {
      setFeedback({
        type: "error",
        message: "Report note must be at least 5 characters long.",
      });
      return;
    }

    setIsSubmittingReport(true);
    setFeedback(null);

    try {
      const res = await submitStaffProgressReport(token, task._id, {
        note: reportNote.trim(),
        images: reportImages,
      });

      setFeedback({
        type: "success",
        message: "Work progress report submitted successfully.",
      });
      setProgressReports((prev) => [res.report, ...prev]);
      setReportNote("");
      setReportImages([]);
      setReportImageUrl("");

      // Reload activity logs
      const updatedActs = await fetchStaffIssueActivity(token, task._id);
      setActivityLogs(updatedActs);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to submit progress report.",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Handle Resolving Task (In Progress -> Resolved, requires report submitted)
  const handleResolveTask = async () => {
    if (progressReports.length === 0) {
      setFeedback({
        type: "error",
        message:
          "You must submit at least one work completion report before marking this task as resolved.",
      });
      setActiveTab("progress");
      return;
    }

    setIsUpdatingStatus(true);
    setFeedback(null);

    try {
      const res = await updateStaffTaskStatus(
        token,
        task._id,
        "resolved",
        "Maintenance work completed and verified by technician."
      );
      setFeedback({ type: "success", message: res.message });
      onSuccess(res.issue, res.message);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to mark task as resolved.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Helper for adding image URLs to report
  const handleAddImage = () => {
    if (reportImageUrl.trim()) {
      setReportImages((prev) => [...prev, reportImageUrl.trim()]);
      setReportImageUrl("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface text-foreground shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-border flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-accent/15 text-accent">
                #{task._id.slice(-6).toUpperCase()}
              </span>
              <Chip color={priorityMeta.color} variant="secondary" size="sm" className="text-[10px]">
                {priorityMeta.label}
              </Chip>
              <Chip color={statusMeta.color} variant="soft" size="sm" className="text-[10px]">
                {statusMeta.label}
              </Chip>
              {task.department && (
                <span className="text-[11px] font-semibold text-muted flex items-center gap-1">
                  <Building className="h-3 w-3" /> {task.department.name}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-foreground leading-snug">{task.title}</h3>
          </div>

          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={onClose}
            aria-label="Close modal"
            className="cursor-pointer text-muted hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 flex items-center gap-2 border-b border-border bg-surface-secondary/20 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "details"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" /> Task Overview & Actions
          </button>

          <button
            onClick={() => setActiveTab("progress")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "progress"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <FileCheck2 className="h-4 w-4" /> Progress Reports ({progressReports.length})
          </button>

          <button
            onClick={() => setActiveTab("activity")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "activity"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Activity className="h-4 w-4" /> Timeline Activity ({activityLogs.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Feedback banner */}
          {feedback && (
            <Alert
              className={`rounded-xl p-3.5 flex items-start gap-2.5 text-xs ${
                feedback.type === "success"
                  ? "border border-success/40 bg-success/10 text-success"
                  : "border border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </Alert>
          )}

          {/* TAB 1: DETAILS & ACTIONS */}
          {activeTab === "details" && (
            <div className="space-y-5 text-xs">
              {/* Quick Action Banner for Maintenance Workflow */}
              <div className="p-4 rounded-xl border border-border bg-gradient-to-r from-surface to-accent/5 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1">
                  <Wrench className="h-3 w-3 text-accent" /> Technician Task Controls
                </span>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-foreground text-sm block">
                      Current Task Status: <span className="capitalize text-accent">{task.status.replace("_", " ")}</span>
                    </span>
                    <p className="text-[11px] text-muted mt-0.5">
                      {task.status === "assigned"
                        ? "Task is currently assigned to you. Click 'Start Maintenance Work' to move to In Progress."
                        : task.status === "in_progress"
                        ? "Work is underway. Submit a progress report to complete and resolve this issue."
                        : "This task has been completed and submitted for department verification."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === "assigned" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={handleStartTask}
                        isDisabled={isUpdatingStatus}
                        className="cursor-pointer text-xs font-semibold gap-1.5 shadow-xs"
                      >
                        {isUpdatingStatus ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting...
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" /> Start Maintenance Work
                          </>
                        )}
                      </Button>
                    )}

                    {task.status === "in_progress" && (
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={handleResolveTask}
                        isDisabled={isUpdatingStatus}
                        className="cursor-pointer text-xs font-semibold gap-1.5 shadow-xs bg-success text-white"
                      >
                        {isUpdatingStatus ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Resolved
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted uppercase">Issue Description</span>
                <p className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 text-foreground leading-relaxed">
                  {task.description}
                </p>
              </div>

              {/* Location & Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-accent" /> Location Address
                  </span>
                  <div className="font-semibold text-foreground">
                    {task.location?.address || "Street address not specified"}
                  </div>
                  {task.location?.latitude && task.location?.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${task.location.latitude},${task.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-accent hover:underline flex items-center gap-1 mt-1 font-mono"
                    >
                      <ExternalLink className="h-3 w-3" /> Open in Google Maps
                    </a>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <User className="h-3 w-3 text-accent" /> Reported By
                  </span>
                  <div className="font-semibold text-foreground">
                    {task.reportedBy?.name || "Anonymous Citizen"}
                  </div>
                  {task.reportedBy?.phone && (
                    <span className="text-[11px] text-muted block font-mono">
                      Phone: {task.reportedBy.phone}
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-accent" /> Date Reported
                  </span>
                  <div className="font-semibold text-foreground">
                    {new Date(task.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3 text-accent" /> Last Update
                  </span>
                  <div className="font-semibold text-foreground">
                    {new Date(task.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              {/* Evidence Images */}
              {task.images && task.images.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-muted uppercase flex items-center gap-1">
                    <ImageIcon className="h-3 w-3 text-accent" /> Submitted Evidence Photographs
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {task.images.map((img, i) => (
                      <div
                        key={i}
                        onClick={() => setLightboxImage(img)}
                        className="relative h-28 rounded-xl border border-border overflow-hidden group cursor-pointer bg-surface-secondary/40"
                      >
                        <Image
                          src={img}
                          alt={`Evidence photo ${i + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold">
                          Click to enlarge
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROGRESS REPORTS */}
          {activeTab === "progress" && (
            <div className="space-y-5 text-xs">
              {/* Form to submit a report */}
              <form onSubmit={handleSubmitReport} className="p-4 rounded-xl border border-border bg-surface-secondary/20 space-y-3">
                <span className="font-bold text-foreground text-xs block flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-accent" /> Log Work Progress / Completion Report
                </span>

                <div className="space-y-1.5">
                  <textarea
                    rows={3}
                    required
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="Describe specific maintenance actions taken, replacement parts installed, or work status..."
                    className="w-full px-3 py-2 rounded-xl border border-border bg-surface text-foreground text-xs resize-none focus:outline-hidden focus:border-accent"
                  />
                </div>

                {/* Add Image URL */}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={reportImageUrl}
                    onChange={(e) => setReportImageUrl(e.target.value)}
                    placeholder="Optional image URL (e.g. https://... completed repair photo)"
                    className="flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-foreground text-xs focus:outline-hidden focus:border-accent"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onPress={handleAddImage}
                    isDisabled={!reportImageUrl.trim()}
                    className="cursor-pointer text-xs shrink-0"
                  >
                    Add Image
                  </Button>
                </div>

                {/* Image thumbnails queue */}
                {reportImages.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {reportImages.map((img, idx) => (
                      <div key={idx} className="relative h-14 w-14 rounded-lg border border-border overflow-hidden group">
                        <Image src={img} alt="Report queue" fill className="object-cover" />
                        <button
                          type="button"
                          onClick={() => setReportImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0 right-0 p-0.5 bg-black/70 text-white rounded-bl-sm opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    isDisabled={isSubmittingReport || !reportNote.trim()}
                    className="cursor-pointer text-xs font-semibold gap-1.5"
                  >
                    {isSubmittingReport ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Submit Report
                      </>
                    )}
                  </Button>
                </div>
              </form>

              {/* List of existing reports */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-muted uppercase">Past Progress Submissions</span>
                {progressReports.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted">
                    No progress reports recorded yet for this task.
                  </div>
                ) : (
                  progressReports.map((rep) => (
                    <div key={rep._id} className="p-3.5 rounded-xl border border-border bg-surface space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground">
                          {rep.staff?.name || "Technician"}
                        </span>
                        <span className="text-muted font-mono">
                          {new Date(rep.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-foreground leading-relaxed">{rep.note}</p>
                      {rep.images && rep.images.length > 0 && (
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          {rep.images.map((im, idx) => (
                            <div
                              key={idx}
                              onClick={() => setLightboxImage(im)}
                              className="relative h-16 w-16 rounded-lg border border-border overflow-hidden cursor-pointer"
                            >
                              <Image src={im} alt="Repair detail" fill className="object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY TIMELINE */}
          {activeTab === "activity" && (
            <div className="space-y-3 text-xs">
              <span className="text-[11px] font-bold text-muted uppercase">Audit History</span>
              {isLoadingDetails ? (
                <div className="py-8 text-center text-muted">Loading activity timeline...</div>
              ) : activityLogs.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-border text-muted">
                  No activity logs logged yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activityLogs.map((act) => (
                    <div
                      key={act._id}
                      className="p-3 rounded-xl border border-border bg-surface-secondary/20 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold text-foreground capitalize block truncate">
                          {act.action.replace("_", " ")}
                        </span>
                        <p className="text-[11px] text-muted leading-relaxed">{act.description}</p>
                      </div>
                      <span className="text-[10px] text-muted whitespace-nowrap font-mono shrink-0">
                        {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end">
          <Button variant="outline" size="sm" onPress={onClose} className="cursor-pointer text-xs">
            Close
          </Button>
        </div>
      </div>

      {/* Lightbox Preview */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] w-full h-[65vh] rounded-xl overflow-hidden">
            <Image src={lightboxImage} alt="Enlarged preview" fill className="object-contain" />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/70 text-white rounded-full hover:bg-black"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
