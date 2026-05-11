"use client";

import Link from "next/link";
import { ArrowLeft, Map } from "lucide-react";

import { SiteNav } from "@/components/SiteNav";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="empty-state page-pad">
        <Map size={48} className="text-secondary" />
        <h1>Page not found</h1>
        <p>We couldn't find the page you were looking for. It might have been moved or deleted.</p>
        <Link href="/" className="primary-action" style={{ marginTop: "1rem" }}>
          <ArrowLeft size={18} /> Back to standard view
        </Link>
      </main>
    </>
  );
}
