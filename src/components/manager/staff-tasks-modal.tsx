"use client";

import React, { useState } from "react";
import { Alert, Button, Card, Chip, Separator } from "@heroui/react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Eye,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import {
  ManagerIssue,
  StaffWorkloadItem,
  assignIssueToStaff,
  getPriorityMeta,
  getStatusMeta,
} from "@/lib/manager-api";

interface StaffTasksModalProps {
  staffItem: StaffWorkloadItem | null;
  assignedIssues: ManagerIssue[];
  availableIssues: ManagerIssue[];
  token: string;
  initialTab?: "tasks" | "assign";
  onClose: () => void;
  onIssueAssigned: (assignedIssue: ManagerIssue, staffName: string) => void;
  onViewIssueDetails: (issue: ManagerIssue) => void;
}

export function StaffTasksModal({
  staffItem,
  assignedIssues,
  availableIssues,
  token,
  initialTab = "tasks",
  onClose,
  onIssueAssigned,
  onViewIssueDetails,
}: StaffTasksModalProps) {
  const [activeTab, setActiveTab] = useState<"tasks" | "assign">(initialTab);
  const [taskFilter, setTaskFilter] = useState<"all" | "active" | "resolved">("all");
  const [selectedIssueId, setSelectedIssueId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!staffItem) return null;

  const { staff, assigned, inProgress, resolved, activeWorkload } = staffItem;

  const initials = staff.name
    ? staff.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  let workloadBadge: {
    label: string;
    color: "success" | "warning" | "danger" | "accent" | "default";
  } = {
    label: "Available",
    color: "success",
  };
  if (activeWorkload > 5) {
    workloadBadge = { label: "Heavy Load", color: "danger" };
  } else if (activeWorkload > 2) {
    workloadBadge = { label: "Moderate Load", color: "warning" };
  } else if (activeWorkload > 0) {
    workloadBadge = { label: "Active", color: "accent" };
  }

  // Filter staff's assigned tasks
  const filteredTasks = assignedIssues.filter((task) => {
    if (taskFilter === "active") {
      return ["assigned", "in_progress"].includes(task.status?.toLowerCase());
    }
    if (taskFilter === "resolved") {
      return ["resolved", "closed"].includes(task.status?.toLowerCase());
    }
    return true;
  });

  const selectedIssueObj = availableIssues.find((i) => i._id === selectedIssueId);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueId) {
      setActionError("Please select a department issue to assign.");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await assignIssueToStaff(token, selectedIssueId, staff._id);
      setActionSuccess(`Issue "${res.issue.title}" successfully assigned to ${staff.name}.`);
      setSelectedIssueId("");
      onIssueAssigned(res.issue, staff.name);
      setActiveTab("tasks");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to assign issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-tasks-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <Card className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto border border-border bg-surface shadow-2xl rounded-2xl p-5 sm:p-7 space-y-6">
        {/* Modal Header: Staff Information Profile */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-accent/15 text-accent flex items-center justify-center font-bold text-base shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="staff-tasks-modal-title"
                  className="text-lg sm:text-2xl font-bold text-foreground"
                >
                  {staff.name}
                </h2>
                <Chip color={workloadBadge.color} variant="soft" size="sm">
                  {workloadBadge.label}
                </Chip>
                <Chip color="default" variant="secondary" size="sm" className="text-[10px]">
                  Maintenance Staff
                </Chip>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-muted shrink-0" />
                  {staff.email}
                </span>
                {staff.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-muted shrink-0" />
                    {staff.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={onClose}
            aria-label="Close modal"
            className="cursor-pointer shrink-0 self-start text-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Workload Summary KPI strip for this staff member */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-border bg-surface-secondary/30">
            <span className="text-[10px] font-bold uppercase text-muted block">
              Active Workload
            </span>
            <span className="text-xl font-black text-foreground mt-0.5 block">
              {activeWorkload}
            </span>
            <span className="text-[10px] text-muted">Assigned + in progress</span>
          </div>

          <div className="p-3 rounded-xl border border-border bg-surface-secondary/30">
            <span className="text-[10px] font-bold uppercase text-muted block">
              Assigned (New)
            </span>
            <span className="text-xl font-black text-accent mt-0.5 block">
              {assigned}
            </span>
            <span className="text-[10px] text-muted">Awaiting start</span>
          </div>

          <div className="p-3 rounded-xl border border-border bg-surface-secondary/30">
            <span className="text-[10px] font-bold uppercase text-muted block">
              In Progress
            </span>
            <span className="text-xl font-black text-warning mt-0.5 block">
              {inProgress}
            </span>
            <span className="text-[10px] text-muted">Field repair underway</span>
          </div>

          <div className="p-3 rounded-xl border border-border bg-surface-secondary/30">
            <span className="text-[10px] font-bold uppercase text-muted block">
              Completed Tasks
            </span>
            <span className="text-xl font-black text-success mt-0.5 block">
              {resolved}
            </span>
            <span className="text-[10px] text-muted">Repairs resolved</span>
          </div>
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

        {/* Sub-navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "tasks"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-surface-secondary"
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              Assigned Tasks
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeTab === "tasks"
                    ? "bg-white/20 text-white"
                    : "bg-surface-secondary text-muted"
                }`}
              >
                {assignedIssues.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("assign")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "assign"
                  ? "bg-accent text-accent-foreground shadow-xs"
                  : "text-muted hover:text-foreground hover:bg-surface-secondary"
              }`}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Assign New Issue
              {availableIssues.length > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === "assign"
                      ? "bg-white/20 text-white"
                      : "bg-surface-secondary text-muted"
                  }`}
                >
                  {availableIssues.length} available
                </span>
              )}
            </button>
          </div>

          {activeTab === "tasks" && assignedIssues.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setTaskFilter("all")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  taskFilter === "all"
                    ? "bg-surface-secondary font-bold text-foreground"
                    : "text-muted hover:text-foreground"
                }`}
              >
                All ({assignedIssues.length})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter("active")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  taskFilter === "active"
                    ? "bg-surface-secondary font-bold text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Active ({activeWorkload})
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter("resolved")}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  taskFilter === "resolved"
                    ? "bg-surface-secondary font-bold text-success"
                    : "text-muted hover:text-foreground"
                }`}
              >
                Resolved ({resolved})
              </button>
            </div>
          )}
        </div>

        {/* =================================================================
            TAB 1: ASSIGNED TASKS LIST
            ================================================================= */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {assignedIssues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-3">
                <div className="h-10 w-10 rounded-xl bg-surface-secondary text-muted flex items-center justify-center mx-auto">
                  <Wrench className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    No Tasks Currently Assigned
                  </h3>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    {staff.name} is currently available with 0 active tasks. You can assign
                    department issues directly using the tab above.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => setActiveTab("assign")}
                  className="cursor-pointer text-xs gap-1.5"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Assign an Issue
                </Button>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
                <p className="text-xs text-muted">
                  No tasks match the selected filter ({taskFilter}).
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setTaskFilter("all")}
                  className="cursor-pointer text-xs"
                >
                  Show All Tasks
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const statusMeta = getStatusMeta(task.status);
                  const priorityMeta = getPriorityMeta(task.priority);
                  const formattedDate = new Date(task.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });

                  const locationText =
                    task.location?.address ||
                    (task.location?.latitude != null && task.location?.longitude != null
                      ? `${task.location.latitude.toFixed(4)}, ${task.location.longitude.toFixed(4)}`
                      : "No address specified");

                  return (
                    <div
                      key={task._id}
                      className="p-4 rounded-xl border border-border bg-surface-secondary/20 hover:border-accent/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
                            #{task._id.slice(-6).toUpperCase()}
                          </span>
                          <Chip color={priorityMeta.color} variant="secondary" size="sm">
                            {priorityMeta.label}
                          </Chip>
                          <Chip color={statusMeta.color} variant="soft" size="sm">
                            {statusMeta.label}
                          </Chip>
                          <span className="text-[11px] text-muted font-medium">
                            {task.category}
                          </span>
                        </div>

                        <h4 className="text-xs sm:text-sm font-semibold text-foreground line-clamp-1">
                          {task.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
                          <span className="flex items-center gap-1 truncate max-w-[220px]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{locationText}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {formattedDate}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => onViewIssueDetails(task)}
                        className="cursor-pointer text-xs shrink-0 gap-1 self-start sm:self-center"
                      >
                        <Eye className="h-3.5 w-3.5 text-accent" />
                        View Task
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            TAB 2: ASSIGN DEPARTMENT ISSUE TO THIS STAFF MEMBER
            ================================================================= */}
        {activeTab === "assign" && (
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Assign Department Incident to {staff.name}
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Select an unassigned or pending issue from your department to dispatch to this staff member.
              </p>
            </div>

            {availableIssues.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto" />
                <h4 className="text-sm font-bold text-foreground">
                  No Available Issues to Assign
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  All current department issues are already assigned, resolved, or closed.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="select-issue"
                    className="text-xs font-semibold text-foreground block"
                  >
                    Select Department Issue
                  </label>
                  <select
                    id="select-issue"
                    value={selectedIssueId}
                    onChange={(e) => setSelectedIssueId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border bg-surface px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="">-- Choose an issue from your department --</option>
                    {availableIssues.map((issue) => (
                      <option key={issue._id} value={issue._id}>
                        [{issue.priority.toUpperCase()}] #{issue._id.slice(-6).toUpperCase()} - {issue.title} (
                        {issue.category} • {getStatusMeta(issue.status).label})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Issue Preview Card */}
                {selectedIssueObj && (
                  <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 space-y-2.5 animate-in fade-in">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-accent">
                          #{selectedIssueObj._id.slice(-6).toUpperCase()}
                        </span>
                        <Chip
                          color={getPriorityMeta(selectedIssueObj.priority).color}
                          variant="secondary"
                          size="sm"
                        >
                          {getPriorityMeta(selectedIssueObj.priority).label}
                        </Chip>
                        <Chip
                          color={getStatusMeta(selectedIssueObj.status).color}
                          variant="soft"
                          size="sm"
                        >
                          {getStatusMeta(selectedIssueObj.status).label}
                        </Chip>
                      </div>
                      <span className="text-xs text-muted">{selectedIssueObj.category}</span>
                    </div>

                    <h4 className="text-sm font-bold text-foreground">
                      {selectedIssueObj.title}
                    </h4>

                    <p className="text-xs text-muted leading-relaxed line-clamp-3">
                      {selectedIssueObj.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-xs text-muted pt-1">
                      <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span>
                        {selectedIssueObj.location?.address || "No street address provided"}
                      </span>
                    </div>

                    {selectedIssueObj.assignedTo && (
                      <p className="text-[11px] text-warning font-medium pt-1">
                        Currently assigned to {selectedIssueObj.assignedTo.name}. Confirming
                        will reassign this task to {staff.name}.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onPress={() => setActiveTab("tasks")}
                    className="cursor-pointer text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isDisabled={isSubmitting || !selectedIssueId}
                    className="cursor-pointer text-xs font-semibold gap-1.5"
                  >
                    <UserCheck className="h-4 w-4" />
                    {isSubmitting ? "Assigning Task..." : `Confirm Assignment to ${staff.name}`}
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        <Separator />

        {/* Modal Footer */}
        <div className="flex items-center justify-end">
          <Button variant="outline" size="sm" onPress={onClose} className="cursor-pointer text-xs">
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
