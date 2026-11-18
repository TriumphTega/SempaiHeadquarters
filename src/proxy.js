import { NextResponse } from "next/server";

/*
 * sempaihq.com runs the SempaiHQ app itself (the same app as Android, built
 * for the web — files in public/web-app, built by the app repo's
 * scripts/build-web.sh).
 *
 * Every page address gets the app; the app reads the address and opens the
 * right screen (/novel/123, /manga/…, /leaderboard …), so old links still work.
 *
 * Left alone: /api/* (the phone app depends on these), Next's own files, the
 * app's files, and any real file in public/ (images, fonts, the APK, …).
 *
 * To switch back to the old website pages, delete this file (src/proxy.js) and redeploy.
 */
export function proxy(request) {
  const url = request.nextUrl.clone();
  url.pathname = "/web-app/index.html";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // everything EXCEPT: api routes, Next internals, the web app's own files,
    // and paths that look like files (have an extension, e.g. .png, .apk, .js)
    "/((?!api/|_next/|web-app/|_expo/|assets/|.*\\.[A-Za-z0-9]+$).*)",
  ],
};
