"use client";

import { useEffect, useState } from "react";

const statusMessages = [
  "Searching your emails…",
  "Trying different search strategies…",
  "Analyzing results…",
];

export function ThinkingIndicator({ status }: { status?: string }) {
  const [dotCount, setDotCount] = useState(0);
  const [fallbackIdx, setFallbackIdx] = useState(0);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 400);
    return () => clearInterval(dotInterval);
  }, []);

  useEffect(() => {
    if (status) return;
    const msgInterval = setInterval(() => {
      setFallbackIdx((prev) => Math.min(prev + 1, statusMessages.length - 1));
    }, 6000);
    return () => clearInterval(msgInterval);
  }, [status]);

  const displayStatus = status || statusMessages[fallbackIdx];

  return (
    <div className="flex items-start gap-4 py-5">
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-foreground/30 transition-all duration-300"
              style={{ opacity: dotCount > i ? 1 : 0.3 }}
            />
          ))}
        </div>
        <span className="text-[12px] text-muted-foreground">
          {displayStatus}
        </span>
      </div>
    </div>
  );
}
