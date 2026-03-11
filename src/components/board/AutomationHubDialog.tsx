"use client";

import { Bot, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AutomationHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AUTOMATION_RECIPES = [
  {
    title: "Due date reminders",
    description: "Notify members when a card is approaching its due date.",
    icon: Bot,
  },
  {
    title: "List-entry rules",
    description: "Set defaults when a card lands in a specific list.",
    icon: Zap,
  },
  {
    title: "Recurring workflows",
    description: "Create cards or checklists on a repeating cadence.",
    icon: Sparkles,
  },
];

export default function AutomationHubDialog({
  open,
  onOpenChange,
}: AutomationHubDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Automation</DialogTitle>
          <DialogDescription>
            Recipe ideas are staged here while the rules engine is still being built.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {AUTOMATION_RECIPES.map((recipe) => {
            const Icon = recipe.icon;

            return (
              <div
                key={recipe.title}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="size-4 text-sky-700" />
                      <p className="text-sm font-semibold text-slate-900">{recipe.title}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{recipe.description}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toast("Automation execution lands after the rules engine phase.")}
                  >
                    Preview
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
