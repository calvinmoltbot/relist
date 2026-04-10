"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, ClipboardPaste, X } from "lucide-react";
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
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        setResult({ imported: data.imported, skipped: data.skipped });
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
      setResult({ imported: data.imported, skipped: data.skipped });
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

            <div className="flex items-center gap-3 text-xs text-zinc-600">
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
                className="w-full rounded-lg border border-input bg-zinc-900 px-2.5 py-2 text-xs font-mono placeholder:text-zinc-700 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
              <p className="text-sm text-emerald-400">
                Imported {result.imported} items{result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}
              </p>
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
