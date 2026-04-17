import { redirect } from "next/navigation";

export default async function ViewDetailPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; viewId: string }>;
}) {
  const { workspaceSlug } = await params;
  redirect(`/${workspaceSlug}/dashboard`);
}
