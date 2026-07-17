import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Вход в админку — TIGLEV.COM" };

export default function AdminSignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-bg px-4 py-12">
      <SignIn
        fallbackRedirectUrl="/admin"
        appearance={{ elements: { footerAction: { display: "none" } } }}
      />
    </main>
  );
}
