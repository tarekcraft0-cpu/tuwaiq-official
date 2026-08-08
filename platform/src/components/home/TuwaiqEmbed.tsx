"use client";

import { useEffect, useRef, useState } from "react";

/** واجهة طويق (الأعضاء/الآراء/النشيد) داخل الصفحة الرئيسية الموحّدة */
export function TuwaiqEmbed() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(1200);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "tuwaiq-embed-height" && typeof data.height === "number") {
        setHeight(Math.max(800, Math.ceil(data.height) + 24));
      }
      if (data.type === "tuwaiq-parent-scroll" && typeof data.id === "string") {
        const el = document.getElementById(data.id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    function onHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash || hash === "arena") return;
      const frame = iframeRef.current?.contentWindow;
      if (!frame) return;
      frame.postMessage({ type: "tuwaiq-scroll", id: hash }, "*");
    }
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title="طويق — الأعضاء والآراء"
      src="/tuwaiq.html?embed=1"
      className="block w-full border-0 bg-transparent"
      style={{ height, minHeight: "100vh" }}
      loading="eager"
    />
  );
}
