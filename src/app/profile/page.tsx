import { Suspense } from "react";
import Profile from "@/components/Profile";
import SnakeLoading from "@/components/SnakeLoading";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <SnakeLoading
          overlay
          title="Building your profile"
          subtitle="Loading your details, certifications, and bookmarks."
        />
      }
    >
      <Profile />
    </Suspense>
  );
}