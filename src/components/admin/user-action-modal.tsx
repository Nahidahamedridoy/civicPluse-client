"use client";

import React, { useState } from "react";
import { Alert, Button, Chip } from "@heroui/react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Clock,
  IdCard,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Power,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCog,
  Wrench,
  X,
} from "lucide-react";
import {
  AdminUserRecord,
  DepartmentOption,
  updateUserRoleByAdmin,
  updateUserStatusByAdmin,
} from "@/lib/admin-api";

interface UserActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserRecord | null;
  departments: DepartmentOption[];
  currentAdminId?: string;
  token: string;
  onSuccess: (updatedUser: AdminUserRecord, message: string) => void;
}

export function UserActionModal({
  isOpen,
  onClose,
  user,
  departments,
  currentAdminId,
  token,
  onSuccess,
}: UserActionModalProps) {
  if (!isOpen || !user) return null;

  return (
    <UserActionModalContent
      user={user}
      departments={departments}
      currentAdminId={currentAdminId}
      token={token}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function UserActionModalContent({
  user,
  departments,
  currentAdminId,
  token,
  onClose,
  onSuccess,
}: {
  user: AdminUserRecord;
  departments: DepartmentOption[];
  currentAdminId?: string;
  token: string;
  onClose: () => void;
  onSuccess: (updatedUser: AdminUserRecord, message: string) => void;
}) {
  const isSelf = currentAdminId === user._id;

  // Tabs
  const [activeTab, setActiveTab] = useState<"details" | "role" | "status">("details");

  // Role modification state
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [selectedDeptId, setSelectedDeptId] = useState(user.department?._id || "");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);

  // Status toggle state
  const [targetStatus, setTargetStatus] = useState(!user.isActive);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);

  // Alert feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const getRoleBadge = (r: string) => {
    switch (r) {
      case "admin":
        return (
          <Chip color="danger" variant="soft" size="sm" className="font-semibold text-[10px]">
            <ShieldAlert className="h-3 w-3 mr-1 inline" /> Administrator
          </Chip>
        );
      case "department_manager":
        return (
          <Chip color="accent" variant="soft" size="sm" className="font-semibold text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-1 inline" /> Dept. Manager
          </Chip>
        );
      case "maintenance_staff":
        return (
          <Chip color="warning" variant="soft" size="sm" className="font-semibold text-[10px]">
            <Wrench className="h-3 w-3 mr-1 inline" /> Field Technician
          </Chip>
        );
      case "citizen":
      default:
        return (
          <Chip color="default" variant="soft" size="sm" className="font-semibold text-[10px]">
            <User className="h-3 w-3 mr-1 inline" /> Citizen
          </Chip>
        );
    }
  };

  // Execute Role Update
  const handleExecuteRoleUpdate = async () => {
    if (!token) return;

    if (
      ["department_manager", "maintenance_staff"].includes(selectedRole) &&
      !selectedDeptId
    ) {
      setFeedback({
        type: "error",
        message: `A department must be assigned for ${selectedRole.replace("_", " ")}.`,
      });
      setRoleConfirmOpen(false);
      return;
    }

    setIsUpdatingRole(true);
    setFeedback(null);

    try {
      const res = await updateUserRoleByAdmin(
        token,
        user._id,
        selectedRole,
        selectedDeptId || null
      );
      setFeedback({ type: "success", message: res.message });
      setRoleConfirmOpen(false);
      onSuccess(res.user, res.message);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update user role.",
      });
      setRoleConfirmOpen(false);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Execute Status Toggle
  const handleExecuteStatusUpdate = async () => {
    if (!token) return;

    setIsUpdatingStatus(true);
    setFeedback(null);

    try {
      const res = await updateUserStatusByAdmin(token, user._id, targetStatus);
      setFeedback({ type: "success", message: res.message });
      setStatusConfirmOpen(false);
      onSuccess(res.user, res.message);
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update account status.",
      });
      setStatusConfirmOpen(false);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface text-foreground shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-border flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent font-bold text-base shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-foreground">{user.name}</h3>
                {getRoleBadge(user.role)}
                <Chip
                  color={user.isActive ? "success" : "danger"}
                  variant="soft"
                  size="sm"
                  className="text-[10px]"
                >
                  {user.isActive ? "Active Account" : "Suspended"}
                </Chip>
              </div>
              <p className="text-xs text-muted mt-0.5">{user.email}</p>
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

        {/* Tab Strip */}
        <div className="px-6 flex items-center gap-2 border-b border-border bg-surface-secondary/20 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab("details");
              setRoleConfirmOpen(false);
              setStatusConfirmOpen(false);
            }}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "details"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <IdCard className="h-4 w-4" /> User Details
          </button>

          <button
            onClick={() => {
              setActiveTab("role");
              setRoleConfirmOpen(false);
              setStatusConfirmOpen(false);
            }}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "role"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <UserCog className="h-4 w-4" /> Change Role & Dept
          </button>

          <button
            onClick={() => {
              setActiveTab("status");
              setRoleConfirmOpen(false);
              setStatusConfirmOpen(false);
            }}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "status"
                ? "border-accent text-accent font-bold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Power className="h-4 w-4" /> Account Status
          </button>
        </div>

        {/* Modal Body */}
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

          {/* TAB 1: DETAILS */}
          {activeTab === "details" && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <User className="h-3 w-3 text-accent" /> Full Name
                  </span>
                  <div className="font-semibold text-foreground text-sm">{user.name}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Mail className="h-3 w-3 text-accent" /> Email Address
                  </span>
                  <div className="font-semibold text-foreground truncate">{user.email}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Shield className="h-3 w-3 text-accent" /> System Role
                  </span>
                  <div className="capitalize font-semibold text-foreground">
                    {user.role.replace("_", " ")}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Building className="h-3 w-3 text-accent" /> Assigned Department
                  </span>
                  <div className="font-semibold text-foreground">
                    {user.department?.name ? (
                      <span>
                        {user.department.name}{" "}
                        <span className="text-[10px] font-mono text-muted">
                          ({user.department.code})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted">Unassigned / None</span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Phone className="h-3 w-3 text-accent" /> Contact Phone
                  </span>
                  <div className="font-semibold text-foreground">
                    {user.phone || <span className="text-muted">Not provided</span>}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/20 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3 text-accent" /> Registration Date
                  </span>
                  <div className="font-semibold text-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-surface-secondary/15 flex items-center justify-between text-[11px]">
                <span className="text-muted font-mono">User ID: {user._id}</span>
                <span className="text-muted">
                  Account Status:{" "}
                  <strong className={user.isActive ? "text-success" : "text-danger"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: CHANGE ROLE */}
          {activeTab === "role" && (
            <div className="space-y-4 text-xs">
              {isSelf && (
                <Alert className="border border-warning/40 bg-warning/10 text-warning rounded-xl p-3 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    You are logged in as this administrator. You cannot revoke your own administrator permissions.
                  </span>
                </Alert>
              )}

              <div className="space-y-2">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-accent" /> Select New Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    const newRole = e.target.value as AdminUserRecord["role"];
                    setSelectedRole(newRole);
                    if (newRole === "citizen" || newRole === "admin") {
                      setSelectedDeptId("");
                    }
                  }}
                  disabled={isSelf || isUpdatingRole}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary/30 text-foreground text-xs focus:outline-hidden focus:border-accent"
                >
                  <option value="citizen">Citizen (Standard Reporter)</option>
                  <option value="maintenance_staff">
                    Maintenance Staff (Field Technician)
                  </option>
                  <option value="department_manager">Department Manager</option>
                  <option value="admin">Administrator (Executive City Access)</option>
                </select>
              </div>

              {/* Department assignment required for staff & managers */}
              {["department_manager", "maintenance_staff"].includes(selectedRole) && (
                <div className="space-y-2 animate-in fade-in">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-accent" /> Assign Municipal Department *
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    disabled={isSelf || isUpdatingRole}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary/30 text-foreground text-xs focus:outline-hidden focus:border-accent"
                  >
                    <option value="">-- Choose Assigned Department --</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted block">
                    Maintenance staff and managers must be bound to a municipal division.
                  </span>
                </div>
              )}

              {/* Confirmation Step */}
              {roleConfirmOpen ? (
                <div className="p-4 rounded-xl border border-warning/40 bg-warning/10 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-xs block">
                        Confirm Role Elevation / Reassignment
                      </span>
                      <p className="text-[11px] text-muted">
                        Are you sure you want to change <strong>{user.name}</strong> from{" "}
                        <strong className="capitalize">{user.role.replace("_", " ")}</strong> to{" "}
                        <strong className="capitalize text-accent">
                          {selectedRole.replace("_", " ")}
                        </strong>
                        ?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setRoleConfirmOpen(false)}
                      isDisabled={isUpdatingRole}
                      className="cursor-pointer text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onPress={handleExecuteRoleUpdate}
                      isDisabled={isUpdatingRole}
                      className="cursor-pointer text-xs font-semibold gap-1.5"
                    >
                      {isUpdatingRole ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Yes, Update Role
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => setRoleConfirmOpen(true)}
                    isDisabled={
                      isSelf ||
                      isUpdatingRole ||
                      (selectedRole === user.role &&
                        (selectedDeptId || "") === (user.department?._id || ""))
                    }
                    className="cursor-pointer text-xs font-semibold gap-1.5"
                  >
                    Save Role Changes
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ACCOUNT STATUS */}
          {activeTab === "status" && (
            <div className="space-y-5 text-xs">
              {isSelf && (
                <Alert className="border border-warning/40 bg-warning/10 text-warning rounded-xl p-3 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    You cannot deactivate your own active administrator account.
                  </span>
                </Alert>
              )}

              <div className="p-4 rounded-xl border border-border bg-surface-secondary/20 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-foreground block">
                    Current Account Status:{" "}
                    <span className={user.isActive ? "text-success" : "text-danger"}>
                      {user.isActive ? "Active" : "Deactivated"}
                    </span>
                  </span>
                  <p className="text-[11px] text-muted">
                    {user.isActive
                      ? "The user can currently authenticate and submit or manage tasks."
                      : "The user is currently locked out of the civic management system."}
                  </p>
                </div>

                <Button
                  variant={user.isActive ? "danger" : "primary"}
                  size="sm"
                  onPress={() => {
                    setTargetStatus(!user.isActive);
                    setStatusConfirmOpen(true);
                  }}
                  isDisabled={isSelf || isUpdatingStatus}
                  className="cursor-pointer text-xs font-semibold shrink-0"
                >
                  {user.isActive ? "Deactivate Account" : "Activate Account"}
                </Button>
              </div>

              {/* Status Confirmation Prompt */}
              {statusConfirmOpen && (
                <div className="p-4 rounded-xl border border-warning/40 bg-warning/10 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-foreground text-xs block">
                        Confirm Account {targetStatus ? "Activation" : "Deactivation"}
                      </span>
                      <p className="text-[11px] text-muted">
                        Are you sure you want to{" "}
                        <strong>{targetStatus ? "activate" : "deactivate"}</strong> the account of{" "}
                        <strong>{user.name}</strong> ({user.email})?
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => setStatusConfirmOpen(false)}
                      isDisabled={isUpdatingStatus}
                      className="cursor-pointer text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={targetStatus ? "primary" : "danger"}
                      size="sm"
                      onPress={handleExecuteStatusUpdate}
                      isDisabled={isUpdatingStatus}
                      className="cursor-pointer text-xs font-semibold gap-1.5"
                    >
                      {isUpdatingStatus ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm{" "}
                          {targetStatus ? "Activation" : "Deactivation"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
