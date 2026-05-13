import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

const ADMIN_PUBLIC_ROUTES = new Set([
  "/admin/login",
  "/admin/reset-password",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Propagate pathname to server components (admin layout reads this).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Only auth-gate /admin/* (and skip its public sub-pages + the auth callback).
  const isAdmin = pathname.startsWith("/admin");
  const isAuthCallback = pathname.startsWith("/api/auth/callback");
  const isPublicAdminRoute = ADMIN_PUBLIC_ROUTES.has(pathname);

  if (!isAdmin || isAuthCallback || isPublicAdminRoute) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Supabase SSR session check
  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|pdf|mp4)$).*)"],
};
