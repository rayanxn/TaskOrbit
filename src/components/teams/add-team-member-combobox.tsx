"use client";

import { useMemo, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Plus } from "lucide-react";
import type { WorkspaceMember } from "@/lib/queries/members";
import { getInitials } from "@/lib/utils/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddTeamMemberComboboxProps {
  members: WorkspaceMember[];
  disabled?: boolean;
  onSelect: (userId: string) => Promise<void> | void;
}

export function AddTeamMemberCombobox({
  members,
  disabled = false,
  onSelect,
}: AddTeamMemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filteredMembers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return members;

    return members.filter((member) => {
      const nameMatch = member.profile.full_name?.toLowerCase().includes(trimmed);
      const emailMatch = member.profile.email.toLowerCase().includes(trimmed);
      return nameMatch || emailMatch;
    });
  }, [members, query]);

  async function handleSelect(userId: string) {
    await onSelect(userId);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery("");
        }
      }}
    >
      <Popover.Trigger asChild>
        <Button variant="secondary" disabled={disabled || members.length === 0}>
          <Plus className="h-4 w-4" />
          Add member
          <ChevronDown className="h-4 w-4" />
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={8}
          className="z-50 w-[320px] rounded-xl border border-border bg-surface p-3 shadow-xl"
        >
          <div className="space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workspace members..."
            />

            <div className="max-h-72 overflow-y-auto rounded-lg border border-border-subtle">
              {filteredMembers.length === 0 ? (
                <div className="px-3 py-5 text-sm text-text-muted">
                  No members available.
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {filteredMembers.map((member) => (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => handleSelect(member.user_id)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                    >
                      <Avatar size="sm">
                        <AvatarImage
                          src={member.profile.avatar_url ?? undefined}
                          alt={member.profile.full_name ?? member.profile.email}
                        />
                        <AvatarFallback>
                          {getInitials(
                            member.profile.full_name,
                            member.profile.email
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text">
                          {member.profile.full_name ?? member.profile.email}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          {member.profile.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
