import { useState } from "react";
import { toApiError } from "@/api/errors";
import type { FileInfo } from "@/api/types";
import { pickMedia, thumbSource, uploadMedia } from "./photos";

const DENIED: Record<"camera" | "library", string> = {
  camera: "The camera isn't allowed. Turn it on for ID InDetails in your phone's settings.",
  library: "Your photos aren't allowed. Turn them on for ID InDetails in your phone's settings.",
};

/** A work entry's one photo: picked or taken, shrunk, uploaded at once, and removable. */
export function useAttachment(initial: FileInfo | null) {
  const [file, setFile] = useState<FileInfo | null>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(source: "camera" | "library") {
    setError(null);
    try {
      const result = await pickMedia(source);
      if (result.status === "denied") {
        setError(DENIED[source]);
        return;
      }
      if (result.status !== "picked") return;
      setUploading(true);
      setFile(await uploadMedia(result.media[0]));
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setUploading(false);
    }
  }

  return {
    file,
    uploading,
    error,
    photo: file ? thumbSource(file.id) : null,
    pick,
    remove: () => setFile(null),
  };
}
