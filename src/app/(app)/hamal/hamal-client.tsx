"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";

// ------------------------------------------------------------------
// Placeholder shell — the real "שבצק חמל" content will be added next.
// ------------------------------------------------------------------

function HamalInner() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">שבצק חמל</h1>
      </header>

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20 text-center text-muted-foreground">
        <ListChecks className="size-10 opacity-50" />
        <p className="text-sm">המסך בהקמה — התוכן יתווסף בקרוב.</p>
      </div>
    </div>
  );
}

export function HamalClient() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <HamalInner />
    </QueryClientProvider>
  );
}
