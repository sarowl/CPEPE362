//src\app\ai-repair\page.tsx
"use client";
import Navbar from "@/components/Navbar";
import RepairFlow from "@/components/RepairFlow";

const Repair = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <RepairFlow />
    </div>
  );
};

export default Repair;
