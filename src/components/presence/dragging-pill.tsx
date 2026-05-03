"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/format";
import { peerColor } from "@/lib/utils/peer-color";
import type { Peer } from "@/lib/hooks/use-presence-channel";

interface DraggingPillProps {
  peer: Peer;
}

export function DraggingPill({ peer }: DraggingPillProps) {
  const name =
    peer.profile.full_name?.trim() || peer.profile.email || "A teammate";
  const color = peerColor(peer.userId);

  return (
    <div
      data-testid="dragging-pill"
      aria-live="polite"
      className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text-secondary shadow-sm"
      style={{ borderColor: color }}
    >
      <Avatar className="h-3.5 w-3.5 text-[7px]">
        {peer.profile.avatar_url && (
          <AvatarImage src={peer.profile.avatar_url} alt={name} />
        )}
        <AvatarFallback className="text-[7px]">
          {getInitials(peer.profile.full_name)}
        </AvatarFallback>
      </Avatar>
      <span className="max-w-[120px] truncate">
        {peer.profile.full_name?.split(" ")[0] || "Teammate"} is moving this
      </span>
    </div>
  );
}
