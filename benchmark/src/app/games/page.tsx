import { Suspense } from "react";

import { GamesExplorer } from "@/components/GamesExplorer";
import { SiteNav } from "@/components/SiteNav";

export default function GamesPage() {
  return (
    <>
      <SiteNav />
      <main className="games-page page-pad">
        <Suspense fallback={<div className="loading-panel">Loading games...</div>}>
          <GamesExplorer />
        </Suspense>
      </main>
    </>
  );
}
