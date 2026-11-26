"use client";

import React, { useEffect, useState } from "react";
import { Alert, Button, Chip } from "@heroui/react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Layers,
  Loader2,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  AdminDepartment,
  AdminUserRecord,
  DepartmentWorkloadResponse,
  assignUserDepartment,
  fetchAdminUsers,
  fetchDepartmentWorkload,
} from "@/lib/admin-api";

interface DepartmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: AdminDepartment | null;
  token: string;
  onManagerAssigned?: () => void;
}

export function DepartmentDetailsModal({
  isOpen,
  onClose,
  department,
  token,
  onManagerAssigned,
}: DepartmentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "staff" | "manager">("overview");

  // Workload state
  const [workload, setWorkload] = useState<DepartmentWorkloadResponse | null>(null);
  const [isWorkloadLoading, setIsWorkloadLoading] = useState<boolean>(() => Boolean(isOpen && department && token));

  // Department managers & assignment state
  const [currentManager, setCurrentManager] = useState<AdminUserRecord | null>(null);
  const [availableManagers, setAvailableManagers] = useState<AdminUserRecord[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [isManagerLoading, setIsManagerLoading] = useState<boolean>(() => Boolean(isOpen && department && token));
  const [isAssigning, setIsAssigning] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Load department specific details
  useEffect(() => {
    if (!isOpen || !department || !token) return;

    let active = true;

    // 1. Fetch workload & staff
    fetchDepartmentWorkload(token, department._id)
      .then((data) => {
        if (!active) return;
        setWorkload(data);
      })
      .finally(() => {
        if (active) setIsWorkloadLoading(false);
      });

    // 2. Fetch managers (assigned to this department + unassigned/available)
    Promise.all([
      fetchAdminUsers(token, {
        role: "department_manager",
        department: department._id,
      }),
      fetchAdminUsers(token, {
        role: "department_manager",
        isActive: true,
      }),
    ])
      .then(([assignedRes, allManagersRes]) => {
        if (!active) return;
        // Found assigned manager
        const assigned = assignedRes.users[0] || null;
        setCurrentManager(assigned);
        if (assigned) {
          setSelectedManagerId(assigned._id);
        } else {
          setSelectedManagerId("");
        }

        // Available candidate managers (either in this department or unassigned)
        setAvailableManagers(allManagersRes.users);
      })
      .finally(() => {
        if (active) setIsManagerLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, department, token]);

  if (!isOpen || !department) return null;

  // Handle assigning / reassigning manager
  const handleAssignManager = async () => {
    if (!token) return;
    setIsAssigning(true);
    setFeedbackMessage(null);

    try {
      if (selectedManagerId === "unassign") {
        if (currentManager) {
          await assignUserDepartment(token, currentManager._id, null);
          setCurrentManager(null);
          setSelectedManagerId("");
          setFeedbackMessage({
            type: "success",
            text: "Department manager unassigned successfully.",
          });
          onManagerAssigned?.();
        }
      } else if (selectedManagerId) {
        // If there was an existing manager, we could unassign them or reassign new one
        const res = await assignUserDepartment(token, selectedManagerId, department._id);
        setCurrentManager(res.user);
        setFeedbackMessage({
          type: "success",
          text: `Assigned ${res.user.name} as department manager.`,
        });
        onManagerAssigned?.();
      }
    } catch (err: unknown) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update manager assignment.",
      });
    } finally {
      setIsAssigning(false);
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
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent shrink-0">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">
                  {department.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-surface-secondary text-muted uppercase">
                  {department.code}
                </span>
                <Chip
                  color={department.isActive ? "success" : "danger"}
                  variant="soft"
                  size="sm"
                  className="text-[10px]"
                >
                  {department.isActive ? "Active" : "Inactive"}
                </Chip>
              </div>
              <p className="text-xs text-muted mt-0.5 line-clamp-1">
                {department.description || "No official description provided."}
              </p>
            </div>
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
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" /> Overview & Workload
          </button>

          <button
            onClick={() => setActiveTab("staff")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "staff"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" /> Maintenance Staff (
            {workload?.totalStaff ?? 0})
          </button>

          <button
            onClick={() => setActiveTab("manager")}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "manager"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" /> Department Manager
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Feedback Alert */}
          {feedbackMessage && (
            <Alert
              className={`rounded-xl p-3.5 flex items-start gap-2.5 text-xs ${
                feedbackMessage.type === "success"
                  ? "border border-success/40 bg-success/10 text-success"
                  : "border border-danger/40 bg-danger/10 text-danger"
              }`}
            >
              {feedbackMessage.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{feedbackMessage.text}</span>
            </Alert>
          )}

          {/* TAB 1: OVERVIEW & WORKLOAD */}
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Total Staff
                  </span>
                  <div className="text-2xl font-black text-foreground">
                    {isWorkloadLoading ? "--" : workload?.totalStaff ?? 0}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Active Tasks
                  </span>
                  <div className="text-2xl font-black text-accent">
                    {isWorkloadLoading
                      ? "--"
                      : workload?.staffWorkload.reduce(
                          (acc, curr) => acc + curr.activeWorkload,
                          0
                        ) ?? 0}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    In Progress
                  </span>
                  <div className="text-2xl font-black text-warning">
                    {isWorkloadLoading
                      ? "--"
                      : workload?.staffWorkload.reduce(
                          (acc, curr) => acc + curr.inProgress,
                          0
                        ) ?? 0}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Resolved
                  </span>
                  <div className="text-2xl font-black text-success">
                    {isWorkloadLoading
                      ? "--"
                      : workload?.staffWorkload.reduce(
                          (acc, curr) => acc + curr.resolved,
                          0
                        ) ?? 0}
                  </div>
                </div>
              </div>

              {/* Department Meta */}
              <div className="p-4 rounded-xl border border-border bg-surface-secondary/20 space-y-3 text-xs">
                <h4 className="font-bold text-foreground">Department Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted block text-[11px]">Division Code</span>
                    <span className="font-mono font-semibold text-foreground">
                      {department.code}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">System ID</span>
                    <span className="font-mono text-[10px] text-muted">
                      {department._id}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Created At</span>
                    <span className="font-medium text-foreground">
                      {new Date(department.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Assigned Manager</span>
                    <span className="font-semibold text-foreground">
                      {currentManager ? currentManager.name : "Unassigned"}
                    </span>
                  </div>
                </div>
                {department.description && (
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-muted block text-[11px] mb-1">Description</span>
                    <p className="text-foreground leading-relaxed">
                      {department.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STAFF LIST */}
          {activeTab === "staff" && (
            <div className="space-y-4">
              {isWorkloadLoading ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" />
                  <p className="text-xs text-muted">Loading department crew...</p>
                </div>
              ) : !workload || workload.staffWorkload.length === 0 ? (
                <div className="py-12 text-center space-y-3 rounded-2xl border border-dashed border-border p-6">
                  <Wrench className="h-8 w-8 text-muted mx-auto" />
                  <h5 className="text-sm font-bold text-foreground">
                    No Maintenance Staff Assigned
                  </h5>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Staff can be assigned to {department.name} through User Management.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {workload.staffWorkload.map((item) => (
                    <div
                      key={item.staff._id}
                      className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 hover:bg-surface-secondary/40 transition-colors flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-accent/15 text-accent font-bold flex items-center justify-center shrink-0">
                          {item.staff.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground block truncate">
                            {item.staff.name}
                          </span>
                          <span className="text-[10px] text-muted block truncate">
                            {item.staff.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-muted block">Workload</span>
                          <span className="font-mono font-bold text-accent">
                            {item.activeWorkload} active
                          </span>
                        </div>
                        <div className="h-6 w-px bg-border hidden sm:block" />
                        <div className="text-right hidden sm:block">
                          <span className="text-[10px] text-muted block">Resolved</span>
                          <span className="font-mono font-bold text-success">
                            {item.resolved}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANAGER ASSIGNMENT */}
          {activeTab === "manager" && (
            <div className="space-y-5 text-xs">
              {/* Current Manager Banner */}
              <div className="p-4 rounded-xl border border-border bg-surface-secondary/30 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                  Current Department Manager
                </span>
                {isManagerLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    <span className="text-muted">Loading manager details...</span>
                  </div>
                ) : currentManager ? (
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-accent/20 text-accent font-bold flex items-center justify-center text-sm">
                        {currentManager.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">
                            {currentManager.name}
                          </span>
                          <Chip color="success" variant="soft" size="sm" className="text-[10px]">
                            Assigned
                          </Chip>
                        </div>
                        <span className="text-[11px] text-muted block">
                          {currentManager.email} {currentManager.phone ? `• ${currentManager.phone}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-warning pt-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="font-medium">
                      No manager currently assigned to this department.
                    </span>
                  </div>
                )}
              </div>

              {/* Assign / Change Manager Form */}
              <div className="p-5 rounded-2xl border border-border bg-surface space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-accent" /> Assign or Change Manager
                  </h4>
                  <p className="text-xs text-muted mt-0.5">
                    Select an authorized department manager account from the system roster.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Select Manager Account
                  </label>
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    disabled={isManagerLoading || isAssigning}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary/40 text-foreground text-xs focus:outline-hidden focus:border-accent"
                  >
                    <option value="">-- Choose a Manager --</option>
                    {currentManager && (
                      <option value="unassign">
                        ⚠️ Unassign Current Manager ({currentManager.name})
                      </option>
                    )}
                    {availableManagers.map((mgr) => {
                      const isCurrent = currentManager?._id === mgr._id;
                      const hasOtherDept =
                        mgr.department && mgr.department._id !== department._id;

                      return (
                        <option key={mgr._id} value={mgr._id}>
                          {mgr.name} ({mgr.email})
                          {isCurrent
                            ? " — [Current Manager]"
                            : hasOtherDept
                            ? ` — [Currently in ${mgr.department?.name}]`
                            : " — [Available]"}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={handleAssignManager}
                    isDisabled={
                      !selectedManagerId ||
                      (selectedManagerId === currentManager?._id) ||
                      isAssigning
                    }
                    className="cursor-pointer text-xs font-semibold gap-1.5"
                  >
                    {isAssigning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...
                      </>
                    ) : selectedManagerId === "unassign" ? (
                      <>
                        <UserX className="h-3.5 w-3.5" /> Confirm Unassignment
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Save Manager Assignment
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
