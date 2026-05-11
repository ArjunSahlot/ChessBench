import { Suspense } from "react";

import { GamesExplorer } from "@/components/GamesExplorer";
import { SiteNav } from "@/components/SiteNav";
import { getSiteData } from "@/lib/static-data";

export default function GamesPage() {
  const site = getSiteData();

  return (
    <>
      <SiteNav />
      <main className="games-page page-pad">
        <Suspense fallback={<div className="loading-panel">Loading games...</div>}>
          <GamesExplorer site={site} />
        </Suspense>
      </main>
    </>
  );
}
