import { NextResponse } from "next/server";

/*
 * One Next.js project, two sites:
 *
 *  · app.sempaihq.com — the SempaiHQ app itself (the Android app built for the web; files in
 *    public/web-app, built by the app repo's scripts/build-web.sh). Every page address gets the
 *    app, which opens the right screen from the address (/novel/123, /manga/…, /leaderboard …).
 *    Link-preview bots (X, WhatsApp, Telegram, Discord…) asking for a novel / manga / chapter get
 *    /share/… instead, which carries the title and the share card image.
 *
 *  · sempaihq.com / www — the public website (landing page, creators, download, install, legal,
 *    support). Any other address is an old app link: it redirects to the same address on
 *    app.sempaihq.com, so links shared over the years keep working.
 *
 * Left alone everywhere: /api/* (the phone app depends on these), Next's own files, the app's
 * files, and any real file in public/ (images, fonts, the APK, …).
 */
const APP_ORIGIN = "https://app.sempaihq.com";

// Which addresses get the app. Vercel preview links and plain localhost also get the app;
// www.localhost shows the website locally (Chrome sends *.localhost to this computer).
const isAppHost = (host) =>
  host.startsWith("app.") || host.endsWith(".vercel.app") || host.startsWith("localhost") || host.startsWith("127.0.0.1");

// Pages that belong to the website (everything else on www is an old app link).
const SITE_PAGES = /^\/(?:$|creators\/?$|download\/?$|install\/?$|privacy-policy\/?$|terms\/?$|support\/?$|share\/)/;

const BOTS = /twitterbot|facebookexternalhit|facebot|whatsapp|telegrambot|discordbot|slackbot|linkedinbot|embedly|pinterest|redditbot|skypeuripreview|applebot|googlebot|bingbot|iframely|vkshare|quora link preview|mastodon/i;
const SHAREABLE = /^\/(novel|manga)\/[0-9a-f-]{36}(?:\/chapter\/[^/]+)?\/?$/i;

export function proxy(request) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const { pathname, search } = request.nextUrl;

  if (isAppHost(host)) {
    const ua = request.headers.get("user-agent") || "";
    if (BOTS.test(ua) && SHAREABLE.test(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = `/share${pathname.replace(/\/$/, "")}`;
      return NextResponse.rewrite(url);
    }
    if (pathname.startsWith("/share/")) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/web-app/index.html";
    return NextResponse.rewrite(url);
  }

  // the website
  if (SITE_PAGES.test(pathname)) return NextResponse.next();
  return NextResponse.redirect(`${APP_ORIGIN}${pathname}${search}`, 308);
}

export const config = {
  matcher: [
    // everything EXCEPT: api routes, Next internals, the web app's own files,
    // and paths that look like files (have an extension, e.g. .png, .apk, .js)
    "/((?!api/|_next/|web-app/|_expo/|assets/|.*\\.[A-Za-z0-9]+$).*)",
  ],
};
