import { useEffect } from "react";

export function usePageMeta(_title: string, description?: string) {
  useEffect(() => {
    document.title = "PitchGauge";
    if (description) {
      let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [description]);
}
