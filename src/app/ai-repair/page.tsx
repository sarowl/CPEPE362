"use client";
import Navbar from "@/components/Navbar";
import RepairFlow from "@/components/RepairFlow";

const Repair = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* [FROM B] RepairFlow: multi-step AI-powered diagnostic and repair walkthrough */}
      <RepairFlow />
    </div>
  );
};

export default Repair;
