"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PwaLoginGate() {
  const router = useRouter();

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
