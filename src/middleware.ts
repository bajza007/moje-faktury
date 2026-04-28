import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match všech cest, kromě:
     * - _next/static (statické soubory)
     * - _next/image (optimalizace obrázků)
     * - favicon.ico, robots.txt
     * - api (API routes — auth si řeší samy)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|api).*)",
  ],
};
