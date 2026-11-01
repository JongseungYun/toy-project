import {
  acceptsBackupRequest,
  backupFailure,
  restoreNoteBackup,
} from "@/lib/notes/backup-server";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  if (!acceptsBackupRequest(request))
    return Response.json({ code: "invalid" }, { status: 403 });
  try {
    const result = await restoreNoteBackup(request);
    revalidatePath("/", "layout");
    return Response.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return backupFailure(error, "restoreFailed");
  }
}
