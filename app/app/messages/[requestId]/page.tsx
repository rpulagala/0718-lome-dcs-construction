import { notFound } from "next/navigation";
import { requirePortalUser } from "@/lib/portal/session";
import { env } from "@/lib/env";
import { getPortalThread, markPortalThreadRead } from "@/lib/services/messaging";
import { MessageThread } from "@/components/portal/MessageThread";

export default async function PortalThreadPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const session = await requirePortalUser();
  const { requestId } = await params;

  // Opening the thread marks any staff replies as read.
  await markPortalThreadRead(session.sub, requestId);
  const thread = await getPortalThread(session.sub, requestId);
  if (!thread) notFound();

  return (
    <MessageThread
      requestId={thread.requestId}
      title={thread.title}
      requestNumber={thread.requestNumber}
      messages={thread.messages}
      maxPhotos={env.MAX_UPLOAD_FILES}
      maxMb={env.MAX_UPLOAD_MB}
    />
  );
}
