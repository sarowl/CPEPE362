import SnakeLoading from "@/components/SnakeLoading";

export default function Loading() {
  return (
    <SnakeLoading
      overlay
      title="Loading garage"
      subtitle="Pulling in your vehicles and maintenance history."
    />
  );
}