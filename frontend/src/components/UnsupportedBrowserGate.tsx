"use client";

import { useEffect, useState } from "react";
import { getRecommendedBrowsers, isUnsupportedBrowser } from "../utils/browserSupport";

/**
 * Full-screen gate for Internet Explorer and other unsupported browsers.
 * Renders nothing on supported evergreen browsers.
 */
export default function UnsupportedBrowserGate({ children }: { children: React.ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setBlocked(isUnsupportedBrowser());
  }, []);

  if (!blocked) return <>{children}</>;

  const browsers = getRecommendedBrowsers();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(160deg, #F0FDF4 0%, #FFFFFF 50%, #ECFDF5 100%)",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "440px",
          width: "100%",
          background: "#fff",
          borderRadius: "16px",
          padding: "32px 28px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          border: "1px solid #D1FAE5",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            margin: "0 auto 16px",
            borderRadius: "14px",
            background: "#E8F5EE",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
          aria-hidden
        >
          ⚠
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 8px", color: "#064E3B" }}>
          Browser not supported
        </h1>
        <p style={{ fontSize: "14px", lineHeight: 1.55, color: "#4B5563", margin: "0 0 20px" }}>
          SpeakUp GC does not work on Internet Explorer or outdated browsers. Please open this site
          in a modern browser to continue.
        </p>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 20px",
            textAlign: "left",
            background: "#F0FDF4",
            borderRadius: "12px",
            border: "1px solid #BBF7D0",
          }}
        >
          {browsers.map((name) => (
            <li
              key={name}
              style={{
                padding: "10px 14px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#065F46",
                borderBottom: "1px solid #D1FAE5",
              }}
            >
              {name}
            </li>
          ))}
        </ul>
        <p style={{ fontSize: "12px", color: "#9CA3AF", margin: 0 }}>
          Tip: On Windows, use Microsoft Edge or Chrome. Internet Explorer is retired and unsafe.
        </p>
      </div>
    </div>
  );
}
