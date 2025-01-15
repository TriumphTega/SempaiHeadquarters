"use client";

import { useEffect } from "react";

export default function BootstrapProvider() {
  useEffect(() => {
    // Dynamically import Bootstrap JavaScript on the client side
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return null; // No UI rendering is needed
}
