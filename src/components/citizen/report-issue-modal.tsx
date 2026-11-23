"use client";

import React from "react";
import Link from "next/link";
import { Button, Card, Chip, Separator } from "@heroui/react";
import {
  X,
  AlertTriangle,
  Compass,
  FileSpreadsheet,
  Construction,
  CheckCircle2,
} from "lucide-react";

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReports: () => void;
}

export function ReportIssueModal({ isOpen, onClose, onViewReports }: ReportIssueModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
    >
      <Card className="relative w-full max-w-lg border border-border bg-surface shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                <Construction className="h-4 w-4" />
              </div>
              <Chip color="accent" variant="soft" size="sm">
                Incident Intake
              </Chip>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Report an Infrastructure Issue
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

        {/* Informative Guidance */}
        <div className="space-y-4 text-xs text-muted leading-relaxed">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span>Full Incident Submission Engine</span>
            </div>
            <p>
              The full multi-step incident creation form with live camera upload, GPS geocoding,
              and duplicate detector is being connected in the next platform release.
            </p>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-foreground block">
              In the meantime, you can:
            </span>
            <ul className="space-y-2 pl-1">
              <li className="flex items-start gap-2">
                <Compass className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Browse the{" "}
                  <Link
                    href="/#categories"
                    onClick={onClose}
                    className="text-accent font-medium hover:underline"
                  >
                    Infrastructure Categories Catalog
                  </Link>{" "}
                  to check response turnaround times and SLAs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <FileSpreadsheet className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Track your current reports and updates right from this dashboard.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <span>
                  For urgent public safety hazards (live electrical wires, open sinkholes), contact
                  the municipal emergency dispatch center directly.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onPress={() => {
              onClose();
              onViewReports();
            }}
            className="cursor-pointer"
          >
            View Existing Reports
          </Button>
          <Button
            variant="primary"
            size="sm"
            fullWidth
            onPress={onClose}
            className="cursor-pointer"
          >
            Got It
          </Button>
        </div>
      </Card>
    </div>
  );
}
