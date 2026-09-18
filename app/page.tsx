import { redirect } from "next/navigation";

// Root "/" redirects to dashboard — middleware handles auth protection
export default function RootPage() {
  redirect("/dashboard");
}
