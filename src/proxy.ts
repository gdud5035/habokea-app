import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Expose the current pathname to Server Components via a request header.
// The (app) layout reads `x-pathname` so it can skip the must-change-password
// redirect when the user is already on /profile — otherwise /profile would
// redirect to itself forever (ERR_TOO_MANY_REDIRECTS). This proxy must stay
// pure: it does NOT touch the Supabase session.
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on app pages only — skip Next internals, the service worker, and static assets.
  matcher: ["/((?!_next/static|_next/image|sw.js|favicon.ico|icons|.*\\.png$).*)"],
};
