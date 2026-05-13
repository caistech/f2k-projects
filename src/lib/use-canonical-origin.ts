"use client";

import { useEffect } from "react";

/**
 * If NEXT_PUBLIC_CANONICAL_URL is set and window.location.origin doesn't
 * match, redirect to the canonical origin (preserving path + query).
 *
 * Use on pages that initiate an auth flow (login, reset-password) so the
 * Supabase PKCE code verifier cookie is always set on the same subdomain
 * the magic-link redirects back to. Without this, an admin who clicks
 * "Forgot password" on f2k-projects-corporate-ai-solutions.vercel.app and
 * then receives a magic-link redirecting to
 * f2k-projects-git-main-corporate-ai-solutions.vercel.app (or vice versa)
 * hits "PKCE code verifier not found in storage" because the verifier
 * cookie didn't follow across subdomains.
 *
 * Set NEXT_PUBLIC_CANONICAL_URL in Vercel env vars (Production + Preview)
 * to the URL admins should use, e.g.
 *   https://f2k-projects-git-main-corporate-ai-solutions.vercel.app
 * Leave it unset for local dev (the redirect is a no-op when unset).
 */
export function useCanonicalOrigin(): void {
  useEffect(() => {
    const canonical = process.env.NEXT_PUBLIC_CANONICAL_URL;
    if (!canonical || typeof window === "undefined") return;

    let expectedOrigin: string;
    try {
      expectedOrigin = new URL(canonical).origin;
    } catch {
      // Malformed env var — silently no-op rather than redirect-loop.
      return;
    }

    if (window.location.origin !== expectedOrigin) {
      window.location.replace(
        expectedOrigin + window.location.pathname + window.location.search,
      );
    }
  }, []);
}
