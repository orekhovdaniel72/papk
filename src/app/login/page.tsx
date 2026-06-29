import type { Metadata } from "next";
import { site } from "@/lib/site";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Вход",
  description: `Кабинет владельца ${site.fullName}`,
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
