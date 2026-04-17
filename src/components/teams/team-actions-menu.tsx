"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { renameTeam, deleteTeam } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TeamActionsMenuProps {
  teamId: string;
  teamName: string;
  afterDeleteHref?: string;
  className?: string;
}

export function TeamActionsMenu({
  teamId,
  teamName,
  afterDeleteHref,
  className,
}: TeamActionsMenuProps) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(teamName);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(teamName);
  }, [teamName]);

  async function handleRename(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await renameTeam(teamId, name);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setLoading(false);
    setRenameOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleteLoading(true);
    const result = await deleteTeam(teamId);
    setDeleteLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setDeleteOpen(false);
    if (afterDeleteHref) {
      router.push(afterDeleteHref);
      return;
    }

    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Manage ${teamName}`}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              setRenameOpen(true);
            }}
          >
            <Pencil className="mr-2 size-4 text-text-muted" />
            Rename team
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.stopPropagation();
              setDeleteOpen(true);
            }}
            className="text-danger focus:text-danger"
          >
            <Trash2 className="mr-2 size-4" />
            Delete team
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Rename Team</DialogTitle>
            <DialogDescription>
              Update the team name without changing project ownership or roster membership.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRename} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor={`rename-team-${teamId}`}>Team name</Label>
              <Input
                id={`rename-team-${teamId}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                required
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete team?"
        description={`This will remove "${teamName}" and unlink any projects currently assigned to it.`}
        onConfirm={handleDelete}
        loading={deleteLoading}
        confirmLabel="Delete team"
      />
    </>
  );
}
