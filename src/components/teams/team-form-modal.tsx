"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWorkspace } from "@/providers/workspace-provider";
import { createTeam, updateTeam } from "@/lib/actions/teams";
import type { WorkspaceMember } from "@/lib/queries/members";
import type { IssueStatusCounts, TeamMemberWithProfile, TeamWithMembers } from "@/lib/queries/teams";
import type { Tables } from "@/lib/types";
import { getInitials } from "@/lib/utils/format";
import { sortMembersByDisplayName } from "@/lib/utils/members";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  team?: TeamWithMembers;
  workspaceMembers?: WorkspaceMember[];
  onSuccess?: (payload: {
    team: Tables<"teams">;
    members: TeamMemberWithProfile[];
  }) => void;
}

function emptyIssueCounts(): IssueStatusCounts {
  return {
    todo: 0,
    in_progress: 0,
    in_review: 0,
    done: 0,
  };
}

export function TeamFormModal({
  open,
  onOpenChange,
  mode,
  team,
  workspaceMembers = [],
  onSuccess,
}: TeamFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <TeamFormModalContent
          key={`${mode}-${team?.id ?? "create"}`}
          onOpenChange={onOpenChange}
          mode={mode}
          team={team}
          workspaceMembers={workspaceMembers}
          onSuccess={onSuccess}
        />
      ) : null}
    </Dialog>
  );
}

function TeamFormModalContent({
  onOpenChange,
  mode,
  team,
  workspaceMembers = [],
  onSuccess,
}: Omit<TeamFormModalProps, "open">) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [name, setName] = useState(team?.name ?? "");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    if (mode !== "create") return [];

    const query = memberQuery.trim().toLowerCase();
    if (!query) return workspaceMembers;

    return workspaceMembers.filter((member) => {
      const nameMatch = member.profile.full_name?.toLowerCase().includes(query);
      const emailMatch = member.profile.email.toLowerCase().includes(query);
      return nameMatch || emailMatch;
    });
  }, [memberQuery, mode, workspaceMembers]);

  const selectedMembers = workspaceMembers.filter((member) =>
    selectedMemberIds.includes(member.user_id)
  );

  function toggleMember(userId: string) {
    setSelectedMemberIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name.trim());

    const result =
      mode === "create"
        ? await (() => {
            formData.set("workspaceId", workspace.id);
            formData.set("memberIds", selectedMemberIds.join(","));
            return createTeam(formData);
          })()
        : await updateTeam(team!.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!result.data) {
      setError("Team update failed");
      setLoading(false);
      return;
    }

    const nextMembers =
      mode === "create"
        ? sortMembersByDisplayName(
            workspaceMembers
              .filter((member) => selectedMemberIds.includes(member.user_id))
              .map((member) => ({
                id: `${result.data.id}:${member.user_id}`,
                user_id: member.user_id,
                profile: member.profile,
                issueCounts: emptyIssueCounts(),
                activeTaskCount: 0,
              }))
          )
        : (team?.members ?? []);

    onSuccess?.({
      team: result.data,
      members: nextMembers,
    });
    toast.success(mode === "create" ? "Team created" : "Team updated");
    setLoading(false);
    onOpenChange(false);
    router.refresh();
  }

  const title = mode === "create" ? "Create Team" : "Edit Team";

  return (
    <DialogContent className="sm:max-w-[560px]">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Platform"
              autoFocus
              required
            />
          </div>

          {mode === "create" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="team-members">Initial Members</Label>
                <Input
                  id="team-members"
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder="Search workspace members..."
                />
              </div>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedMembers.map((member) => (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => toggleMember(member.user_id)}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-hover px-2.5 py-1 text-xs font-medium text-text transition-colors hover:bg-surface"
                    >
                      <span>{member.profile.full_name ?? member.profile.email}</span>
                      <span className="text-text-muted">&times;</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-64 overflow-y-auto rounded-xl border border-border bg-surface">
                {filteredMembers.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-text-muted">
                    No members match that search.
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {filteredMembers.map((member) => {
                      const selected = selectedMemberIds.includes(member.user_id);

                      return (
                        <button
                          key={member.user_id}
                          type="button"
                          onClick={() => toggleMember(member.user_id)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                            selected ? "bg-surface-hover" : "hover:bg-surface-hover/70"
                          }`}
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
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                              selected
                                ? "border-primary bg-primary text-background"
                                : "border-border text-transparent"
                            }`}
                          >
                            ✓
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create Team"
                : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
