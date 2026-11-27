"use client";

import React, { useState } from "react";
import { Alert, Button } from "@heroui/react";
import {
  AlertCircle,
  Building,
  CheckCircle2,
  Code2,
  FileText,
  Loader2,
  Power,
  X,
} from "lucide-react";
import {
  AdminDepartment,
  createDepartmentByAdmin,
  updateDepartmentByAdmin,
} from "@/lib/admin-api";

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department?: AdminDepartment | null;
  token: string;
  onSuccess: (savedDept: AdminDepartment, message: string) => void;
}

export function DepartmentModal({
  isOpen,
  onClose,
  department,
  token,
  onSuccess,
}: DepartmentModalProps) {
  if (!isOpen) return null;

  return (
    <DepartmentModalContent
      department={department}
      onClose={onClose}
      token={token}
      onSuccess={onSuccess}
    />
  );
}

function DepartmentModalContent({
  department,
  onClose,
  token,
  onSuccess,
}: {
  department?: AdminDepartment | null;
  onClose: () => void;
  token: string;
  onSuccess: (savedDept: AdminDepartment, message: string) => void;
}) {
  const isEditing = Boolean(department);

  const [name, setName] = useState(department?.name || "");
  const [code, setCode] = useState(department?.code || "");
  const [description, setDescription] = useState(department?.description || "");
  const [isActive, setIsActive] = useState<boolean>(
    department ? department.isActive : true
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!name.trim()) {
      setErrorMessage("Department name is required.");
      return;
    }

    if (!code.trim()) {
      setErrorMessage("Department code is required (e.g. RDS, ELEC, SAN).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditing && department) {
        const res = await updateDepartmentByAdmin(token, department._id, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          isActive,
        });
        onSuccess(res.department, res.message);
        onClose();
      } else {
        const res = await createDepartmentByAdmin(token, {
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
        });
        onSuccess(res.department, res.message);
        onClose();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save department details."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border bg-surface text-foreground shadow-2xl p-6 sm:p-7 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {isEditing ? "Edit Department" : "Create New Department"}
              </h3>
              <p className="text-xs text-muted">
                {isEditing
                  ? `Update configuration for #${department?.code}`
                  : "Register a new municipal division"}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={onClose}
            aria-label="Close modal"
            className="cursor-pointer text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <Alert className="border border-danger/40 bg-danger/10 text-danger rounded-xl p-3 flex items-start gap-2.5 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5 text-accent" /> Department Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Roads & Infrastructure"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary/30 text-foreground text-xs focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-accent" /> Department Code *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. RDS, ELEC, SAN, WAT"
              maxLength={20}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary/30 text-foreground font-mono text-xs uppercase focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <span className="text-[10px] text-muted block">
              Unique uppercase identifier (alphanumeric, hyphens or underscores).
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-accent" /> Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of responsibilities and municipal jurisdiction..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface-secondary/30 text-foreground text-xs resize-none focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {isEditing && (
            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Power className="h-4 w-4 text-muted" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground">
                    Department Status
                  </span>
                  <span className="text-[10px] text-muted">
                    Active departments accept issue assignments
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  isActive ? "bg-accent" : "bg-muted/40"
                }`}
                role="switch"
                aria-checked={isActive}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onPress={onClose}
              isDisabled={isSubmitting}
              className="cursor-pointer text-xs"
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              size="sm"
              type="submit"
              isDisabled={isSubmitting}
              className="cursor-pointer text-xs font-semibold gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isEditing ? "Save Changes" : "Create Department"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
