import {
  acceptsBackupRequest,
  backupFailure,
  downloadNoteBackup,
  inspectNoteBackup,
} from "@/lib/notes/backup-server";

export async function GET() {
  try {
    const file = await downloadNoteBackup();
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="amu-note-backup-${new Date().toISOString().slice(0, 10)}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return backupFailure(error, "exportFailed");
  }
}

export async function POST(request: Request) {
  if (!acceptsBackupRequest(request))
    return Response.json({ code: "invalid" }, { status: 403 });
  try {
    return Response.json(await inspectNoteBackup(request), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return backupFailure(error, "invalid");
  }
}
