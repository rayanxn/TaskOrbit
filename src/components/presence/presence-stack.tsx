"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";
import { peerColor } from "@/lib/utils/peer-color";
import type { Peer } from "@/lib/hooks/use-presence-channel";
import { cn } from "@/lib/utils/cn";

interface PresenceStackProps {
  peers: Peer[];
  max?: number;
  className?: string;
}

export function PresenceStack({
  peers,
  max = 4,
  className,
}: PresenceStackProps) {
  if (peers.length === 0) return null;

  const visible = peers.slice(0, max);
  const overflow = peers.length - visible.length;

  return (
    <div
      data-testid="presence-stack"
      className={cn("flex items-center -space-x-2", className)}
      aria-label={`${peers.length} ${peers.length === 1 ? "person is" : "people are"} viewing this project`}
    >
      {visible.map((peer) => {
        const name = peer.profile.full_name?.trim() || peer.profile.email || "Teammate";
        const tooltip = peer.focusedIssueId
          ? `${name} • viewing an issue`
          : `${name} • on the ${peer.view}`;
        return (
          <Avatar
            key={peer.userId}
            size="sm"
            className="ring-2 ring-surface"
            style={{ boxShadow: `0 0 0 2px ${peerColor(peer.userId)}` }}
            title={tooltip}
            aria-label={tooltip}
          >
            {peer.profile.avatar_url && (
              <AvatarImage
                src={peer.profile.avatar_url}
                alt={name}
              />
            )}
            <AvatarFallback>{getInitials(peer.profile.full_name)}</AvatarFallback>
          </Avatar>
        );
      })}
      {overflow > 0 && (
        <span
          className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-[10px] font-medium text-text-secondary ring-2 ring-surface"
          title={`+${overflow} more`}
          aria-label={`${overflow} more viewers`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
