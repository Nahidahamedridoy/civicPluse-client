"use client";

import React from "react";
import { Button, Card, Chip, Separator } from "@heroui/react";
import {
  X,
  MapPin,
  Calendar,
  Building,
  User,
  Clock,
  ImageIcon,
} from "lucide-react";
import { CitizenIssue, getStatusMeta, getPriorityMeta } from "@/lib/citizen-api";

interface IssueDetailsModalProps {
  issue: CitizenIssue | null;
  onClose: () => void;
}

export function IssueDetailsModal({ issue, onClose }: IssueDetailsModalProps) {
  if (!issue) return null;

  const statusMeta = getStatusMeta(issue.status);
  const priorityMeta = getPriorityMeta(issue.priority);

  const formattedDate = new Date(issue.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border bg-surface shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent">
                #{issue._id.slice(-6).toUpperCase()}
              </span>
              <Chip color={statusMeta.color} variant="soft" size="sm">
                {statusMeta.label}
              </Chip>
              <Chip color={priorityMeta.color} variant="secondary" size="sm">
                Priority: {priorityMeta.label}
              </Chip>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {issue.title}
            </h2>
          </div>

          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={onClose}
            aria-label="Close modal"
            className="cursor-pointer text-muted hover:text-foreground shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Separator />

        {/* Core Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Category */}
          <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1">
            <span className="text-muted block uppercase font-bold text-[10px] tracking-wider">
              Category
            </span>
            <span className="font-semibold text-foreground text-sm">
              {issue.category}
            </span>
          </div>

          {/* Department */}
          <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1">
            <span className="text-muted block uppercase font-bold text-[10px] tracking-wider">
              Assigned Department
            </span>
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm">
              <Building className="h-4 w-4 text-accent shrink-0" />
              <span>{issue.department?.name || "Pending Triage"}</span>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1">
            <span className="text-muted block uppercase font-bold text-[10px] tracking-wider">
              Incident Location
            </span>
            <div className="flex items-start gap-1.5 font-medium text-foreground">
              <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>
                {issue.location?.address || "Location coordinates on file"}
                {issue.location?.latitude && issue.location?.longitude && (
                  <span className="block text-[11px] text-muted font-mono mt-0.5">
                    ({issue.location.latitude.toFixed(4)}, {issue.location.longitude.toFixed(4)})
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Reported Date */}
          <div className="rounded-xl border border-border/80 bg-surface-secondary/40 p-3 space-y-1">
            <span className="text-muted block uppercase font-bold text-[10px] tracking-wider">
              Reported On
            </span>
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Calendar className="h-4 w-4 text-accent shrink-0" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Assigned Staff if exists */}
        {issue.assignedTo && (
          <div className="rounded-xl border border-border/80 bg-surface-secondary/30 p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold">
                <User className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-muted uppercase font-bold block">
                  Assigned Maintenance Crew
                </span>
                <span className="font-semibold text-foreground">
                  {issue.assignedTo.name}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-muted flex items-center gap-1">
              <Clock className="h-3 w-3" /> Field Inspection Active
            </span>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-xs uppercase font-bold text-muted tracking-wider">
            Issue Description
          </h3>
          <div className="rounded-xl border border-border/80 bg-surface-secondary/30 p-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {issue.description}
          </div>
        </div>

        {/* Attached Photos (if any) */}
        {issue.images && issue.images.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold text-muted tracking-wider flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Photo Evidence ({issue.images.length})</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {issue.images.map((imgUrl, i) => (
                <a
                  key={i}
                  href={imgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-video rounded-xl overflow-hidden border border-border bg-surface-secondary"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={`Evidence ${i + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted">
            Tracked in CivicPulse Municipal Ledger
          </span>
          <Button variant="outline" size="sm" onPress={onClose} className="cursor-pointer">
            Close Details
          </Button>
        </div>
      </Card>
    </div>
  );
}
