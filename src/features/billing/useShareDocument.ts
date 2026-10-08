import { useState } from "react";
import { toApiError } from "@/api/errors";
import { toast } from "@/ui";
import { downloadPdf, sharePdf } from "./pdf";

type ShareOptions = {
  /** The API path of the PDF, such as "/invoices/12/pdf". */
  path: string;
  fileName: string;
  /** The share sheet's title on Android. */
  title: string;
  /** Ask afterwards how it was sent, to record a delivery: only for someone who may record one. */
  askHowSent: boolean;
};

/** Downloads a document's PDF, opens the share sheet, then (when allowed) asks whether it went to the client. */
export function useShareDocument({ path, fileName, title, askHowSent }: ShareOptions) {
  const [sharing, setSharing] = useState(false);
  const [asking, setAsking] = useState(false);

  async function share() {
    if (sharing) return;
    setSharing(true);
    try {
      const file = await downloadPdf(path, fileName);
      await sharePdf(file, title);
      if (askHowSent) setAsking(true);
    } catch (error) {
      toast({ text: "The PDF couldn't be shared", sub: toApiError(error).message, icon: "alert" });
    } finally {
      setSharing(false);
    }
  }

  return { share, sharing, asking, closePrompt: () => setAsking(false) };
}
