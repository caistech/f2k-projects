/**
 * Google Drive client + sync for the Hemp Homes media library.
 *
 * Pattern adapted from preflight/lib/drive/client.ts but slimmed down — this
 * product has ONE Drive folder (the singleton hemp_homes_drive_connection
 * row), not one-per-project, and the sync target is the hemp-homes-media
 * Storage bucket + hemp_homes_media table (image+video only), not a
 * vector knowledge base.
 *
 * Setup: reuses preflight's OAuth client. Required env:
 *   - GOOGLE_CLIENT_ID
 *   - GOOGLE_CLIENT_SECRET
 *   - NEXT_PUBLIC_CANONICAL_URL  (used to build the redirect URI)
 *
 * The redirect URI registered in Google Cloud Console MUST be:
 *   <NEXT_PUBLIC_CANONICAL_URL>/api/admin/hemp-homes/drive/callback
 */

import { google, type drive_v3 } from "googleapis";
import { createSupabaseService } from "@/lib/supabase-service";

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const ALLOWED_DRIVE_MIME: Record<string, { kind: "image" | "video"; ext: string }> = {
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
const MAX_BYTES = 500 * 1024 * 1024; // matches the hemp-homes-media bucket cap
const MAX_RECURSION_DEPTH = 3;
const BUCKET = "hemp-homes-media";

export function getRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_CANONICAL_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("NEXT_PUBLIC_CANONICAL_URL is not set — required for Drive OAuth redirect");
  }
  return `${base}/api/admin/hemp-homes/drive/callback`;
}

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

export function generateAuthUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces refresh_token issuance even on re-consent
    scope: DRIVE_SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth = getOAuthClient();
  const { tokens } = await oauth.getToken(code);
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

export async function syncHempHomesDrive(): Promise<DriveSyncResult> {
  const result: DriveSyncResult = {
    files_seen: 0,
    files_new: 0,
    files_skipped: 0,
    files_oversize: 0,
    files_unsupported: 0,
    errors: [],
    message: "",
  };

  const supabase = createSupabaseService();

  const { data: conn, error: connErr } = await (supabase
    .from("hemp_homes_drive_connection") as any)
    .select("encrypted_tokens, folder_id, paused")
    .eq("id", "singleton")
    .maybeSingle();

  if (connErr || !conn) {
    result.message = "Drive connection row missing — has the migration been applied?";
    return result;
  }
  if (conn.paused) {
    result.message = "Sync is paused — un-pause from the admin UI to run again.";
    return result;
  }
  if (!conn.encrypted_tokens) {
    result.message = "Drive not connected yet — click Connect Drive to authorise.";
    return result;
  }
  if (!conn.folder_id) {
    result.message = "No folder_id configured.";
    return result;
  }

  let tokens: StoredTokens;
  try {
    tokens = decodeTokens(conn.encrypted_tokens);
  } catch (e) {
    result.errors.push({ file: "(connection)", reason: `Could not decode tokens: ${(e as Error).message}` });
    return result;
  }

  const oauth = getOAuthClient();
  oauth.setCredentials(tokens as Parameters<typeof oauth.setCredentials>[0]);
  const drive = google.drive({ version: "v3", auth: oauth });

  const allFiles = await enumerateFolderRecursive(drive, conn.folder_id, MAX_RECURSION_DEPTH, "");
  result.files_seen = allFiles.length;

  const { data: existingRows } = await (supabase.from("hemp_homes_media") as any)
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
      result.errors.push({
        file: "(cap)",
        reason: `Hit MAX_FILES_PER_RUN cap of ${MAX_FILES_PER_RUN}. Remaining files will sync on next run.`,
      });
      break;
    }
    if (seenIds.has(f.id)) {
      result.files_skipped++;
      continue;
    }
    const spec = ALLOWED_DRIVE_MIME[f.mimeType];
    if (!spec) {
      result.files_unsupported++;
      continue;
    }
    if (f.size != null && f.size > MAX_BYTES) {
      result.files_oversize++;
      result.errors.push({
        file: f.displayName,
        reason: `${(f.size / 1024 / 1024).toFixed(1)} MB exceeds bucket cap (${MAX_BYTES / 1024 / 1024} MB)`,
      });
      continue;
    }

    try {
      const dl = await drive.files.get(
        { fileId: f.id, alt: "media" },
        { responseType: "arraybuffer" },
      );
      const buf = Buffer.from(dl.data as ArrayBuffer);

      const storagePath = `${spec.kind}/drive-${f.id}.${spec.ext}`;
      const uploadRes = await supabase.storage.from(BUCKET).upload(storagePath, buf, {
        contentType: f.mimeType,
        upsert: true,
      });
      if (uploadRes.error) {
        result.errors.push({ file: f.displayName, reason: `Storage upload failed: ${uploadRes.error.message}` });
        continue;
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      const insertRes = await (supabase.from("hemp_homes_media") as any)
        .insert({
          kind: spec.kind,
          source: "drive",
          storage_path: storagePath,
          public_url: publicData.publicUrl,
          mime_type: f.mimeType,
          byte_size: buf.length,
          alt_text: f.name,
          // Default hidden — operator opts each synced item into the public
          // gallery via the Media Library toggle (migration 0030).
          show_in_gallery: false,
          drive_file_id: f.id,
          drive_url: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
          drive_synced_at: new Date().toISOString(),
          drive_modified_at: f.modifiedTime,
        });
      if (insertRes.error) {
        // Best-effort cleanup
        await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
        result.errors.push({ file: f.displayName, reason: `DB insert failed: ${insertRes.error.message}` });
        continue;
      }
      result.files_new++;
      processed++;
    } catch (e) {
      result.errors.push({ file: f.displayName, reason: (e as Error).message });
    }
  }

  await (supabase.from("hemp_homes_drive_connection") as any)
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_files_seen: result.files_seen,
      last_sync_files_new: result.files_new,
      last_sync_files_skipped: result.files_skipped,
      last_sync_message:
        `${result.files_seen} in folder, ` +
        `${result.files_new} new, ${result.files_skipped} already synced, ` +
        `${result.files_oversize} oversize, ${result.files_unsupported} unsupported, ` +
        `${result.errors.length} errors`,
    })
    .eq("id", "singleton");

  result.message =
    `${result.files_seen} in folder, ${result.files_new} new, ${result.files_skipped} already synced, ` +
    `${result.files_oversize} oversize, ${result.files_unsupported} unsupported, ${result.errors.length} errors`;
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
          const children = await enumerateFolderRecursive(drive, f.id, depthRemaining - 1, childPath);
          files.push(...children);
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
