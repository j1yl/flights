"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

export default function HomePage() {
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const FlightMap = dynamic(() => import("../components/FlightMap"), {
    ssr: false,
  });

  return (
    <main className="min-h-screen w-full flex flex-col">
      {quotaExceeded ? (
        <div className="min-h-screen flex items-center justify-center text-white">
          <p className="text-xl">You have reached your daily API quota.</p>
        </div>
      ) : (
        <FlightMap setQuotaExceeded={setQuotaExceeded} />
      )}
    </main>
  );
}
