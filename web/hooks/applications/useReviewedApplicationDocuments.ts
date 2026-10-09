import { createElement } from "react";
import { useApplicationDocumentUrl } from "./useApplicationDocumentUrl";

export function ApplicationDocumentLink({ documentId, fileName }: { documentId: number; fileName: string | null }) {
  const { data } = useApplicationDocumentUrl(documentId);

  if (!data) {
    return createElement("span", { className: "text-xs text-slate-400" }, "Loading...");
  }

  return createElement(
    "a",
    {
      href: data.downloadUrl,
      target: "_blank",
      rel: "noreferrer",
      className: "text-xs text-blue-600 dark:text-blue-400 hover:underline",
    },
    fileName ?? `Document #${documentId}`
  );
}