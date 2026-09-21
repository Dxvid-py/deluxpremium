import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/cookies")({ component: CookiesPage });

function CookiesPage() {
  const { lang } = useI18n();
  const en = lang === "en";
  const rows = en
    ? [
        ["deluxury_cookie_consent_v1", "Preference / consent", "Stores the choices you make for optional cookie categories.", "Up to 180 days"],
        ["Browser local storage", "Necessary preference state", "Language and some application/session preferences may use local storage rather than cookies.", "Depends on browser/app behavior"],
      ]
    : [
        ["deluxury_cookie_consent_v1", "Preferencia / consentimiento", "Guarda las decisiones sobre categorías opcionales de cookies.", "Hasta 180 días"],
        ["Almacenamiento local del navegador", "Estado de preferencias necesario", "El idioma y algunas preferencias de la aplicación/sesión pueden usar almacenamiento local en lugar de cookies.", "Depende del navegador y la aplicación"],
      ];

  const openSettings = () => window.dispatchEvent(new Event("deluxury:open-cookie-settings"));

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-32 md:px-8 md:pt-40">
      <p className="eyebrow">Deluxury · Cookies</p>
      <h1 className="mt-4 font-display text-5xl leading-none md:text-7xl">{en ? "Cookie policy" : "Política de cookies"}</h1>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{en ? "Deluxury distinguishes necessary technology from optional analytics or marketing storage. This version keeps optional categories off until the visitor chooses them." : "Deluxury distingue la tecnología necesaria del almacenamiento opcional de analítica o marketing. En esta versión, las categorías opcionales permanecen apagadas hasta que el visitante las elige."}</p>
      <div className="mt-8 rounded-3xl border border-primary/15 bg-white/65 p-6 md:p-8">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-border text-[9px] tracking-[.16em] text-muted-foreground uppercase"><tr><th className="px-3 py-3">{en ? "Item" : "Elemento"}</th><th className="px-3 py-3">{en ? "Type" : "Tipo"}</th><th className="px-3 py-3">{en ? "Purpose" : "Finalidad"}</th><th className="px-3 py-3">{en ? "Duration" : "Duración"}</th></tr></thead>
            <tbody>
              {rows.map((row) => <tr key={row[0]} className="border-b border-border/70 last:border-0"><td className="px-3 py-4 font-medium">{row[0]}</td><td className="px-3 py-4">{row[1]}</td><td className="px-3 py-4 text-muted-foreground">{row[2]}</td><td className="px-3 py-4 text-muted-foreground">{row[3]}</td></tr>)}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={openSettings} className="mt-6 rounded-full bg-primary px-5 py-3 text-[10px] tracking-[.16em] text-primary-foreground uppercase">{en ? "Manage cookie settings" : "Gestionar preferencias"}</button>
      </div>
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{en ? "Technical note: adding analytics or advertising vendors later should be accompanied by consent gating and an update to this policy." : "Nota técnica: si más adelante se añaden proveedores de analítica o publicidad, deben quedar condicionados al consentimiento correspondiente y esta política debe actualizarse."}</p>
    </main>
  );
}
