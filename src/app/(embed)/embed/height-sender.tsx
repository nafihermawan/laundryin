"use client";

import { useEffect } from "react";

export function HeightSender() {
  useEffect(() => {
    const target =
      (document.getElementById("embed-root") as HTMLElement | null) ??
      (document.body.firstElementChild as HTMLElement | null) ??
      document.body;

    function postHeight() {
      const height = Math.ceil(target.getBoundingClientRect().height);
      window.parent.postMessage({ type: "embed:height", height }, "*");
    }

    postHeight();
    const t = window.setTimeout(postHeight, 50);

    const mutationObserver = new MutationObserver(() => postHeight());
    mutationObserver.observe(target, {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true,
    });

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => postHeight()) : null;
    resizeObserver?.observe(target);

    window.addEventListener("resize", postHeight);

    return () => {
      window.clearTimeout(t);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", postHeight);
    };
  }, []);

  return null;
}
