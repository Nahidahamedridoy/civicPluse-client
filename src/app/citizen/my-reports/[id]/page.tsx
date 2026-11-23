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
  ChevronRight,
  Construction,
  Droplets,
  ExternalLink,
  FileSpreadsheet,
  Footprints,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MapPin,
  Menu,
  PlusCircle,
  RefreshCw,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  CitizenIssue,
  fetchIssueById,
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

  // Load report data from backend API within effect
  useEffect(() => {
    if (!token || !isAuthenticated || role !== "citizen" || !id) return;

    let isSubscribed = true;
    const currentToken = token;

    async function loadData() {
      try {
        const data = await fetchIssueById(currentToken, id);
        if (!isSubscribed) return;

        setIssue(data);
        if (data.images && data.images.length > 0) {
          setActiveImage(data.images[0]);
        }
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
      const data = await fetchIssueById(token, id);
      setIssue(data);
      if (data.images && data.images.length > 0) {
        setActiveImage(data.images[0]);
      }
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
            /* Issue Details Card */
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

                  {/* Active Featured Image */}
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

                  {/* Thumbnails row */}
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
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
