import Link from "next/link";
import RoamingCat from "@/components/RoamingCat";

export default function Home() {
  return (
    <main className="container" style={{ textAlign: "center", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "0.5rem", letterSpacing: "-0.05em" }}>Photobooth</h1>
      <p style={{ marginBottom: "2.5rem", color: "#666" }}>Capture your moments in style.</p>
      <Link href="/booth" className="btn btn-primary">
        Start Booth
      </Link>
      <RoamingCat />
    </main>
  );
}
