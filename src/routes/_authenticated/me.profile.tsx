import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/profile/profile-page";

export const Route = createFileRoute("/_authenticated/me/profile")({
  head: () => ({ meta: [{ title: "Profile — Slotly" }] }),
  component: ProfilePage,
});
