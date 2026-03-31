export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/chat/:path*",
    "/inbox/:path*",
    "/priority/:path*",
    "/settings/:path*",
    "/api/chat/:path*",
    "/api/conversations/:path*",
    "/api/gmail/:path*",
    "/api/sync/:path*",
  ],
};
