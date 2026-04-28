import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function Navigation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/" className="font-bold text-lg">
            📄 Moje faktury
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Seznam
          </Link>
          <Link
            href="/faktury/nova"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Nová faktura
          </Link>
          <Link
            href="/dodavatele"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Dodavatelé
          </Link>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500 hidden sm:inline">{user.email}</span>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
