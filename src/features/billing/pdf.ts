import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ApiError } from "@/api/errors";
import { tokenManager } from "@/auth/tokenManager";
import { env } from "@/config/env";

/*
 * Invoice and statement PDFs (phase-0-plan.md section 12): downloaded with the bearer token into the cache, then
 * handed to the phone's share sheet. The token travels only in the request header, never in the address.
 * Downloading records nothing on the server; the caller records a delivery once the person says it went out.
 * The files live in the cache's "documents" folder, deleted on sign-out (CLAUDE.md section 9).
 */

const DOCUMENTS = "documents";

/** The HTTP status in the native download error ("response has status: 401"), or 0 when there is none. */
function statusOf(error: unknown): number {
  const match = /status:?\s*(\d{3})/.exec(error instanceof Error ? error.message : String(error));
  return match ? Number(match[1]) : 0;
}

async function download(path: string, target: File, token: string | null): Promise<void> {
  await File.downloadFileAsync(`${env.apiUrl}/api${path}`, target, {
    headers: token ? { Authorization: `Bearer ${token}`, Accept: "application/pdf" } : {},
    idempotent: true,
  });
}

/** Downloads an API PDF (such as "/invoices/12/pdf") into the cache and returns the local file. */
export async function downloadPdf(path: string, fileName: string): Promise<File> {
  const folder = new Directory(Paths.cache, DOCUMENTS);
  folder.create({ intermediates: true, idempotent: true });
  const target = new File(folder, fileName);

  try {
    await download(path, target, tokenManager.getAccessToken());
  } catch (error) {
    if (statusOf(error) !== 401) throw new ApiError(statusOf(error), {});
    // The access token ran out: one refresh, shared with every other request, then one more try.
    const token = await tokenManager.refresh();
    if (!token) throw new ApiError(401, {});
    try {
      await download(path, target, token);
    } catch (retryError) {
      throw new ApiError(statusOf(retryError), {});
    }
  }
  return target;
}

/** Deletes every downloaded invoice and statement: the person signed out. */
export async function deleteDownloadedPdfs(): Promise<void> {
  const folder = new Directory(Paths.cache, DOCUMENTS);
  if (folder.exists) folder.delete();
}

/** Opens the share sheet for a downloaded PDF. Resolves once the sheet is closed. */
export async function sharePdf(file: File, title: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError(-1, { message: "Sharing isn't available on this phone." });
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: title,
  });
}
