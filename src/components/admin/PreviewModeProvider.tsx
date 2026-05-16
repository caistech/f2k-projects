"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Preview Mode (F2KSFLDS-13).
 *
 * When enabled, every fetch() to /api/admin/* with a write method (POST,
 * PATCH, PUT, DELETE) is intercepted client-side and returned a synthesized
 * success response. No network call is made; no DB row is touched. The UI
 * still advances because the synthesized response is shape-compatible with
 * what each admin endpoint normally returns.
 *
 * Reads (GET) pass through normally so admins always see real data.
 *
 * The interceptor lifetime is tied to the boolean flag — when toggled OFF,
 * window.fetch is restored to the original. State persists in localStorage
 * under "adminPreviewMode" so a reload keeps the same mode (consistent with
 * the safety guarantee that nothing was persisted on the server side).
 *
 * Per-endpoint envelopes are best-effort. Unknown admin endpoints get a
 * generic { success: true } body. If a new endpoint returns a shape we
 * don't cover here, add it to `syntheticEnvelope` below — symptoms will be
 * a page that doesn't reflect a Preview save (the local state update
 * relies on the returned row).
 */

interface PreviewContextValue {
  isPreview: boolean;
  setPreview: (v: boolean) => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

const STORAGE_KEY = "adminPreviewMode";

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

function methodOf(input: FetchInput, init: FetchInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input === "object" && input !== null && "method" in input) {
    return (input as Request).method.toUpperCase();
  }
  return "GET";
}

function urlOf(input: FetchInput): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof input === "object" && input !== null && "url" in input) {
    return (input as Request).url;
  }
  return String(input);
}

function safeUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: ad-hoc UUIDv4-ish. Only used in Preview Mode for synthetic
  // identifiers, never hits a real database constraint.
  return "preview-" + Math.random().toString(16).slice(2);
}

function parseBody(init: FetchInit): Record<string, unknown> {
  if (!init?.body) return {};
  try {
    if (typeof init.body === "string") return JSON.parse(init.body);
  } catch {
    // Non-JSON body (FormData, Blob). Return empty — synthetic envelope
    // can't echo back arbitrary binary content.
  }
  return {};
}

function trailingSegment(url: string): string {
  const u = url.split("?")[0];
  const parts = u.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/**
 * Map a (url, method, request body) to the response shape the calling
 * admin page expects. Keep these in sync with the actual route handlers
 * in /api/admin/. Default for unknown URLs is { success: true, _preview: true }.
 */
function syntheticEnvelope(
  url: string,
  method: string,
  body: Record<string, unknown>,
): Record<string, unknown> {
  const path = url.split("?")[0];
  const last = trailingSegment(path);
  const now = new Date().toISOString();
  const baseRow = { ...body, _preview: true };

  // Allocations PATCH → { allocation: ... }
  if (/^\/api\/admin\/seafields\/allocations\/\d+$/.test(path) && method === "PATCH") {
    return {
      _preview: true,
      allocation: {
        ...baseRow,
        lot_number: Number(last),
        updated_at: now,
      },
    };
  }

  // Stages PATCH → { stage: ... }
  if (/^\/api\/admin\/seafields\/stages\/[a-f0-9-]+$/.test(path) && method === "PATCH") {
    return {
      _preview: true,
      stage: { ...baseRow, id: last, updated_at: now },
    };
  }

  // Dwelling types CREATE → { dwelling_type: ... }
  if (path === "/api/admin/seafields/dwelling-types" && method === "POST") {
    return {
      _preview: true,
      dwelling_type: {
        ...baseRow,
        id: safeUuid(),
        is_active: body.is_active ?? true,
        created_at: now,
        updated_at: now,
      },
    };
  }

  // Dwelling types PATCH → { dwelling_type: ... }
  if (
    /^\/api\/admin\/seafields\/dwelling-types\/[a-f0-9-]+$/.test(path) &&
    method === "PATCH"
  ) {
    return {
      _preview: true,
      dwelling_type: { ...baseRow, id: last, updated_at: now },
    };
  }

  // Registrations PATCH → { registration: ... }
  if (
    /^\/api\/admin\/seafields\/registrations\/[a-f0-9-]+$/.test(path) &&
    method === "PATCH"
  ) {
    return {
      _preview: true,
      registration: { ...baseRow, id: last },
    };
  }

  // Manual notify resend → { success: true, resend_id: 'preview-...' }
  if (
    /^\/api\/admin\/seafields\/registrations\/[a-f0-9-]+\/notify$/.test(path) &&
    method === "POST"
  ) {
    return { success: true, _preview: true, resend_id: "preview-mode-mock" };
  }

  // Email template PATCH → { template: ... }
  if (
    /^\/api\/admin\/email-templates\/[a-z][a-z0-9_]*$/.test(path) &&
    method === "PATCH"
  ) {
    return {
      _preview: true,
      template: { ...baseRow, slug: last, updated_at: now },
    };
  }

  // Lot waitlist add — { success: true } shape good enough
  if (/^\/api\/admin\/seafields\/lot-waitlist\//.test(path)) {
    return { success: true, _preview: true };
  }

  // Workbook import — apply step is intercepted; dry-run is GET-equivalent
  // and isn't a write so it passes through normally
  if (path === "/api/admin/seafields/import-workbook" && method === "POST") {
    return {
      success: true,
      _preview: true,
      applied: 0,
      skipped: 0,
      message: "Preview mode — workbook merge intercepted, no rows written.",
    };
  }

  // Branscombe admin allocations mirror the Seafields shape
  if (/^\/api\/admin\/branscombe\/allocations\//.test(path) && method === "PATCH") {
    return {
      _preview: true,
      allocation: { ...baseRow, unit_number: Number(last), updated_at: now },
    };
  }

  return { success: true, ...baseRow };
}

export function PreviewModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPreview, setIsPreview] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const originalFetchRef = useRef<typeof window.fetch | null>(null);

  // Hydrate from localStorage on mount. Avoids SSR/CSR mismatch — banner
  // starts hidden, flips on after the localStorage read.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setIsPreview(true);
    } catch {
      // localStorage blocked (private browsing) — preview mode just stays
      // off, which is the safe default.
    }
    setHydrated(true);
  }, []);

  const setPreview = useCallback((v: boolean) => {
    setIsPreview(v);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      // see above
    }
  }, []);

  // Install/remove the fetch interceptor on toggle.
  useEffect(() => {
    if (!hydrated) return;

    if (!isPreview) {
      // Restore if we previously replaced.
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
      return;
    }

    if (originalFetchRef.current) return; // already installed

    const orig = window.fetch.bind(window);
    originalFetchRef.current = orig;

    window.fetch = (async (
      input: FetchInput,
      init?: FetchInit,
    ): Promise<Response> => {
      const url = urlOf(input);
      const method = methodOf(input, init);

      const isAdminWrite =
        url.startsWith("/api/admin/") && method !== "GET" && method !== "HEAD";

      if (!isAdminWrite) return orig(input, init);

      const body = parseBody(init);
      const envelope = syntheticEnvelope(url, method, body);

      // Fire-and-forget event so the banner can flash an indicator. Other
      // UI surfaces can listen for "admin-preview-intercepted" too.
      try {
        window.dispatchEvent(
          new CustomEvent("admin-preview-intercepted", {
            detail: { url, method },
          }),
        );
      } catch {
        // CustomEvent unsupported — silently skip the broadcast.
      }

      return new Response(JSON.stringify(envelope), {
        status: 200,
        statusText: "OK (preview)",
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof window.fetch;

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, [isPreview, hydrated]);

  const value = useMemo(
    () => ({ isPreview: hydrated ? isPreview : false, setPreview }),
    [isPreview, hydrated, setPreview],
  );

  return (
    <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
  );
}

export function usePreviewMode(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) {
    // Outside the provider — return a safe no-op so calling components
    // don't crash in storybook / tests.
    return { isPreview: false, setPreview: () => {} };
  }
  return ctx;
}
