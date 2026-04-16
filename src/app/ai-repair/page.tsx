// ============================================================
// ai-repair/page.tsx — IMPORTED FROM Folder_B
//
// This is a new page not present in Folder_A.
// It hosts the full multi-step AI repair flow (RepairFlow component).
// Accessible from:
//  - Navbar "Fix it" dropdown → "Autobot AI"
//  - Home page "AI Repair Assistant" feature card
//  - Home page footer CTA for logged-in users
// ============================================================
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
