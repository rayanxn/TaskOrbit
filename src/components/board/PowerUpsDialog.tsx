"use client";

import { Blocks, Calendar, FileSpreadsheet, Github } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PowerUpsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const POWER_UPS = [
  {
    title: "Calendar",
    description: "Overlay cards with due dates on richer scheduling surfaces.",
    icon: Calendar,
  },
  {
    title: "GitHub",
    description: "Link cards to pull requests, issues, and deployment references.",
    icon: Github,
  },
  {
    title: "Sheets export",
    description: "Mirror board data into structured reporting tables.",
    icon: FileSpreadsheet,
  },
];

export default function PowerUpsDialog({ open, onOpenChange }: PowerUpsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Power-Ups</DialogTitle>
          <DialogDescription>
            Integration slots are in place here for external workflows and richer board context.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {POWER_UPS.map((powerUp) => {
            const Icon = powerUp.icon;

            return (
              <div
                key={powerUp.title}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-sky-700" />
                      <p className="text-sm font-semibold text-slate-900">{powerUp.title}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{powerUp.description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toast("Power-Up activation lands after the integration phase.")}
                  >
                    <Blocks className="size-4" />
                    Open
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
