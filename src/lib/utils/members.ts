export type MemberWithUserId = {
  user_id: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
};

export function dedupeMembersByUserId<T extends MemberWithUserId>(members: T[]): T[] {
  const seen = new Set<string>();

  return members.filter((member) => {
    if (seen.has(member.user_id)) {
      return false;
    }

    seen.add(member.user_id);
    return true;
  });
}

export function dedupeMembersByDisplayLabel<T extends MemberWithUserId>(
  members: T[],
  preferredUserId?: string
): T[] {
  const byLabel = new Map<string, T>();

  for (const member of members) {
    const label = (member.profile?.full_name ?? member.profile?.email ?? "").trim().toLowerCase();
    if (!label) continue;

    const existing = byLabel.get(label);
    if (!existing) {
      byLabel.set(label, member);
      continue;
    }

    if (member.user_id === preferredUserId) {
      byLabel.set(label, member);
    }
  }

  return Array.from(byLabel.values());
}

export function sortMembersByDisplayName<T extends MemberWithUserId>(members: T[]): T[] {
  return [...members].sort((a, b) => {
    const aLabel = a.profile?.full_name ?? a.profile?.email ?? "";
    const bLabel = b.profile?.full_name ?? b.profile?.email ?? "";
    return aLabel.localeCompare(bLabel);
  });
}
