"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Alert } from "@heroui/react";
import {
  Activity,
  AlertCircle,
  Building,
  CheckCircle2,
  ChevronRight,
  Construction,
  Droplets,
  FileSpreadsheet,
  Footprints,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MapPin,
  Menu,
  Navigation,
  PlusCircle,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { getDashboardPath } from "@/lib/auth";
import {
  CitizenIssue,
  DepartmentItem,
  fetchDepartments,
  submitIssueReport,
  getStatusMeta,
  getPriorityMeta,
} from "@/lib/citizen-api";
import { ThemeToggle } from "@/components/layout/theme-toggle";

// Standard 6 CivicPulse infrastructure categories
const CATEGORIES = [
  {
    id: "Road Damage",
    label: "Road Damage",
    description: "Potholes, cracks, asphalt cave-ins, lane dividers",
    icon: Construction,
    departmentKeywords: ["road", "transport", "public works", "highway"],
  },
  {
    id: "Streetlight",
    label: "Streetlight",
    description: "Flickering or broken lamps, dark corridors, exposed wires",
    icon: Lightbulb,
    departmentKeywords: ["light", "electr", "power", "utility", "energy"],
  },
  {
    id: "Drainage",
    label: "Drainage",
    description: "Blocked storm grates, sewage overflow, stagnant flooding",
    icon: Droplets,
    departmentKeywords: ["drain", "water", "sewer", "flood", "sanitat"],
  },
  {
    id: "Footpath",
    label: "Footpath",
    description: "Broken sidewalk tiles, missing curb ramps, pathway hazards",
    icon: Footprints,
    departmentKeywords: ["footpath", "walk", "sidewalk", "road", "public works"],
  },
  {
    id: "Waste Management",
    label: "Waste Management",
    description: "Illegal dumping, overflowing dumpsters, uncollected trash",
    icon: Trash2,
    departmentKeywords: ["waste", "sanitat", "clean", "environ"],
  },
  {
    id: "Public Infrastructure",
    label: "Public Infrastructure",
    description: "Damaged bus shelters, municipal fencing, public fixtures",
    icon: Building,
    departmentKeywords: ["infra", "public works", "build", "facilit", "general"],
  },
] as const;

type CategoryType = (typeof CATEGORIES)[number]["id"];

const PRIORITIES = [
  { value: "low", label: "Low", hint: "Routine maintenance", color: "default" as const },
  { value: "medium", label: "Medium", hint: "Standard priority", color: "accent" as const },
  { value: "high", label: "High", hint: "Safety hazard", color: "warning" as const },
  { value: "urgent", label: "Urgent", hint: "Critical emergency", color: "danger" as const },
];

export default function ReportIssuePage() {
  const router = useRouter();
  const { user, token, role, isAuthenticated, isMounted, logout } = useAuth();

  // Navigation / Drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Departments list from backend
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  // Form fields state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CategoryType | "">("");
  const [departmentId, setDepartmentId] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Files & Previews state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location detection state
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Submission & Validation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submittedIssue, setSubmittedIssue] = useState<CitizenIssue | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

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

  // Load departments from backend
  useEffect(() => {
    if (!token || !isAuthenticated || role !== "citizen") return;

    const currentToken = token;
    let isSubscribed = true;
    async function loadDepts() {
      setDepartmentsLoading(true);
      try {
        const list = await fetchDepartments(currentToken);
        if (isSubscribed) {
          setDepartments(list);
          if (list.length > 0 && !departmentId) {
            // Default to first active department
            setDepartmentId(list[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to load departments:", err);
      } finally {
        if (isSubscribed) setDepartmentsLoading(false);
      }
    }

    loadDepts();

    return () => {
      isSubscribed = false;
    };
  }, [token, isAuthenticated, role, departmentId]);

  // Intelligent department matching when citizen selects a category
  const handleCategorySelect = (selectedCatId: CategoryType) => {
    setCategory(selectedCatId);
    if (fieldErrors.category) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated.category;
        return updated;
      });
    }

    // Try auto-matching a department if available
    const catConfig = CATEGORIES.find((c) => c.id === selectedCatId);
    if (catConfig && departments.length > 0) {
      const matched = departments.find((dept) => {
        const nameLower = (dept.name || "").toLowerCase();
        const codeLower = (dept.code || "").toLowerCase();
        return catConfig.departmentKeywords.some(
          (kw) => nameLower.includes(kw) || codeLower.includes(kw)
        );
      });

      if (matched) {
        setDepartmentId(matched._id);
      }
    }
  };

  // Image upload handling with validation and preview generation
  const handleFilesChosen = (incomingFiles: FileList | null) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const filesArray = Array.from(incomingFiles);
    const validFiles: File[] = [];
    let errorMsg: string | null = null;

    const totalAllowed = 5 - selectedFiles.length;
    if (filesArray.length > totalAllowed) {
      errorMsg = `You can upload up to 5 images in total. Only the first ${totalAllowed} accepted.`;
    }

    const allowedMime = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    for (const file of filesArray.slice(0, Math.max(0, totalAllowed))) {
      if (!allowedMime.includes(file.type.toLowerCase())) {
        errorMsg = "Only JPG, JPEG, PNG, or WEBP image formats are supported.";
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        errorMsg = `File "${file.name}" exceeds the maximum 5MB size limit.`;
        continue;
      }

      validFiles.push(file);
    }

    if (errorMsg) {
      setFieldErrors((prev) => ({ ...prev, images: errorMsg as string }));
    } else {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated.images;
        return updated;
      });
    }

    if (validFiles.length > 0) {
      const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setFilePreviews((prev) => [...prev, ...newPreviews]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove individual image preview
  const handleRemoveImage = (indexToRemove: number) => {
    const previewToRevoke = filePreviews[indexToRemove];
    if (previewToRevoke) {
      URL.revokeObjectURL(previewToRevoke);
    }

    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setFilePreviews((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    const currentPreviews = filePreviews;
    return () => {
      currentPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [filePreviews]);

  // Geolocation detection
  const handleDetectLocation = () => {
    setLocationError(null);
    setLocationSuccess(null);

    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by your current browser.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const latFormatted = lat.toFixed(6);
        const lngFormatted = lng.toFixed(6);

        setLatitude(latFormatted);
        setLongitude(lngFormatted);
        setLocationSuccess(`GPS detected (Accuracy: ~${Math.round(pos.coords.accuracy)}m)`);
        setIsLocating(false);

        // Clear coordinate field errors if any
        setFieldErrors((prev) => {
          const updated = { ...prev };
          delete updated.latitude;
          delete updated.longitude;
          return updated;
        });

        // Attempt reverse geocoding via OpenStreetMap Nominatim for convenience
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            {
              headers: { "Accept-Language": "en" },
              signal: AbortSignal.timeout(4000),
            }
          );
          if (resp.ok) {
            const data = await resp.json();
            if (data?.display_name && !address) {
              setAddress(data.display_name);
            }
          }
        } catch {
          // Non-blocking reverse geocoding fallback
        }
      },
      (err) => {
        setIsLocating(false);
        switch (err.code) {
          case 1:
            setLocationError("Location permission denied. Please enter coordinates or address manually.");
            break;
          case 2:
            setLocationError("Position unavailable. Please specify address or coordinates manually.");
            break;
          case 3:
            setLocationError("GPS location request timed out. Please try again or enter manually.");
            break;
          default:
            setLocationError("Failed to detect location. Please enter manually.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  };

  // Clear GPS location
  const handleClearLocation = () => {
    setLatitude("");
    setLongitude("");
    setLocationSuccess(null);
    setLocationError(null);
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!title.trim()) {
      errors.title = "Issue title is required.";
    } else if (title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters long.";
    } else if (title.trim().length > 200) {
      errors.title = "Title cannot exceed 200 characters.";
    }

    if (!category) {
      errors.category = "Please select an infrastructure category.";
    }

    if (!departmentId) {
      errors.department = "Please assign a responsible department.";
    }

    if (!description.trim()) {
      errors.description = "Issue description is required.";
    } else if (description.trim().length < 10) {
      errors.description = "Description must be at least 10 characters long.";
    } else if (description.trim().length > 5000) {
      errors.description = "Description cannot exceed 5000 characters.";
    }

    if (latitude.trim()) {
      const latNum = Number(latitude);
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        errors.latitude = "Latitude must be a valid number between -90 and 90.";
      }
    }

    if (longitude.trim()) {
      const lngNum = Number(longitude);
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        errors.longitude = "Longitude must be a valid number between -180 and 180.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!validateForm()) {
      // Focus first error field visually
      return;
    }

    if (!token) {
      setSubmissionError("Authentication session expired. Please sign in again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("category", category);
      fd.append("department", departmentId);
      fd.append("priority", priority);

      // Build location payload
      const locPayload: { address?: string; latitude?: number; longitude?: number } = {};
      if (address.trim()) {
        locPayload.address = address.trim();
      }
      if (latitude.trim() && !isNaN(Number(latitude))) {
        locPayload.latitude = Number(latitude);
      }
      if (longitude.trim() && !isNaN(Number(longitude))) {
        locPayload.longitude = Number(longitude);
      }

      if (Object.keys(locPayload).length > 0) {
        fd.append("location", JSON.stringify(locPayload));
      }

      // Append files under "images" (matches multer `uploadIssueImages = upload.array("images", 5)`)
      for (const file of selectedFiles) {
        fd.append("images", file);
      }

      const createdIssue = await submitIssueReport(token, fd);
      setSubmittedIssue(createdIssue);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSubmissionError(err.message);
      } else {
        setSubmissionError("An unexpected error occurred while submitting your report.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to submit another issue
  const handleResetForm = () => {
    setTitle("");
    setCategory("");
    setDescription("");
    setAddress("");
    setLatitude("");
    setLongitude("");
    setPriority("medium");
    setSelectedFiles([]);
    filePreviews.forEach((url) => URL.revokeObjectURL(url));
    setFilePreviews([]);
    setSubmittedIssue(null);
    setSubmissionError(null);
    setLocationSuccess(null);
    setLocationError(null);
    setFieldErrors({});
    if (departments.length > 0) {
      setDepartmentId(departments[0]._id);
    }
  };

  // Skeleton view during auth initialization
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row transition-colors">
      {/* =========================================================================
          1. Sidebar Navigation (Desktop & Mobile Drawer)
          ========================================================================= */}
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

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-surface flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="space-y-6 p-5">
          {/* Brand Header */}
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

          {/* Navigation Links */}
          <nav className="space-y-1">
            <Link
              href="/citizen/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer"
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              <span>Overview</span>
            </Link>

            <Link
              href="/citizen/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary/70 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span>My Reports</span>
            </Link>

            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground shadow-xs cursor-default">
              <PlusCircle className="h-4 w-4 shrink-0" />
              <span>Report an Issue</span>
            </div>
          </nav>
        </div>

        {/* User Card & Logout in Sidebar Footer */}
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

      {/* =========================================================================
          2. Main Application Area
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
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

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Link
                href="/citizen/dashboard"
                className="hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-semibold text-foreground">Report an Issue</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border text-xs text-muted">
              <Chip color="accent" variant="soft" size="sm">
                Live Incident Intake
              </Chip>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* =========================================================================
              3. SUCCESS SCREEN (Displayed once issue is created)
              ========================================================================= */}
          {submittedIssue ? (
            <Card className="border border-success/30 bg-surface shadow-xl rounded-2xl p-6 sm:p-10 space-y-8 animate-in fade-in zoom-in-95">
              <div className="text-center space-y-3">
                <div className="h-16 w-16 rounded-2xl bg-success/15 text-success flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <Chip color="success" variant="soft" size="sm">
                    Report Filed Successfully
                  </Chip>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    Issue Registered in CivicPulse
                  </h1>
                  <p className="text-xs sm:text-sm text-muted max-w-lg mx-auto">
                    Your report has been received and routed to the municipal triage queue. You can track progress updates directly on your dashboard.
                  </p>
                </div>
              </div>

              {/* Issue Summary Card */}
              <div className="rounded-2xl border border-border bg-surface-secondary/40 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border/80">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold text-muted block">
                      Incident Tracking Reference
                    </span>
                    <span className="font-mono text-base sm:text-lg font-bold text-accent">
                      #{submittedIssue._id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs text-muted block font-mono">
                      ID: {submittedIssue._id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Chip color={getStatusMeta(submittedIssue.status).color} variant="soft" size="sm">
                      {getStatusMeta(submittedIssue.status).label}
                    </Chip>
                    <Chip color={getPriorityMeta(submittedIssue.priority).color} variant="secondary" size="sm">
                      {getPriorityMeta(submittedIssue.priority).label} Priority
                    </Chip>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted block font-medium">Issue Title</span>
                    <span className="font-semibold text-foreground text-sm">
                      {submittedIssue.title}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted block font-medium">Category</span>
                    <span className="font-semibold text-foreground text-sm">
                      {submittedIssue.category}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted block font-medium">Responsible Department</span>
                    <span className="font-semibold text-foreground text-sm flex items-center gap-1.5 mt-0.5">
                      <Building className="h-3.5 w-3.5 text-accent" />
                      {submittedIssue.department?.name || "Municipal Dispatch"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted block font-medium">Submitted At</span>
                    <span className="font-semibold text-foreground text-sm">
                      {new Date(submittedIssue.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {submittedIssue.location && (
                  <div className="pt-3 border-t border-border/80 text-xs space-y-1">
                    <span className="text-muted block font-medium">Location Details</span>
                    <div className="flex items-start gap-1.5 text-foreground font-semibold">
                      <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <span>
                        {submittedIssue.location.address || "GPS Coordinates Recorded"}
                        {submittedIssue.location.latitude != null && submittedIssue.location.longitude != null && (
                          <span className="block font-mono text-[11px] text-muted font-normal">
                            Lat: {submittedIssue.location.latitude}, Lng: {submittedIssue.location.longitude}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {submittedIssue.images && submittedIssue.images.length > 0 && (
                  <div className="pt-3 border-t border-border/80 text-xs space-y-2">
                    <span className="text-muted block font-medium">
                      Uploaded Evidence ({submittedIssue.images.length})
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {submittedIssue.images.map((imgUrl, i) => (
                        <div
                          key={i}
                          className="h-16 w-16 rounded-lg overflow-hidden border border-border bg-surface shrink-0"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imgUrl}
                            alt={`Evidence thumbnail ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  onPress={() => router.push("/citizen/dashboard")}
                  className="w-full sm:w-auto font-semibold cursor-pointer shadow-xs bg-accent text-accent-foreground"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  View in Citizen Dashboard
                </Button>

                <Button
                  variant="outline"
                  onPress={handleResetForm}
                  className="w-full sm:w-auto font-semibold cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Report Another Incident
                </Button>
              </div>
            </Card>
          ) : (
            /* =========================================================================
                4. REPORT ISSUE FORM
                ========================================================================= */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header Banner */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                    <Construction className="h-4 w-4" />
                  </div>
                  <Chip color="accent" variant="soft" size="sm">
                    Official Intake
                  </Chip>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Report an Infrastructure Issue
                </h1>
                <p className="text-xs sm:text-sm text-muted">
                  Provide detailed information, accurate GPS coordinates, and clear photo evidence to facilitate rapid municipal inspection and repair.
                </p>
              </div>

              {/* Server or Submission Error Banner */}
              {submissionError && (
                <Alert className="rounded-xl border border-danger/40 bg-danger/10 text-danger p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <div>
                      <span className="font-bold">Submission Failed: </span>
                      <span>{submissionError}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    isIconOnly
                    size="sm"
                    onPress={() => setSubmissionError(null)}
                    aria-label="Dismiss error"
                    className="cursor-pointer text-danger hover:bg-danger/20 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Alert>
              )}

              {/* =====================================================================
                  STEP 1: CATEGORY SELECTION
                  ===================================================================== */}
              <Card className="border border-border bg-surface shadow-xs rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-xs">
                        1
                      </span>
                      <h2 className="text-sm sm:text-base font-bold text-foreground">
                        Select Infrastructure Category
                      </h2>
                    </div>
                    <p className="text-xs text-muted pl-7">
                      Choose the category that best describes the issue.
                    </p>
                  </div>
                  {category && (
                    <Chip color="accent" variant="soft" size="sm">
                      {category}
                    </Chip>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-2 group ${
                          isSelected
                            ? "border-accent bg-accent/10 ring-2 ring-accent/30 shadow-xs"
                            : "border-border bg-surface-secondary/40 hover:bg-surface-secondary hover:border-accent/40"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-accent text-accent-foreground shadow-xs"
                                : "bg-surface text-muted group-hover:text-foreground"
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                          )}
                        </div>

                        <div>
                          <div className="font-semibold text-xs sm:text-sm text-foreground">
                            {cat.label}
                          </div>
                          <p className="text-[11px] text-muted line-clamp-2 mt-0.5 leading-relaxed">
                            {cat.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {fieldErrors.category && (
                  <p className="text-xs text-danger flex items-center gap-1 font-medium pl-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {fieldErrors.category}
                  </p>
                )}
              </Card>

              {/* =====================================================================
                  STEP 2: INCIDENT DETAILS (Title, Department, Priority)
                  ===================================================================== */}
              <Card className="border border-border bg-surface shadow-xs rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-xs">
                      2
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-foreground">
                      Incident Details & Assignment
                    </h2>
                  </div>
                  <p className="text-xs text-muted pl-7">
                    Specify the issue title, assigned municipal department, and urgency level.
                  </p>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="issue-title" className="text-xs font-semibold text-foreground">
                      Issue Title <span className="text-danger">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        title.length > 200 ? "text-danger font-bold" : "text-muted"
                      }`}
                    >
                      {title.length}/200
                    </span>
                  </div>
                  <input
                    id="issue-title"
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (fieldErrors.title) {
                        setFieldErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.title;
                          return updated;
                        });
                      }
                    }}
                    placeholder="e.g. Deep pothole causing vehicular damage near Main Street intersection"
                    maxLength={200}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface text-foreground placeholder:text-muted/60 text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.title
                        ? "border-danger focus:ring-danger/30"
                        : "border-border focus:ring-accent/40"
                    }`}
                  />
                  {fieldErrors.title ? (
                    <p className="text-xs text-danger flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.title}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted">
                      A clear, descriptive summary (minimum 3 characters).
                    </p>
                  )}
                </div>

                {/* Department & Priority in Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Department Dropdown */}
                  <div className="space-y-1.5">
                    <label htmlFor="issue-department" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-accent" />
                      <span>Responsible Department</span>
                      <span className="text-danger">*</span>
                    </label>
                    <div className="relative">
                      <select
                        id="issue-department"
                        value={departmentId}
                        onChange={(e) => {
                          setDepartmentId(e.target.value);
                          if (fieldErrors.department) {
                            setFieldErrors((prev) => {
                              const updated = { ...prev };
                              delete updated.department;
                              return updated;
                            });
                          }
                        }}
                        disabled={departmentsLoading}
                        className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                          fieldErrors.department
                            ? "border-danger focus:ring-danger/30"
                            : "border-border focus:ring-accent/40"
                        }`}
                      >
                        {departmentsLoading ? (
                          <option value="">Loading departments from server...</option>
                        ) : departments.length === 0 ? (
                          <option value="">No departments found</option>
                        ) : (
                          departments.map((dept) => (
                            <option key={dept._id} value={dept._id}>
                              {dept.name} ({dept.code})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    {fieldErrors.department ? (
                      <p className="text-xs text-danger flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {fieldErrors.department}
                      </p>
                    ) : (
                      <p className="text-[11px] text-muted">
                        Automatically suggested based on category or manually selectable.
                      </p>
                    )}
                  </div>

                  {/* Priority Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-accent" />
                      <span>Priority Classification</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PRIORITIES.map((p) => {
                        const isSelected = priority === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setPriority(p.value as "low" | "medium" | "high" | "urgent")}
                            className={`py-2 px-1 text-center rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "border-accent bg-accent text-accent-foreground shadow-xs"
                                : "border-border bg-surface-secondary/40 text-muted hover:text-foreground hover:bg-surface-secondary"
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted">
                      Defaults to Medium; mark High or Urgent if causing direct hazard.
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="issue-description" className="text-xs font-semibold text-foreground">
                      Detailed Incident Description <span className="text-danger">*</span>
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        description.length > 5000 ? "text-danger font-bold" : "text-muted"
                      }`}
                    >
                      {description.length}/5000
                    </span>
                  </div>
                  <textarea
                    id="issue-description"
                    rows={4}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (fieldErrors.description) {
                        setFieldErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.description;
                          return updated;
                        });
                      }
                    }}
                    placeholder="Provide specific details such as exact landmarks, severity of damage, risk to pedestrians or vehicles, how long the issue has persisted, and any relevant safety hazards..."
                    maxLength={5000}
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface text-foreground placeholder:text-muted/60 text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all leading-relaxed ${
                      fieldErrors.description
                        ? "border-danger focus:ring-danger/30"
                        : "border-border focus:ring-accent/40"
                    }`}
                  />
                  {fieldErrors.description ? (
                    <p className="text-xs text-danger flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {fieldErrors.description}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted">
                      Provide at least 10 characters describing the incident clearly.
                    </p>
                  )}
                </div>
              </Card>

              {/* =====================================================================
                  STEP 3: LOCATION & GPS COORDINATES
                  ===================================================================== */}
              <Card className="border border-border bg-surface shadow-xs rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-xs">
                        3
                      </span>
                      <h2 className="text-sm sm:text-base font-bold text-foreground">
                        Location & GPS Coordinates
                      </h2>
                    </div>
                    <p className="text-xs text-muted pl-7">
                      Pinpoint the exact location using street address or browser GPS detection.
                    </p>
                  </div>

                  {/* Geolocation Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onPress={handleDetectLocation}
                    isDisabled={isLocating}
                    className="cursor-pointer font-semibold text-xs border-accent/40 text-accent hover:bg-accent/10 shrink-0"
                  >
                    <Navigation className={`h-3.5 w-3.5 mr-1.5 ${isLocating ? "animate-spin" : ""}`} />
                    {isLocating ? "Detecting GPS..." : "Use Current Location"}
                  </Button>
                </div>

                {/* Status messages for Geolocation */}
                {locationSuccess && (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      {locationSuccess}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-[11px] underline hover:no-underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                )}

                {locationError && (
                  <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {locationError}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLocationError(null)}
                      className="text-[11px] underline hover:no-underline cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Address Field */}
                <div className="space-y-1.5">
                  <label htmlFor="issue-address" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                    <span>Street Address / Nearby Landmark</span>
                  </label>
                  <input
                    id="issue-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. In front of City Public Hospital, corner of 7th Avenue"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted/60 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
                  />
                  <p className="text-[11px] text-muted">
                    Helps field maintenance crew quickly locate the site.
                  </p>
                </div>

                {/* Latitude & Longitude in 2 Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="issue-lat" className="text-xs font-semibold text-foreground">
                      GPS Latitude (-90 to 90)
                    </label>
                    <input
                      id="issue-lat"
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => {
                        setLatitude(e.target.value);
                        if (fieldErrors.latitude) {
                          setFieldErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.latitude;
                            return updated;
                          });
                        }
                      }}
                      placeholder="e.g. 23.810332"
                      className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.latitude
                          ? "border-danger focus:ring-danger/30"
                          : "border-border focus:ring-accent/40"
                      }`}
                    />
                    {fieldErrors.latitude && (
                      <p className="text-xs text-danger flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {fieldErrors.latitude}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="issue-lng" className="text-xs font-semibold text-foreground">
                      GPS Longitude (-180 to 180)
                    </label>
                    <input
                      id="issue-lng"
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => {
                        setLongitude(e.target.value);
                        if (fieldErrors.longitude) {
                          setFieldErrors((prev) => {
                            const updated = { ...prev };
                            delete updated.longitude;
                            return updated;
                          });
                        }
                      }}
                      placeholder="e.g. 90.412518"
                      className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.longitude
                          ? "border-danger focus:ring-danger/30"
                          : "border-border focus:ring-accent/40"
                      }`}
                    />
                    {fieldErrors.longitude && (
                      <p className="text-xs text-danger flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {fieldErrors.longitude}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* =====================================================================
                  STEP 4: PHOTO EVIDENCE UPLOAD
                  ===================================================================== */}
              <Card className="border border-border bg-surface shadow-xs rounded-2xl p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-accent font-bold text-xs">
                        4
                      </span>
                      <h2 className="text-sm sm:text-base font-bold text-foreground">
                        Photo Evidence Upload
                      </h2>
                    </div>
                    <p className="text-xs text-muted pl-7">
                      Upload clear photos showing the damage or context (up to 5 images, max 5MB each).
                    </p>
                  </div>

                  <span className="text-xs font-mono text-muted">
                    {selectedFiles.length}/5 images
                  </span>
                </div>

                {/* Dropzone Container */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFilesChosen(e.target.files)}
                />

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleFilesChosen(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                    selectedFiles.length >= 5
                      ? "border-border/60 bg-surface-secondary/20 cursor-not-allowed opacity-60"
                      : "border-border hover:border-accent hover:bg-accent/5"
                  }`}
                >
                  <div className="h-12 w-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs sm:text-sm font-semibold text-foreground block">
                      Click to browse or drag and drop photos here
                    </span>
                    <span className="text-[11px] text-muted block">
                      Supported formats: JPG, JPEG, PNG, WEBP (Max 5MB per file)
                    </span>
                  </div>
                </div>

                {fieldErrors.images && (
                  <p className="text-xs text-danger flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {fieldErrors.images}
                  </p>
                )}

                {/* Previews Grid */}
                {filePreviews.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-foreground block">
                      Selected Photos ({filePreviews.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {filePreviews.map((previewUrl, idx) => {
                        const file = selectedFiles[idx];
                        const fileSizeMb = file ? (file.size / (1024 * 1024)).toFixed(2) : "0";

                        return (
                          <div
                            key={idx}
                            className="relative group rounded-xl overflow-hidden border border-border bg-surface aspect-square flex flex-col"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrl}
                              alt={`Selected preview ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />

                            {/* Overlay with remove button */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                isIconOnly
                                onPress={() => handleRemoveImage(idx)}
                                aria-label="Remove photo"
                                className="cursor-pointer shadow-md"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* File info pill */}
                            <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white rounded px-1.5 py-0.5 text-[9px] font-mono truncate text-center">
                              {fileSizeMb} MB
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>

              {/* =====================================================================
                  STEP 5: SUBMIT ACTION BAR
                  ===================================================================== */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <Link
                  href="/citizen/dashboard"
                  className="w-full sm:w-auto text-center px-4 py-2.5 rounded-xl border border-border bg-surface text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-secondary transition-all"
                >
                  Cancel & Return to Dashboard
                </Link>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="submit"
                    isDisabled={isSubmitting}
                    className="w-full sm:w-auto font-semibold px-6 py-2.5 shadow-sm cursor-pointer bg-accent text-accent-foreground"
                  >
                    {isSubmitting ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Submitting Report...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Incident Report
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
