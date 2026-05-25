/**
 * Generic per-estate Google Drive client + sync (Branscombe / Seafields).
 *
 * Parameterised version of lib/hemp-homes/drive.ts. The key difference: ONE
 * shared OAuth callback for all estates — `/api/admin/estates/drive/callback` —
 * with the estate carried in the OAuth `state` param, so only a single redirect
 * URI needs registering in Google Cloud.
 *
 * Required env (already present for the Hemp Homes Drive sync):
 *   - GOOGLE_CLIENT_ID
 *   - GOOGLE_CLIENT_SECRET
 *   - NEXT_PUBLIC_CANONICAL_URL
 *
 * Redirect URI to register in Google Cloud Console:
 *   <NEXT_PUBLIC_CANONICAL_URL>/api/admin/estates/drive/callback
 */

import { google, type drive_v3 } from "googleapis";
import { createSupabaseService } from "@/lib/supabase-service";

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const ALLOWED_DRIVE_MIME: Record<string, { kind: "image" | "video"; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/gif": { kind: "image", ext: "gif" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/quicktime": { kind: "video", ext: "mov" },
};

const FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_FILES_PER_RUN = 50;
const MAX_BYTES = 500 * 1024 * 1024;
const MAX_RECURSION_DEPTH = 3;

export function getEstateRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_CANONICAL_URL?.replace(/\/$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_CANONICAL_URL is not set — required for Drive OAuth redirect");
  return `${base}/api/admin/estates/drive/callback`;
}

export function getEstateOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  return new google.auth.OAuth2(clientId, clientSecret, getEstateRedirectUri());
}

export function generateAuthUrl(state: string): string {
  return getEstateOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: DRIVE_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await getEstateOAuthClient().getToken(code);
  return tokens;
}

interface StoredTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string | null;
  token_type?: string | null;
}
export function encodeTokens(tokens: StoredTokens): string {
  return Buffer.from(JSON.stringify(tokens), "utf-8").toString("base64");
}
export function decodeTokens(encoded: string): StoredTokens {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8")) as StoredTokens;
}

export interface DriveSyncResult {
  files_seen: number;
  files_new: number;
  files_skipped: number;
  files_oversize: number;
  files_unsupported: number;
  errors: { file: string; reason: string }[];
  message: string;
}

interface EnumeratedFile {
  id: string;
  name: string;
  displayName: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
  size: number | null;
}

export async function syncEstateDrive(opts: {
  estate: string;
  mediaTable: string;
  bucket: string;
}): Promise<DriveSyncResult> {
  const { estate, mediaTable, bucket } = opts;
  const result: DriveSyncResult = {
    files_seen: 0, files_new: 0, files_skipped: 0, files_oversize: 0, files_unsupported: 0,
    errors: [], message: "",
  };

  const supabase = createSupabaseService();
  const { data: conn, error: connErr } = await (supabase.from("estate_drive_connections") as any)
    .select("encrypted_tokens, folder_id, paused")
    .eq("estate", estate)
    .maybeSingle();

  if (connErr || !conn) {
    result.message = "Drive connection row missing for this estate.";
    return result;
  }
  if (conn.paused) {
    result.message = "Sync is paused.";
    return result;
  }
  if (!conn.encrypted_tokens) {
    result.message = "Drive not connected yet — click Connect Drive to authorise.";
    return result;
  }
  if (!conn.folder_id) {
    result.message = "No Drive folder set — paste the folder ID and save it first.";
    return result;
  }

  let tokens: StoredTokens;
  try {
    tokens = decodeTokens(conn.encrypted_tokens);
  } catch (e) {
    result.errors.push({ file: "(connection)", reason: `Could not decode tokens: ${(e as Error).message}` });
    return result;
  }

  const oauth = getEstateOAuthClient();
  oauth.setCredentials(tokens as Parameters<typeof oauth.setCredentials>[0]);
  const drive = google.drive({ version: "v3", auth: oauth });

  const allFiles = await enumerateFolderRecursive(drive, conn.folder_id, MAX_RECURSION_DEPTH, "");
  result.files_seen = allFiles.length;

  const { data: existingRows } = await (supabase.from(mediaTable) as any)
    .select("drive_file_id")
    .not("drive_file_id", "is", null);
  const seenIds = new Set(
    (existingRows ?? [])
      .map((r: { drive_file_id: string | null }) => r.drive_file_id)
      .filter((x: string | null): x is string => !!x),
  );

  let processed = 0;
  for (const f of allFiles) {
    if (processed >= MAX_FILES_PER_RUN) {
      result.errors.push({ file: "(cap)", reason: `Hit cap of ${MAX_FILES_PER_RUN}; remaining files sync next run.` });
      break;
    }
    if (seenIds.has(f.id)) { result.files_skipped++; continue; }
    const spec = ALLOWED_DRIVE_MIME[f.mimeType];
    if (!spec) { result.files_unsupported++; continue; }
    if (f.size != null && f.size > MAX_BYTES) {
      result.files_oversize++;
      result.errors.push({ file: f.displayName, reason: `${(f.size / 1024 / 1024).toFixed(1)} MB exceeds the ${MAX_BYTES / 1024 / 1024} MB cap` });
      continue;
    }

    try {
      const dl = await drive.files.get({ fileId: f.id, alt: "media" }, { responseType: "arraybuffer" });
      const buf = Buffer.from(dl.data as ArrayBuffer);
      const storagePath = `${spec.kind}/drive-${f.id}.${spec.ext}`;
      const uploadRes = await supabase.storage.from(bucket).upload(storagePath, buf, {
        contentType: f.mimeType,
        upsert: true,
      });
      if (uploadRes.error) {
        result.errors.push({ file: f.displayName, reason: `Storage upload failed: ${uploadRes.error.message}` });
        continue;
      }
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const insertRes = await (supabase.from(mediaTable) as any).insert({
        kind: spec.kind,
        source: "drive",
        storage_path: storagePath,
        public_url: publicData.publicUrl,
        mime_type: f.mimeType,
        byte_size: buf.length,
        alt_text: f.name,
        show_in_gallery: false, // opt-in via the curation toggle
        drive_file_id: f.id,
        drive_url: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
        drive_synced_at: new Date().toISOString(),
        drive_modified_at: f.modifiedTime,
      });
      if (insertRes.error) {
        await supabase.storage.from(bucket).remove([storagePath]).catch(() => {});
        result.errors.push({ file: f.displayName, reason: `DB insert failed: ${insertRes.error.message}` });
        continue;
      }
      result.files_new++;
      processed++;
    } catch (e) {
      result.errors.push({ file: f.displayName, reason: (e as Error).message });
    }
  }

  const message =
    `${result.files_seen} in folder, ${result.files_new} new, ${result.files_skipped} already synced, ` +
    `${result.files_oversize} oversize, ${result.files_unsupported} unsupported, ${result.errors.length} errors`;
  await (supabase.from("estate_drive_connections") as any)
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_files_seen: result.files_seen,
      last_sync_files_new: result.files_new,
      last_sync_files_skipped: result.files_skipped,
      last_sync_message: message,
    })
    .eq("estate", estate);

  result.message = message;
  return result;
}

async function enumerateFolderRecursive(
  drive: drive_v3.Drive,
  folderId: string,
  depthRemaining: number,
  pathPrefix: string,
): Promise<EnumeratedFile[]> {
  const files: EnumeratedFile[] = [];
  let pageToken: string | undefined;
  do {
    const listResp = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)",
      pageSize: 100,
      pageToken,
    });
    for (const f of listResp.data.files ?? []) {
      if (!f.id || !f.name || !f.mimeType) continue;
      if (f.mimeType === FOLDER_MIME) {
        if (depthRemaining > 0) {
          const childPath = pathPrefix ? `${pathPrefix}/${f.name}` : f.name;
          files.push(...(await enumerateFolderRecursive(drive, f.id, depthRemaining - 1, childPath)));
        }
      } else {
        files.push({
          id: f.id,
          name: f.name,
          displayName: pathPrefix ? `${pathPrefix}/${f.name}` : f.name,
          mimeType: f.mimeType,
          modifiedTime: f.modifiedTime ?? new Date().toISOString(),
          webViewLink: f.webViewLink ?? undefined,
          size: f.size != null ? Number(f.size) : null,
        });
      }
    }
    pageToken = listResp.data.nextPageToken ?? undefined;
  } while (pageToken);
  return files;
}
