import { useState, useEffect } from "react";

export type NetworkStatus = "online" | "slow" | "offline";

type NetworkInformation = EventTarget & {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  downlink: number; // Mbps
  rtt: number; // ms
  saveData: boolean;
};

declare global {
  interface Navigator {
    connection?: NetworkInformation;
  }
}

function evaluate(): NetworkStatus {
  if (!navigator.onLine) return "offline";

  const conn = navigator.connection;
  if (conn) {
    if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") return "slow";
    if (conn.rtt > 1000) return "slow";
    if (conn.downlink < 0.5) return "slow";
  }

  return "online";
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>("online");

  useEffect(() => {
    // Initial evaluation after mount (navigator not available during SSR)
    setStatus(evaluate());

    function update() {
      setStatus(evaluate());
    }

    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    navigator.connection?.addEventListener("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      navigator.connection?.removeEventListener("change", update);
    };
  }, []);

  return status;
}
