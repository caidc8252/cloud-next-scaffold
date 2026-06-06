"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Renders a real, scannable QR for an otpauth:// URI (inline SVG from the qrcode
// lib). The value is our own generated URI, so the SVG is trusted.
export function QrCode({ value, size = 176 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let active = true;
    QRCode.toString(value, { type: "svg", margin: 1, width: size })
      .then((out) => {
        if (active) setSvg(out);
      })
      .catch(() => {
        if (active) setSvg("");
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  return (
    <div
      className="rounded-lg bg-white p-2"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
