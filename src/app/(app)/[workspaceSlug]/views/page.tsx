import { redirect } from "next/navigation";

export default async function ViewsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  redirect(`/${workspaceSlug}/dashboard`);
}
