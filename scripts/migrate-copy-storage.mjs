// Storage copier for the Seoul -> Sydney mirror (Phase B, step 5).
// Copies every bucket + object from SOURCE to DEST. Resumable: objects that
// already exist on DEST are skipped, so it is safe to re-run.
//
// Reads config from env (set by scripts/migrate-to-sydney.ps1):
//   SRC_URL  SRC_KEY  (source project URL + service-role/secret key)
//   DST_URL  DST_KEY  (dest   project URL + service-role/secret key)
//
// Run from the repo root so it resolves the repo's @supabase/supabase-js:
//   node scripts/migrate-copy-storage.mjs
//
// Prints counts + paths only — never key values.

import { createClient } from "@supabase/supabase-js";

const { SRC_URL, SRC_KEY, DST_URL, DST_KEY } = process.env;
for (const [k, v] of Object.entries({ SRC_URL, SRC_KEY, DST_URL, DST_KEY })) {
  if (!v) {
    console.error(`[storage] missing env ${k}`);
    process.exit(1);
  }
}

const src = createClient(SRC_URL, SRC_KEY, { auth: { persistSession: false } });
const dst = createClient(DST_URL, DST_KEY, { auth: { persistSession: false } });

const PAGE = 100;

async function listAll(client, bucket, prefix = "") {
  // Recursively walk a bucket. Folders come back with id === null.
  const out = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage
      .from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        // folder -> recurse
        out.push(...(await listAll(client, bucket, path)));
      } else {
        out.push({ path, contentType: entry.metadata?.mimetype });
      }
    }
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}

async function existsOnDest(bucket, path) {
  const slash = path.lastIndexOf("/");
  const dir = slash === -1 ? "" : path.slice(0, slash);
  const name = slash === -1 ? path : path.slice(slash + 1);
  const { data } = await dst.storage.from(bucket).list(dir, { search: name, limit: PAGE });
  return !!data?.some((e) => e.name === name && e.id !== null);
}

async function main() {
  const { data: buckets, error: bErr } = await src.storage.listBuckets();
  if (bErr) throw new Error(`listBuckets: ${bErr.message}`);
  console.log(`[storage] source has ${buckets.length} bucket(s): ${buckets.map((b) => b.id).join(", ") || "(none)"}`);

  let totalCopied = 0;
  let totalSkipped = 0;

  for (const b of buckets) {
    // create bucket on dest (idempotent)
    const { error: cErr } = await dst.storage.createBucket(b.id, {
      public: b.public,
      fileSizeLimit: b.file_size_limit ?? undefined,
      allowedMimeTypes: b.allowed_mime_types ?? undefined,
    });
    if (cErr && !/already exists/i.test(cErr.message)) {
      console.error(`[storage] createBucket ${b.id}: ${cErr.message}`);
    }

    const files = await listAll(src, b.id);
    console.log(`[storage] bucket "${b.id}": ${files.length} object(s)`);

    for (const f of files) {
      if (await existsOnDest(b.id, f.path)) {
        totalSkipped++;
        continue;
      }
      const { data: blob, error: dErr } = await src.storage.from(b.id).download(f.path);
      if (dErr) {
        console.error(`[storage]   download FAIL ${b.id}/${f.path}: ${dErr.message}`);
        continue;
      }
      const buf = Buffer.from(await blob.arrayBuffer());
      const { error: uErr } = await dst.storage.from(b.id).upload(f.path, buf, {
        contentType: f.contentType || blob.type || "application/octet-stream",
        upsert: true,
      });
      if (uErr) {
        console.error(`[storage]   upload FAIL ${b.id}/${f.path}: ${uErr.message}`);
        continue;
      }
      totalCopied++;
      if (totalCopied % 25 === 0) console.log(`[storage]   ...${totalCopied} copied`);
    }
  }

  console.log(`[storage] DONE — copied ${totalCopied}, skipped ${totalSkipped} (already present).`);
}

main().catch((e) => {
  console.error(`[storage] FATAL: ${e.message}`);
  process.exit(1);
});
