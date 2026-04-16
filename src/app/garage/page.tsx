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
