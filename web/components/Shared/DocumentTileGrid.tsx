"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X, FileText } from "lucide-react";
import { useApplicationDocumentUrl } from "@/hooks/applications/useApplicationDocumentUrl";
import { useDeleteApplicationDocument } from "@/hooks/applications/useDeleteApplicationDocument";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function DocumentTile({
  thumbnailUrl, label, onRemove, removing,
}: {
  thumbnailUrl: string | null;
  label: string;
  onRemove: () => void;
  removing?: boolean;
}) {
  const t = useTranslations("documentGrid");
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt={label} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center gap-1 p-2 text-center">
          <FileText className="w-6 h-6 text-slate-400" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-full">{label}</span>
        </div>
      )}

      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}
        aria-label={t("remove")}
        className="absolute top-1 inset-e-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
      >
        <X className="w-3 h-3" />
      </button>

      {confirming && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-2" onClick={(e) => e.stopPropagation()}>
          <p className="text-[11px] text-white text-center">{t("confirmDelete")}</p>
          <div className="flex gap-1.5">
            <button type="button" onClick={() => { onRemove(); setConfirming(false); }} disabled={removing} className="px-2 py-1 bg-red-600 text-white text-[11px] font-medium rounded disabled:opacity-50">
              {removing ? "…" : t("confirm")}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="px-2 py-1 bg-white/20 text-white text-[11px] rounded">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Local, not-yet-uploaded files -- removal is just dropping from local
    state, nothing persisted to undo. Used on the citizen's application
    form before submission. */
export function PendingDocumentGrid({ files, onRemove }: { files: File[]; onRemove: (index: number) => void }) {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {files.map((file, index) => (
        <PendingTile key={`${file.name}-${index}`} file={file} onRemove={() => onRemove(index)} />
      ))}
    </div>
  );
}

function PendingTile({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = file.type.startsWith("image/");

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return <DocumentTile thumbnailUrl={isImage ? previewUrl : null} label={file.name} onRemove={onRemove} />;
}

/** Already-uploaded, server-backed documents -- clicking opens a real
    signed download URL, removal is an actual delete against storage +
    the database, not just a local-state change. Used in the admin
    application review view. */
export function UploadedDocumentGrid({
  documents,
}: {
  documents: { id: number; originalFileName: string | null }[];
}) {
  if (documents.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
      {documents.map((doc) => (
        <UploadedTile key={doc.id} documentId={doc.id} fileName={doc.originalFileName} />
      ))}
    </div>
  );
}

function UploadedTile({ documentId, fileName }: { documentId: number; fileName: string | null }) {
  const { data } = useApplicationDocumentUrl(documentId);
  const deleteDocument = useDeleteApplicationDocument();

  const extension = fileName?.split(".").pop()?.toLowerCase();
  const isImage = extension ? IMAGE_EXTENSIONS.has(extension) : false;
  const label = fileName ?? `Document #${documentId}`;

  return (
    <a
      href={data?.downloadUrl ?? "#"}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => { if (!data?.downloadUrl) e.preventDefault(); }}
      className="block"
    >
      <DocumentTile
        thumbnailUrl={isImage ? (data?.downloadUrl ?? null) : null}
        label={label}
        onRemove={() => deleteDocument.mutate(documentId)}
        removing={deleteDocument.isPending}
      />
    </a>
  );
}