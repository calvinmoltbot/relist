"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, ClipboardPaste, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ImportButtonProps {
  onImported: () => void;
}

export function ImportButton({ onImported }: ImportButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number; withUrls?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const [photoResult, setPhotoResult] = useState<{ succeeded: number; blocked: number; failed: number } | null>(null);

  const handleFileImport = useCallback(
    async (file: File) => {
      setImporting(true);
      setError(null);
      setResult(null);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/import", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Import failed");
        }

        const data = await res.json();
        setResult({ imported: data.imported, skipped: data.skipped, withUrls: data.withUrls ?? 0 });
        onImported();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      } finally {
        setImporting(false);
      }
    },
    [onImported],
  );

  const handleJsonImport = useCallback(async () => {
    if (!jsonText.trim()) return;

    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const parsed = JSON.parse(jsonText);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.isArray(parsed) ? parsed : { items: parsed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Import failed");
      }

      const data = await res.json();
      setResult({ imported: data.imported, skipped: data.skipped, withUrls: data.withUrls ?? 0 });
      setJsonText("");
      onImported();
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON — make sure you copied the full output from the browser console");
      } else {
        setError(err instanceof Error ? err.message : "Import failed");
      }
    } finally {
      setImporting(false);
    }
  }, [jsonText, onImported]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setDialogOpen(true)}
      >
        <Upload className="size-3.5" />
        Import
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setResult(null);
            setError(null);
            setPhotoResult(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Items</DialogTitle>
            <DialogDescription>
              Import sold items from a Vinted export spreadsheet or paste JSON from the scraper script.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {/* File upload */}
            <div>
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={importing}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="size-4" />
                Upload Excel file (.xlsx)
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileImport(file);
                  e.target.value = "";
                }}
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <div className="h-px flex-1 bg-zinc-800" />
              or
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            {/* JSON paste */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Paste JSON from scraper
              </label>
              <textarea
                rows={4}
                placeholder={'[{"title":"Vintage Levis 501","brand":"Levis","condition":"Good","size":"W32","price":25}]'}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="w-full rounded-lg border border-input bg-zinc-900 px-2.5 py-2 text-xs font-mono placeholder:text-zinc-500 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full gap-1.5"
                disabled={importing || !jsonText.trim()}
                onClick={handleJsonImport}
              >
                <ClipboardPaste className="size-3.5" />
                {importing ? "Importing..." : "Import JSON"}
              </Button>
            </div>

            {/* Result / error */}
            {result && (
              <div className="space-y-2">
                <p className="text-sm text-emerald-400">
                  Imported {result.imported} items{result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}
                </p>
                {result.withUrls && result.withUrls > 0 && !photoResult && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-sm text-zinc-300">
                      {result.withUrls} item{result.withUrls === 1 ? " has" : "s have"} Vinted URLs — fetch photos?
                    </p>
                    <p className="mt-1 text-xs text-zinc-300">
                      This will try to download photos from each Vinted listing. Anti-bot protection may block some requests.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 gap-1.5"
                      disabled={fetchingPhotos}
                      onClick={async () => {
                        setFetchingPhotos(true);
                        try {
                          // Fetch all items that have a vintedUrl but no photos
                          const invRes = await fetch("/api/inventory?status=all");
                          const invData = await invRes.json();
                          const targetIds = invData.items
                            .filter((i: Record<string, unknown>) =>
                              i.vintedUrl && (!i.photoUrls || (i.photoUrls as string[]).length === 0),
                            )
                            .map((i: Record<string, unknown>) => i.id);

                          if (targetIds.length === 0) {
                            setPhotoResult({ succeeded: 0, blocked: 0, failed: 0 });
                            return;
                          }

                          const res = await fetch("/api/inventory/fetch-photos", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ itemIds: targetIds }),
                          });
                          const data = await res.json();
                          setPhotoResult({
                            succeeded: data.succeeded ?? 0,
                            blocked: data.blocked ?? 0,
                            failed: data.failed ?? 0,
                          });
                          onImported();
                        } catch {
                          setPhotoResult({ succeeded: 0, blocked: 0, failed: 0 });
                        } finally {
                          setFetchingPhotos(false);
                        }
                      }}
                    >
                      {fetchingPhotos ? (
                        <RefreshCw className="size-3 animate-spin" />
                      ) : (
                        <Download className="size-3.5" />
                      )}
                      {fetchingPhotos ? "Fetching photos..." : "Fetch Photos"}
                    </Button>
                  </div>
                )}
                {photoResult && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-sm text-zinc-300">
                      Photos: {photoResult.succeeded} fetched
                      {photoResult.blocked > 0 && `, ${photoResult.blocked} blocked by anti-bot`}
                      {photoResult.failed > 0 && `, ${photoResult.failed} failed`}
                    </p>
                    {photoResult.blocked > 0 && (
                      <p className="mt-1 text-xs text-zinc-300">
                        For blocked items, open each item and use the "Fetch Photos" button, or visit the Vinted URL with the browser extension active.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
