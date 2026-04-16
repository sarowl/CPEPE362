// ============================================================
// garage/page.tsx — IMPORTED FROM Folder_B
//
// This is a new page not present in Folder_A.
// Renders the full My Garage experience with:
//  - Vehicle management (add, view, edit, delete)
//  - Maintenance log tracking per vehicle
//  - Notification integration when maintenance is saved
// Accessible from the Navbar user dropdown → "My Garage"
// ============================================================
import Navbar from "@/components/Navbar";
import Mygarage from "@/components/Mygarage";

export default function MyGaragePage() {
    return (
        <>
            {/* [FROM A] Navbar used for consistent navigation header */}
            <Navbar />
            {/* [FROM B] Mygarage: full vehicle and maintenance management UI */}
            <Mygarage />
        </>
    );
}
