import SnakeLoading from "@/components/SnakeLoading";

export default function Loading() {
  return (
    <SnakeLoading
      overlay
      title="Loading settings"
      subtitle="Retrieving your account details and security preferences."
    />
  );
}