/** Same extensions the server accepts for these documents (it checks the extension, not the MIME type). */
export const ALLOWED_EXTENSIONS: readonly string[] = ["jpg", "jpeg", "png", "webp", "pdf", "doc", "docx"];
export const ACCEPT = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(",");

const MB = 1024 * 1024;
export const MAX_FILE_MB = 10;
/** The server rejects a whole request over 25 MB; this leaves headroom for the form fields. */
export const MAX_TOTAL_MB = 20;

export interface DocumentProblem {
  reason: "type" | "size" | "total";
  fileName: string;
}

/** Splits incoming files into those that can be attached and the last problem found, so nothing fails late at submit. */
export function checkDocuments(current: File[], incoming: File[]): { accepted: File[]; problem: DocumentProblem | null } {
  const accepted: File[] = [];
  let problem: DocumentProblem | null = null;
  let totalBytes = current.reduce((sum, file) => sum + file.size, 0);

  for (const file of incoming) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    if (!ALLOWED_EXTENSIONS.includes(extension)) problem = { reason: "type", fileName: file.name };
    else if (file.size > MAX_FILE_MB * MB) problem = { reason: "size", fileName: file.name };
    else if (totalBytes + file.size > MAX_TOTAL_MB * MB) problem = { reason: "total", fileName: file.name };
    else {
      accepted.push(file);
      totalBytes += file.size;
    }
  }

  return { accepted, problem };
}