"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Alert } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Construction,
  Droplets,
  ExternalLink,
  FileSpreadsheet,
  Footprints,
  History,
  LayoutDashboard,
  Lightbulb,
  Lock,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  PlusCircle,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  CitizenIssue,
  IssueActivityLog,
  IssueComment,
  IssueFeedback,
  fetchIssueById,
  fetchIssueActivity,
  fetchIssueComments,
  postIssueComment,
  fetchIssueFeedback,
  submitIssueFeedback,
  getStatusMeta,
  getPriorityMeta,
} from "@/lib/citizen-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";

function CategoryBadgeIcon({ category, className }: { category?: string; className?: string }) {
  switch (category?.toLowerCase()) {
    case "road damage":
      return <Construction className={className} />;
    case "streetlight":
      return <Lightbulb className={className} />;
    case "drainage":
      return <Droplets className={className} />;
    case "footpath":
      return <Footprints className={className} />;
    case "waste management":
      return <Trash2 className={className} />;
    case "public infrastructure":
    default:
      return <Building className={className} />;
  }
}

// Visual status workflow definition matching backend lifecycle
const WORKFLOW_STEPS = [
  { key: "submitted", label: "Submitted", desc: "Report filed by citizen" },
  { key: "under_review", label: "Under Review", desc: "Intake assessment & triage" },
  { key: "assigned", label: "Dispatched", desc: "Assigned to department crew" },
  { key: "in_progress", label: "In Progress", desc: "Active maintenance & repair" },
  { key: "resolved", label: "Resolved", desc: "Work reported complete" },
  { key: "closed", label: "Closed", desc: "Verified and finalized" },
] as const;

function getStepIndex(status?: string): number {
  switch (status?.toLowerCase()) {
    case "submitted":
      return 0;
    case "under_review":
      return 1;
    case "assigned":
      return 2;
    case "in_progress":
      return 3;
    case "resolved":
      return 4;
    case "closed":
      return 5;
    default:
      return 0;
  }
}

function getRoleLabel(role?: string): string {
  switch (role?.toLowerCase()) {
    case "citizen":
      return "Citizen";
    case "admin":
      return "Administrator";
    case "department_manager":
      return "Dept Manager";
    case "maintenance_staff":
      return "Maintenance Staff";
    default:
      return role || "User";
  }
}

function getRatingDescription(rating: number): string {
  switch (rating) {
    case 5:
      return "5 - Excellent resolution & speed";
    case 4:
      return "4 - Very good repair quality";
    case 3:
      return "3 - Satisfactory service";
    case 2:
      return "2 - Below expectations";
    case 1:
      return "1 - Poor resolution or delay";
    default:
      return "Select a star rating";
  }
}

export default function IssueDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Issue state
  const [issue, setIssue] = useState<CitizenIssue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<IssueActivityLog[]>([]);

  // Comments state
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Citizen Feedback state
  const [feedback, setFeedback] = useState<IssueFeedback | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState<string | null>(null);

  // Sub-navigation tab: "comments" | "activity" | "feedback"
  const [activeTab, setActiveTab] = useState<"comments" | "activity" | "feedback">("comments");

  // Route protection
  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (role && role !== "citizen") {
      router.replace(getDashboardPath(role));
    }
  }, [isMounted, isAuthenticated, role, router]);

  // Load report data, activity logs, comments, and feedback concurrently
  useEffect(() => {
    if (!token || !isAuthenticated || role !== "citizen" || !id) return;

    let isSubscribed = true;
    const currentToken = token;

    async function loadData() {
      try {
        const [issueData, activityData, commentsData, feedbackData] = await Promise.all([
          fetchIssueById(currentToken, id),
          fetchIssueActivity(currentToken, id).catch(() => []),
          fetchIssueComments(currentToken, id).catch(() => []),
          fetchIssueFeedback(currentToken, id).catch(() => null),
        ]);

        if (!isSubscribed) return;

        setIssue(issueData);
        if (issueData.images && issueData.images.length > 0) {
          setActiveImage(issueData.images[0]);
        }
        setActivityLogs(activityData);
        setComments(commentsData);
        setFeedback(feedbackData);
        setErrorMessage(null);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Unable to load report details. Please try again.");
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [token, isAuthenticated, role, id]);

  // Manual retry handler
  const handleManualRetry = useCallback(async () => {
    if (!token || !id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [issueData, activityData, commentsData, feedbackData] = await Promise.all([
        fetchIssueById(token, id),
        fetchIssueActivity(token, id).catch(() => []),
        fetchIssueComments(token, id).catch(() => []),
        fetchIssueFeedback(token, id).catch(() => null),
      ]);

      setIssue(issueData);
      if (issueData.images && issueData.images.length > 0) {
        setActiveImage(issueData.images[0]);
      }
      setActivityLogs(activityData);
      setComments(commentsData);
      setFeedback(feedbackData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to load report details. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  // Comment submission handler
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || !newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const created = await postIssueComment(token, id, newCommentText.trim());
      setComments((prev) => [...prev, created]);
      setNewCommentText("");

      // Refresh activity log quietly in background
      fetchIssueActivity(token, id)
        .then((logs) => setActivityLogs(logs))
        .catch(() => {});
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCommentError(err.message);
      } else {
        setCommentError("Failed to add comment. Please try again.");
      }
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Feedback submission handler
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id || isSubmittingFeedback) return;

    if (feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackError("Please choose a rating between 1 and 5 stars.");
      return;
    }

    setIsSubmittingFeedback(true);
    setFeedbackError(null);
    setFeedbackSuccessMsg(null);

    try {
      const created = await submitIssueFeedback(
        token,
        id,
        feedbackRating,
        feedbackComment.trim()
      );
      setFeedback(created);
      setFeedbackSuccessMsg("Thank you! Your feedback has been recorded.");

      // Refresh activity log quietly in background
      fetchIssueActivity(token, id)
        .then((logs) => setActivityLogs(logs))
        .catch(() => {});
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedbackError(err.message);
      } else {
        setFeedbackError("Failed to submit feedback. Please try again.");
      }
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (!isMounted || !isAuthenticated || role !== "citizen") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="space-y-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent mx-auto animate-pulse">
            <Activity className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-muted">
            Verifying citizen credentials...
          </p>
        </div>
      </div>
    );
  }

  const statusMeta = issue ? getStatusMeta(issue.status) : null;
  const priorityMeta = issue ? getPriorityMeta(issue.priority) : null;
  const currentStepIdx = issue ? getStepIndex(issue.status) : 0;
  const isFeedbackEligible = issue && ["resolved", "closed"].includes(issue.status.toLowerCase());

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row transition-colors">
      {/* Mobile Drawer Backdrop */}
      {mobileSidebarOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close mobile sidebar backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setMobileSidebarOpen(false);
          }}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden cursor-pointer"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6 p-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-xs group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground">
                  Civic<span className="text-accent">Pulse</span>
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted -mt-0.5">
                  Citizen Portal
                </span>
              </div>
            </Link>

            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={() => setMobileSidebarOpen(false)}
              aria-label="Close navigation"
              className="md:hidden cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-px bg-border/80" />

          <nav className="space-y-1">
            <Link
              href="/citizen/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Overview</span>
            </Link>

            <Link
              href="/citizen/my-reports"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>My Reports</span>
            </Link>

            <Link
              href="/citizen/report-issue"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Report an Issue</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-surface-secondary/50">
            <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-xs">
              {user?.name?.slice(0, 2).toUpperCase() || "CZ"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-foreground truncate">
                {user?.name || "Citizen"}
              </span>
              <span className="text-[10px] text-muted truncate">
                {user?.email || "citizen@civicpulse.org"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onPress={logout}
            className="w-full justify-start text-xs font-medium text-danger hover:bg-danger/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-surface/85 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              isIconOnly
              size="sm"
              onPress={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Link href="/citizen/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/citizen/my-reports" className="hover:text-foreground transition-colors">
                My Reports
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground font-mono">
                #{id.slice(-6).toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onPress={handleManualRetry}
              isDisabled={isLoading}
              className="cursor-pointer text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Back link */}
          <Link
            href="/citizen/my-reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to My Reports Archive
          </Link>

          {/* Error Banner */}
          {errorMessage && (
            <Alert className="rounded-xl border border-danger/40 bg-danger/10 text-danger p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-xs">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div>
                  <span className="font-bold">Error: </span>
                  <span>{errorMessage}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onPress={handleManualRetry}
                className="cursor-pointer text-xs shrink-0"
              >
                Retry
              </Button>
            </Alert>
          )}

          {/* Loading Skeleton */}
          {isLoading ? (
            <Card className="border border-border bg-surface rounded-2xl p-6 sm:p-8 space-y-6 animate-pulse">
              <div className="h-8 w-1/2 rounded bg-surface-secondary/80" />
              <div className="h-4 w-1/4 rounded bg-surface-secondary/60" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 rounded-xl bg-surface-secondary/60" />
                <div className="h-20 rounded-xl bg-surface-secondary/60" />
              </div>
              <div className="h-32 rounded-xl bg-surface-secondary/60" />
            </Card>
          ) : !issue ? (
            <Card className="border border-border bg-surface rounded-2xl p-10 text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-muted mx-auto" />
              <h3 className="text-base font-bold text-foreground">Report Not Found</h3>
              <p className="text-xs text-muted">
                The requested issue may have been removed or you do not have permission to view it.
              </p>
              <Button
                variant="outline"
                size="sm"
                onPress={() => router.push("/citizen/my-reports")}
                className="cursor-pointer text-xs font-semibold"
              >
                Return to My Reports
              </Button>
            </Card>
          ) : (
            <>
              {/* =========================================================================
                  1. Issue Details Primary Card
                  ========================================================================= */}
              <Card className="border border-border bg-surface shadow-xs rounded-2xl p-6 sm:p-8 space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-border/80">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                        #{issue._id.slice(-6).toUpperCase()}
                      </span>
                      {statusMeta && (
                        <Chip color={statusMeta.color} variant="soft" size="sm">
                          {statusMeta.label}
                        </Chip>
                      )}
                      {priorityMeta && (
                        <Chip color={priorityMeta.color} variant="secondary" size="sm">
                          Priority: {priorityMeta.label}
                        </Chip>
                      )}
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                      {issue.title}
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        Reported on{" "}
                        {new Date(issue.createdAt).toLocaleString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-muted space-y-1">
                    <span className="block font-mono text-[10px]">Reference ID</span>
                    <span className="block font-mono text-[11px] select-all bg-surface-secondary/50 px-2 py-1 rounded-lg border border-border/60">
                      {issue._id}
                    </span>
                  </div>
                </div>

                {/* =====================================================================
                    2. Visual Status Workflow Timeline
                    ===================================================================== */}
                <div className="rounded-2xl border border-border bg-surface-secondary/25 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-accent" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Status Workflow Timeline
                      </h2>
                    </div>
                    <Chip color={statusMeta?.color || "default"} variant="soft" size="sm">
                      Current: {statusMeta?.label}
                    </Chip>
                  </div>

                  {/* Desktop / Tablet Timeline Track */}
                  <div className="hidden sm:block">
                    <div className="relative flex items-center justify-between">
                      {/* Connecting Line Track */}
                      <div className="absolute left-6 right-6 top-4 h-0.5 bg-border -translate-y-1/2 z-0" />
                      <div
                        className="absolute left-6 top-4 h-0.5 bg-accent -translate-y-1/2 z-0 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(0, (currentStepIdx / (WORKFLOW_STEPS.length - 1)) * 100))}%`,
                        }}
                      />

                      {WORKFLOW_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIdx;
                        const isCurrent = idx === currentStepIdx;

                        return (
                          <div
                            key={step.key}
                            className="relative z-10 flex flex-col items-center text-center space-y-2 group"
                            style={{ width: `${100 / WORKFLOW_STEPS.length}%` }}
                          >
                            <div
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                                isCompleted
                                  ? "bg-accent text-accent-foreground ring-4 ring-surface"
                                  : isCurrent
                                  ? "bg-accent text-accent-foreground ring-4 ring-accent/30 scale-110"
                                  : "bg-surface border-2 border-border text-muted ring-4 ring-surface"
                              }`}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : isCurrent ? (
                                <span className="h-2 w-2 rounded-full bg-accent-foreground animate-ping" />
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>

                            <div className="space-y-0.5 px-1">
                              <span
                                className={`block text-xs font-semibold leading-tight ${
                                  isCurrent
                                    ? "text-accent font-bold"
                                    : isCompleted
                                    ? "text-foreground"
                                    : "text-muted"
                                }`}
                              >
                                {step.label}
                              </span>
                              <span className="block text-[10px] text-muted line-clamp-1">
                                {step.desc}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile Stepper (Stacked for small screens) */}
                  <div className="sm:hidden grid grid-cols-2 gap-2">
                    {WORKFLOW_STEPS.map((step, idx) => {
                      const isCompleted = idx < currentStepIdx;
                      const isCurrent = idx === currentStepIdx;

                      return (
                        <div
                          key={step.key}
                          className={`p-2.5 rounded-xl border text-xs space-y-1 transition-all ${
                            isCurrent
                              ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                              : isCompleted
                              ? "border-border bg-surface-secondary/40"
                              : "border-border/60 bg-surface/40 opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            {isCompleted ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0" />
                            ) : isCurrent ? (
                              <div className="h-2 w-2 rounded-full bg-accent animate-ping shrink-0" />
                            ) : (
                              <span className="text-[10px] font-mono text-muted">{idx + 1}.</span>
                            )}
                            <span className={isCurrent ? "text-accent" : "text-foreground"}>
                              {step.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted line-clamp-1">{step.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Core Attributes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                      Category
                    </span>
                    <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                      <CategoryBadgeIcon category={issue.category} className="h-4 w-4 text-accent shrink-0" />
                      <span>{issue.category}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                      Assigned Department
                    </span>
                    <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                      <Building className="h-4 w-4 text-accent shrink-0" />
                      <span>{issue.department?.name || "Pending Triage"}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/30 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                      Assigned Personnel
                    </span>
                    <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                      <UserIcon className="h-4 w-4 text-accent shrink-0" />
                      <span>{issue.assignedTo?.name || "Unassigned"}</span>
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    Location & Coordinates
                  </span>
                  <div className="flex items-start gap-2 text-foreground font-medium">
                    <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div>{issue.location?.address || "No street address provided"}</div>
                      {issue.location?.latitude != null && issue.location?.longitude != null && (
                        <div className="font-mono text-[11px] text-muted flex items-center gap-3">
                          <span>
                            Lat: {issue.location.latitude}, Lng: {issue.location.longitude}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${issue.location.latitude},${issue.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline inline-flex items-center gap-1"
                          >
                            Open in Google Maps <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                    Detailed Problem Description
                  </h3>
                  <div className="p-4 rounded-xl border border-border bg-surface-secondary/20 text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {issue.description}
                  </div>
                </div>

                {/* Photo Evidence Gallery */}
                {issue.images && issue.images.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border/80">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                        Uploaded Photo Evidence ({issue.images.length})
                      </h3>
                    </div>

                    {activeImage && (
                      <div className="relative rounded-2xl overflow-hidden border border-border bg-black/5 max-h-96 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeImage}
                          alt="Featured incident photo"
                          className="max-h-96 w-auto object-contain rounded-2xl"
                        />
                      </div>
                    )}

                    {issue.images.length > 1 && (
                      <div className="flex flex-wrap gap-2.5">
                        {issue.images.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveImage(imgUrl)}
                            className={`h-16 w-16 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                              activeImage === imgUrl
                                ? "border-accent ring-2 ring-accent/40"
                                : "border-border hover:border-accent/50 opacity-80 hover:opacity-100"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgUrl}
                              alt={`Evidence thumbnail ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* =========================================================================
                  3. Interactive Tabs: Discussion, Activity History, Citizen Feedback
                  ========================================================================= */}
              <div className="space-y-4">
                {/* Tab Navigation Pill Bar */}
                <div className="flex items-center gap-2 p-1.5 rounded-2xl border border-border bg-surface shadow-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("comments")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "comments"
                        ? "bg-accent text-accent-foreground shadow-xs"
                        : "text-muted hover:text-foreground hover:bg-surface-secondary"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span>Discussion</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeTab === "comments"
                          ? "bg-accent-foreground/20 text-accent-foreground"
                          : "bg-surface-secondary text-muted"
                      }`}
                    >
                      {comments.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("activity")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "activity"
                        ? "bg-accent text-accent-foreground shadow-xs"
                        : "text-muted hover:text-foreground hover:bg-surface-secondary"
                    }`}
                  >
                    <History className="h-4 w-4 shrink-0" />
                    <span>Activity History</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeTab === "activity"
                          ? "bg-accent-foreground/20 text-accent-foreground"
                          : "bg-surface-secondary text-muted"
                      }`}
                    >
                      {activityLogs.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("feedback")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === "feedback"
                        ? "bg-accent text-accent-foreground shadow-xs"
                        : "text-muted hover:text-foreground hover:bg-surface-secondary"
                    }`}
                  >
                    <Star className="h-4 w-4 shrink-0" />
                    <span>Citizen Feedback</span>
                    {feedback ? (
                      <span className="text-[10px] text-warning font-bold">
                        ★ {feedback.rating}
                      </span>
                    ) : isFeedbackEligible ? (
                      <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    ) : null}
                  </button>
                </div>

                {/* =====================================================================
                    TAB 1: COMMENTS LIST & SUBMISSION
                    ===================================================================== */}
                {activeTab === "comments" && (
                  <Card className="border border-border bg-surface shadow-xs rounded-2xl p-6 sm:p-8 space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-border/80">
                      <div>
                        <h2 className="text-base font-bold text-foreground">
                          Issue Discussion & Inquiries
                        </h2>
                        <p className="text-xs text-muted">
                          Direct communication channel with municipal triage and field staff
                        </p>
                      </div>
                      <span className="text-xs font-mono text-muted">
                        {comments.length} message{comments.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-4">
                      {comments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                          <MessageSquare className="h-8 w-8 text-muted mx-auto" />
                          <p className="text-xs font-semibold text-foreground">
                            No comments yet
                          </p>
                          <p className="text-[11px] text-muted max-w-sm mx-auto">
                            Have an update, question, or need clarification? Post a message below to notify the handling department.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                          {comments.map((comment) => {
                            const isCurrentUser =
                              user?._id && comment.user?._id
                                ? user._id.toString() === comment.user._id.toString()
                                : false;

                            return (
                              <div
                                key={comment._id}
                                className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                                  isCurrentUser
                                    ? "border-accent/30 bg-accent/5 ml-4 sm:ml-8"
                                    : "border-border bg-surface-secondary/40 mr-4 sm:mr-8"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold text-[11px]">
                                      {comment.user?.name?.slice(0, 2).toUpperCase() || "US"}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-foreground block">
                                        {comment.user?.name || "Participant"}
                                        {isCurrentUser && (
                                          <span className="text-muted text-[10px] ml-1">(You)</span>
                                        )}
                                      </span>
                                      <span className="text-[10px] text-muted">
                                        {getRoleLabel(comment.user?.role)}
                                      </span>
                                    </div>
                                  </div>

                                  <span className="text-[10px] text-muted font-mono">
                                    {new Date(comment.createdAt).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>

                                <p className="text-foreground leading-relaxed whitespace-pre-wrap pl-9">
                                  {comment.message}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Comment Submission Form */}
                    <form onSubmit={handleAddComment} className="space-y-3 pt-4 border-t border-border/80">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="new-comment"
                            className="text-xs font-semibold text-foreground flex items-center gap-1.5"
                          >
                            <MessageSquare className="h-3.5 w-3.5 text-accent" />
                            <span>Add a Comment</span>
                          </label>
                          <span
                            className={`text-[10px] font-mono ${
                              newCommentText.length > 2000 ? "text-danger font-bold" : "text-muted"
                            }`}
                          >
                            {newCommentText.length}/2000
                          </span>
                        </div>

                        <textarea
                          id="new-comment"
                          rows={3}
                          value={newCommentText}
                          onChange={(e) => setNewCommentText(e.target.value)}
                          placeholder="Type your question or message for the handling team..."
                          maxLength={2000}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted/60 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all leading-relaxed"
                        />
                      </div>

                      {commentError && (
                        <p className="text-xs text-danger flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {commentError}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted">
                          Messages are broadcast directly to assigned personnel and municipal supervisors.
                        </span>
                        <Button
                          type="submit"
                          isDisabled={!newCommentText.trim() || isSubmittingComment}
                          size="sm"
                          className="font-semibold cursor-pointer bg-accent text-accent-foreground shadow-xs shrink-0"
                        >
                          {isSubmittingComment ? (
                            <>
                              <Activity className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Posting...
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5 mr-1.5" />
                              Post Message
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {/* =====================================================================
                    TAB 2: ACTIVITY HISTORY LOG
                    ===================================================================== */}
                {activeTab === "activity" && (
                  <Card className="border border-border bg-surface shadow-xs rounded-2xl p-6 sm:p-8 space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-border/80">
                      <div>
                        <h2 className="text-base font-bold text-foreground">
                          Audit Trail & Activity History
                        </h2>
                        <p className="text-xs text-muted">
                          Official municipal ledger recording all lifecycle actions and transitions
                        </p>
                      </div>
                      <span className="text-xs font-mono text-muted">
                        {activityLogs.length} event{activityLogs.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {activityLogs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                        <History className="h-8 w-8 text-muted mx-auto" />
                        <p className="text-xs font-semibold text-foreground">
                          No activity events recorded yet
                        </p>
                      </div>
                    ) : (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                        {activityLogs.map((log) => {
                          const formattedDate = new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          });

                          return (
                            <div key={log._id} className="relative space-y-1.5">
                              {/* Dot indicator on timeline */}
                              <div className="absolute -left-6 top-1 h-5 w-5 rounded-full bg-surface border-2 border-accent text-accent flex items-center justify-center">
                                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground">
                                    {log.performedBy?.name || "System"}
                                  </span>
                                  {log.performedBy?.role && (
                                    <Chip size="sm" variant="soft" color="accent">
                                      {getRoleLabel(log.performedBy.role)}
                                    </Chip>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted font-mono">{formattedDate}</span>
                              </div>

                              <p className="text-xs text-foreground/90 leading-relaxed">
                                {log.description}
                              </p>

                              {/* Status Transition Pill */}
                              {log.previousStatus && log.newStatus && log.previousStatus !== log.newStatus && (
                                <div className="inline-flex items-center gap-1.5 pt-1 text-[11px]">
                                  <span className="text-muted">Status changed:</span>
                                  <Chip size="sm" variant="secondary" color="default">
                                    {getStatusMeta(log.previousStatus).label}
                                  </Chip>
                                  <span className="text-muted">→</span>
                                  <Chip size="sm" variant="soft" color={getStatusMeta(log.newStatus).color}>
                                    {getStatusMeta(log.newStatus).label}
                                  </Chip>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                )}

                {/* =====================================================================
                    TAB 3: CITIZEN FEEDBACK
                    ===================================================================== */}
                {activeTab === "feedback" && (
                  <Card className="border border-border bg-surface shadow-xs rounded-2xl p-6 sm:p-8 space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-border/80">
                      <div>
                        <h2 className="text-base font-bold text-foreground">
                          Citizen Resolution Feedback
                        </h2>
                        <p className="text-xs text-muted">
                          Rate the quality, response time, and satisfaction of the municipal resolution
                        </p>
                      </div>
                      {feedback && (
                        <Chip color="success" variant="soft" size="sm">
                          Feedback Completed
                        </Chip>
                      )}
                    </div>

                    {/* Case 1: Feedback has already been submitted */}
                    {feedback ? (
                      <div className="rounded-2xl border border-success/30 bg-success/5 p-6 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-foreground block">
                              Your Submitted Rating
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-5 w-5 ${
                                    feedback.rating >= star
                                      ? "fill-warning text-warning"
                                      : "text-muted/30"
                                  }`}
                                />
                              ))}
                              <span className="ml-2 font-bold text-sm text-foreground">
                                {feedback.rating} / 5 Stars
                              </span>
                            </div>
                          </div>

                          <span className="text-xs text-muted font-mono">
                            Submitted on{" "}
                            {new Date(feedback.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>

                        {feedback.comment ? (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-foreground block">
                              Your Review & Comments
                            </span>
                            <p className="text-xs text-muted leading-relaxed whitespace-pre-wrap bg-surface p-3.5 rounded-xl border border-border">
                              &ldquo;{feedback.comment}&rdquo;
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted italic">
                            No additional comment provided with this rating.
                          </p>
                        )}
                      </div>
                    ) : isFeedbackEligible ? (
                      /* Case 2: Feedback is allowed and not yet submitted */
                      <form onSubmit={handleSubmitFeedback} className="space-y-5">
                        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-1">
                          <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                            <Sparkles className="h-4 w-4 text-accent" />
                            <span>This issue has reached resolution!</span>
                          </div>
                          <p className="text-xs text-muted">
                            As the reporting citizen, please rate how satisfactorily this issue was handled. Your feedback directly impacts municipal contractor performance metrics.
                          </p>
                        </div>

                        {/* Interactive Star Selector */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-foreground block">
                            Overall Satisfaction Rating <span className="text-danger">*</span>
                          </label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setFeedbackRating(star)}
                                onMouseEnter={() => setFeedbackHoverRating(star)}
                                onMouseLeave={() => setFeedbackHoverRating(0)}
                                className="p-1 cursor-pointer transition-transform hover:scale-115 focus:outline-none"
                                aria-label={`Rate ${star} stars`}
                              >
                                <Star
                                  className={`h-8 w-8 transition-colors ${
                                    (feedbackHoverRating || feedbackRating) >= star
                                      ? "fill-warning text-warning drop-shadow-xs"
                                      : "text-muted/30 hover:text-muted"
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="ml-3 text-xs font-semibold text-foreground">
                              {getRatingDescription(feedbackHoverRating || feedbackRating)}
                            </span>
                          </div>
                        </div>

                        {/* Comment Textarea */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor="feedback-comment"
                              className="text-xs font-semibold text-foreground"
                            >
                              Additional Comments or Observations (Optional)
                            </label>
                            <span
                              className={`text-[10px] font-mono ${
                                feedbackComment.length > 1000
                                  ? "text-danger font-bold"
                                  : "text-muted"
                              }`}
                            >
                              {feedbackComment.length}/1000
                            </span>
                          </div>
                          <textarea
                            id="feedback-comment"
                            rows={3}
                            value={feedbackComment}
                            onChange={(e) => setFeedbackComment(e.target.value)}
                            placeholder="Share any details on repair completeness, timeliness, or residual site safety..."
                            maxLength={1000}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted/60 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all leading-relaxed"
                          />
                        </div>

                        {feedbackError && (
                          <p className="text-xs text-danger flex items-center gap-1 font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {feedbackError}
                          </p>
                        )}

                        {feedbackSuccessMsg && (
                          <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>{feedbackSuccessMsg}</span>
                          </div>
                        )}

                        <Button
                          type="submit"
                          isDisabled={isSubmittingFeedback}
                          className="font-semibold cursor-pointer bg-accent text-accent-foreground shadow-xs"
                        >
                          {isSubmittingFeedback ? (
                            <>
                              <Activity className="h-4 w-4 mr-2 animate-spin" />
                              Submitting Feedback...
                            </>
                          ) : (
                            <>
                              <Star className="h-4 w-4 mr-2" />
                              Submit Resolution Feedback
                            </>
                          )}
                        </Button>
                      </form>
                    ) : (
                      /* Case 3: Issue is not yet resolved or closed */
                      <div className="rounded-2xl border border-border bg-surface-secondary/20 p-8 text-center space-y-3">
                        <div className="h-12 w-12 rounded-2xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                          <Lock className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-sm font-bold text-foreground">
                            Feedback Form Locked
                          </h3>
                          <p className="text-xs text-muted max-w-md mx-auto">
                            Citizen resolution feedback unlocks once the issue is officially marked as{" "}
                            <span className="text-foreground font-semibold">Resolved</span> or{" "}
                            <span className="text-foreground font-semibold">Closed</span> by municipal teams.
                          </p>
                        </div>
                        <Chip color="default" variant="secondary" size="sm">
                          Current status: {statusMeta?.label || "In Progress"}
                        </Chip>
                      </div>
                    )}
                  </Card>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/80">
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => router.push("/citizen/my-reports")}
                  className="font-semibold text-xs cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                  Back to My Reports Archive
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => router.push("/citizen/dashboard")}
                    className="font-semibold text-xs cursor-pointer"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                    Dashboard
                  </Button>

                  <Button
                    size="sm"
                    onPress={() => router.push("/citizen/report-issue")}
                    className="font-semibold text-xs cursor-pointer bg-accent text-accent-foreground shadow-xs"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Report Another Issue
                  </Button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
