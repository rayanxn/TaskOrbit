"use client";

import { useState } from "react";
import { Check, Mail, X } from "lucide-react";
import { toast } from "sonner";

import {
  acceptInvitation as acceptInvitationAction,
  declineInvitation as declineInvitationAction,
} from "@/actions/members";
import type { BoardInvitationWithDetails } from "@/types";
import { Button } from "@/components/ui/button";

interface PendingInvitationsBannerProps {
  invitations: BoardInvitationWithDetails[];
}

export default function PendingInvitationsBanner({
  invitations: initialInvitations,
}: PendingInvitationsBannerProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (invitations.length === 0) {
    return null;
  }

  const handleAccept = async (invitationId: string) => {
    setLoadingId(invitationId);

    try {
      await acceptInvitationAction(invitationId);
      setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
      toast.success("Invitation accepted. The board is now available.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setLoadingId(invitationId);

    try {
      await declineInvitationAction(invitationId);
      setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
      toast.success("Invitation declined.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to decline invitation.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="mb-5 space-y-3">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex flex-col gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/80 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-white p-2 text-sky-700 ring-1 ring-sky-200">
              <Mail className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">
                You&apos;ve been invited to &ldquo;{invitation.boards.title}&rdquo;
              </p>
              <p className="text-xs text-slate-600">
                Invited by {invitation.profiles.full_name ?? invitation.profiles.email} as{" "}
                {invitation.role}
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loadingId === invitation.id}
              onClick={() => void handleDecline(invitation.id)}
            >
              <X className="size-3.5" />
              Decline
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={loadingId === invitation.id}
              onClick={() => void handleAccept(invitation.id)}
            >
              <Check className="size-3.5" />
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
