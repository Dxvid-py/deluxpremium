import { useState } from "react";
import { toast } from "sonner";
import { Download, Loader2 } from "lucide-react";
import type { Category, Product } from "@/lib/queries";

type Props = { products: Product[]; categories: Category[] };

const clean = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .slice(0, 60) || "PRODUCTO";

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function extensionOf(url: string, mime: string) {
  const fromUrl = (url.split("?")[0] ?? "").match(/\.(jpe?g|png|webp|gif|avif)$/i)?.[1];
  if (fromUrl) return fromUrl.toLowerCase().replace("jpeg", "jpg");
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

function download(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

export default function ExportCatalogButton({ products, categories }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Sin colección";

  const exportZip = async () => {
    if (!products.length) { toast.error("No hay productos para exportar"); return; }
    setBusy(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const folder = zip.folder("imagenes")!;
      const rows: Array<{ p: Product; files: string[] }> = [];
      const failed: string[] = [];
      let done = 0;

      for (const p of products) {
        const files: string[] = [];
        const urls = (p.images ?? []).filter(Boolean);
        for (const [i, url] of urls.entries()) {
          setProgress(`Descargando imagen ${++done}…`);
          try {
            const res = await fetch(new URL(url, window.location.origin).toString());
            if (!res.ok) throw new Error(String(res.status));
            const blob = await res.blob();
            const name = `${clean(p.name)}_${i + 1}.${extensionOf(url, blob.type)}`;
            folder.file(name, blob);
            files.push(name);
          } catch {
            failed.push(`${p.name} (${url})`);
          }
        }
        rows.push({ p, files });
      }

      // CSV: se abre directo en Excel y en Google Sheets / Docs (BOM para tildes).
      const header = ["Nombre", "Precio COP", "Colección", "Activo", "Imágenes (archivos)", "URL original"];
      const csv = [
        header.map(csvCell).join(","),
        ...rows.map(({ p, files }) =>
          [p.name.toUpperCase(), Number(p.price_cop), categoryName(p.category_id), p.is_active ? "Sí" : "No", files.join(" | "), (p.images ?? []).join(" | ")]
            .map(csvCell)
            .join(","),
        ),
      ].join("\r\n");
      zip.file("productos.csv", "\uFEFF" + csv);

      // HTML imprimible: imagen + nombre + precio (se puede abrir, imprimir a PDF o pegar en Docs).
      const money = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
      const cards = rows
        .map(({ p, files }) => `<article><img src="imagenes/${esc(files[0] ?? "")}" alt="${esc(p.name)}"><h2>${esc(p.name.toUpperCase())}</h2><p>${money.format(Number(p.price_cop))}</p></article>`)
        .join("\n");
      zip.file(
        "catalogo.html",
        `<!doctype html><html lang="es"><meta charset="utf-8"><title>Catálogo Deluxury</title><style>body{font-family:Georgia,serif;margin:32px;color:#222}h1{font-weight:400}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:24px}article{break-inside:avoid;border:1px solid #e5ddd0;padding:12px}img{width:100%;aspect-ratio:4/5;object-fit:cover}h2{font-size:14px;letter-spacing:.08em;margin:12px 0 4px}p{margin:0;color:#a8793a}</style><h1>Catálogo Deluxury</h1><main>${cards}</main></html>`,
      );
      if (failed.length) zip.file("imagenes_no_descargadas.txt", failed.join("\n"));

      setProgress("Comprimiendo…");
      const blob = await zip.generateAsync({ type: "blob" });
      download(blob, `catalogo-deluxury-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success(failed.length ? `Exportado. ${failed.length} imagen(es) no se pudieron descargar (ver imagenes_no_descargadas.txt)` : "Catálogo exportado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo exportar el catálogo");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const exportCsv = () => {
    const csv = [
      ["Nombre", "Precio COP", "Colección", "Activo", "Imagen principal"].map(csvCell).join(","),
      ...products.map((p) =>
        [p.name.toUpperCase(), Number(p.price_cop), categoryName(p.category_id), p.is_active ? "Sí" : "No", p.images?.[0] ?? ""].map(csvCell).join(","),
      ),
    ].join("\r\n");
    download(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), "productos-deluxury.csv");
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void exportZip()}
        disabled={busy}
        className="inline-flex items-center gap-2 border border-border px-5 py-3 text-[10px] tracking-[0.2em] uppercase hover:border-primary disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        {busy ? progress || "Exportando…" : "Exportar catálogo (ZIP)"}
      </button>
      <button
        type="button"
        onClick={exportCsv}
        disabled={busy}
        className="inline-flex items-center gap-2 px-2 py-3 text-[10px] tracking-[0.2em] text-muted-foreground uppercase hover:text-primary disabled:opacity-50"
      >
        Solo lista (CSV)
      </button>
    </div>
  );
}
