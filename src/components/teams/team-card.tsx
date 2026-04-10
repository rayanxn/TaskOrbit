"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TeamWithMembers } from "@/lib/queries/teams";
import { deleteTeam } from "@/lib/actions/teams";
import { getInitials } from "@/lib/utils/format";
import { STATUS_ORDER, STATUS_CONFIG } from "@/lib/utils/statuses";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { TeamFormModal } from "@/components/teams/team-form-modal";

interface TeamCardProps {
  team: TeamWithMembers;
  workspaceSlug: string;
  canManageTeams: boolean;
}

export function TeamCard({
  team,
  workspaceSlug,
  canManageTeams,
}: TeamCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const totalIssues = Object.values(team.issueCounts).reduce((sum, count) => sum + count, 0);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteTeam(team.id);
    setDeleting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Team deleted");
    setDeleteOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-label={`Open ${team.name}`}
          onClick={() => router.push(`/${workspaceSlug}/teams/${team.id}`)}
          className="w-full cursor-pointer rounded-[22px] border border-border bg-surface p-5 text-left transition-colors hover:bg-surface-hover/60"
        >
          <div className="pr-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-text">{team.name}</h2>
                <p className="mt-1 text-xs font-mono text-text-muted">
                  {team.members.length} {team.members.length === 1 ? "member" : "members"}
                </p>
              </div>
              <span className="rounded-full bg-surface-hover px-2.5 py-1 text-[11px] font-mono text-text-muted">
                {team.activeIssueCount} active
              </span>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <div className="flex items-center">
                {team.members.slice(0, 5).map((member, index) => (
                  <Avatar
                    key={member.id}
                    size="sm"
                    className={index > 0 ? "-ml-2 border-2 border-surface" : "border-2 border-surface"}
                  >
                    <AvatarImage
                      src={member.profile.avatar_url ?? undefined}
                      alt={member.profile.full_name ?? member.profile.email}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(member.profile.full_name, member.profile.email)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {team.members.length > 5 && (
                  <div className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-hover text-[10px] font-mono text-text-muted">
                    +{team.members.length - 5}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex h-2 overflow-hidden rounded-full bg-surface-hover">
                {totalIssues === 0 ? (
                  <div className="h-full w-full bg-surface-hover" />
                ) : (
                  STATUS_ORDER.map((status) => {
                    const count = team.issueCounts[status];
                    if (count === 0) return null;

                    return (
                      <div
                        key={status}
                        className="h-full"
                        style={{
                          width: `${(count / totalIssues) * 100}%`,
                          backgroundColor: STATUS_CONFIG[status].color,
                        }}
                      />
                    );
                  })
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-mono text-text-muted">
                {STATUS_ORDER.map((status) => (
                  <span key={status} className="inline-flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: STATUS_CONFIG[status].color }}
                    />
                    <span>{team.issueCounts[status]}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </button>

        {canManageTeams && (
          <div className="absolute right-4 top-4 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Manage ${team.name}`}
                  className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4 text-text-muted" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <TeamFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        team={team}
      />

      <DeleteConfirmationModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete team?"
        description={`Projects linked to ${team.name} will be unassigned, but preserved.`}
        onConfirm={handleDelete}
        loading={deleting}
        confirmLabel="Delete Team"
      />
    </>
  );
}
