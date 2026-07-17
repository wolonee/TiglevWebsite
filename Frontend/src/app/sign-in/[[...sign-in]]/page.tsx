import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5f2] px-4 py-12">
      <SignIn />
    </main>
  );
}
