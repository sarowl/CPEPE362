import SnakeLoading from "@/components/SnakeLoading";

export default function Loading() {
  return (
    <SnakeLoading
      overlay
      title="Building your profile"
      subtitle="Loading your details, certifications, and bookmarks."
    />
  );
}