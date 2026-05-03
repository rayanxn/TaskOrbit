"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";
import { peerColor } from "@/lib/utils/peer-color";
import type { Peer } from "@/lib/hooks/use-presence-channel";
import { cn } from "@/lib/utils/cn";

interface WatcherDotsProps {
  peers: Peer[];
  max?: number;
  className?: string;
}

export function WatcherDots({ peers, max = 2, className }: WatcherDotsProps) {
  if (peers.length === 0) return null;
  const visible = peers.slice(0, max);
  const overflow = peers.length - visible.length;

  return (
    <div
      data-testid="watcher-dots"
      className={cn("flex items-center -space-x-1", className)}
      aria-label={`${peers.length} ${peers.length === 1 ? "person" : "people"} viewing`}
    >
      {visible.map((peer) => {
        const name =
          peer.profile.full_name?.trim() || peer.profile.email || "Teammate";
        return (
          <Avatar
            key={peer.userId}
            className="h-4 w-4 text-[8px]"
            style={{ boxShadow: `0 0 0 1.5px ${peerColor(peer.userId)}` }}
            title={`${name} is viewing this`}
          >
            {peer.profile.avatar_url && (
              <AvatarImage src={peer.profile.avatar_url} alt={name} />
            )}
            <AvatarFallback className="text-[8px]">
              {getInitials(peer.profile.full_name)}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {overflow > 0 && (
        <span
          className="relative inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-surface-hover px-1 text-[8px] font-medium text-text-secondary ring-1 ring-surface"
          title={`+${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
