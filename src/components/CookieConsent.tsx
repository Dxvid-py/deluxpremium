import { useEffect, useState } from "react";
import { Cookie, Settings2, X } from "lucide-react";
import {
  getPrivacyConsent,
  savePrivacyConsent,
  type PrivacyConsent,
} from "@/lib/privacy-consent";
import { useI18n } from "@/lib/i18n";

export default function CookieConsent() {
  const { lang } = useI18n();
  const [consent, setConsent] = useState<PrivacyConsent | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const sync = () => {
      const current = getPrivacyConsent();
      setConsent(current);
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
    };

    sync();
    const openSettings = () => setPanelOpen(true);
    window.addEventListener("deluxury:open-cookie-settings", openSettings);
    return () => window.removeEventListener("deluxury:open-cookie-settings", openSettings);
  }, []);

  const t = lang === "en"
    ? {
        title: "Your privacy matters",
        body: "Deluxury uses necessary storage to keep the site working and remembers your preferences. Optional analytics and marketing storage stay off until you choose otherwise.",
        necessary: "Necessary",
        analytics: "Analytics",
        marketing: "Marketing",
        always: "Always active",
        off: "Off",
        accept: "Accept all",
        necessaryOnly: "Necessary only",
        settings: "Cookie settings",
        save: "Save choices",
        privacy: "Privacy policy",
        cookies: "Cookie policy",
        close: "Close",
        settingsNote: "This version does not load optional analytics or advertising providers unless you enable them.",
      }
    : {
        title: "Tu privacidad importa",
        body: "Deluxury usa almacenamiento necesario para que el sitio funcione y recuerde tus preferencias. El almacenamiento opcional de analítica y marketing queda apagado hasta que tú lo elijas.",
        necessary: "Necesarias",
        analytics: "Analítica",
        marketing: "Marketing",
        always: "Siempre activas",
        off: "Apagado",
        accept: "Aceptar todas",
        necessaryOnly: "Solo necesarias",
        settings: "Preferencias de cookies",
        save: "Guardar preferencias",
        privacy: "Política de privacidad",
        cookies: "Política de cookies",
        close: "Cerrar",
        settingsNote: "En esta versión no se cargan proveedores opcionales de analítica o publicidad salvo que los actives.",
      };

  const persist = (nextAnalytics: boolean, nextMarketing: boolean) => {
    const saved = savePrivacyConsent({
      analytics: nextAnalytics,
      marketing: nextMarketing,
    });
    setConsent(saved);
    setAnalytics(saved.analytics);
    setMarketing(saved.marketing);
    setPanelOpen(false);
  };

  const bannerVisible = !consent && !panelOpen;

  return (
    <>
      {(bannerVisible || panelOpen) && (
        <div className="fixed inset-x-3 bottom-3 z-[110] mx-auto max-w-3xl">
          <div className="rounded-3xl border border-primary/15 bg-[#fffaf4]/95 p-5 shadow-[0_30px_100px_-45px_rgba(53,31,20,.55)] backdrop-blur-2xl sm:p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/8 text-primary">
                <Cookie className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Deluxury · Privacidad</p>
                    <h2 className="mt-1 font-display text-2xl sm:text-3xl">{panelOpen ? t.settings : t.title}</h2>
                  </div>
                  {panelOpen && (
                    <button type="button" onClick={() => setPanelOpen(false)} aria-label={t.close} className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {!panelOpen ? (
                  <>
                    <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">{t.body}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" onClick={() => persist(false, false)} className="rounded-full border border-border px-4 py-2.5 text-[10px] tracking-[.14em] uppercase hover:border-primary/50">{t.necessaryOnly}</button>
                      <button type="button" onClick={() => persist(true, true)} className="rounded-full bg-primary px-4 py-2.5 text-[10px] tracking-[.14em] text-primary-foreground uppercase hover:opacity-90">{t.accept}</button>
                      <button type="button" onClick={() => setPanelOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-[10px] tracking-[.14em] uppercase hover:border-primary/50"><Settings2 className="h-3.5 w-3.5" />{t.settings}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-5 space-y-3">
                      <div className="rounded-2xl border border-border bg-white/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium">{t.necessary}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.always}</p>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-[9px] tracking-[.12em] text-primary uppercase">{t.always}</span>
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-white/70 p-4">
                        <span><span className="text-sm font-medium">{t.analytics}</span><span className="mt-1 block text-xs text-muted-foreground">{t.off}</span></span>
                        <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                      </label>
                      <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-border bg-white/70 p-4">
                        <span><span className="text-sm font-medium">{t.marketing}</span><span className="mt-1 block text-xs text-muted-foreground">{t.off}</span></span>
                        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--primary)]" />
                      </label>
                    </div>
                    <p className="mt-4 text-[10px] leading-relaxed text-muted-foreground">{t.settingsNote}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button type="button" onClick={() => persist(analytics, marketing)} className="rounded-full bg-primary px-4 py-2.5 text-[10px] tracking-[.14em] text-primary-foreground uppercase hover:opacity-90">{t.save}</button>
                      <button type="button" onClick={() => persist(false, false)} className="rounded-full border border-border px-4 py-2.5 text-[10px] tracking-[.14em] uppercase hover:border-primary/50">{t.necessaryOnly}</button>
                    </div>
                  </>
                )}

                <div className="mt-4 flex flex-wrap gap-4 text-[10px] tracking-[.08em] text-muted-foreground uppercase">
                  <a href="/privacidad" className="hover:text-primary">{t.privacy}</a>
                  <a href="/cookies" className="hover:text-primary">{t.cookies}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {consent && !panelOpen && (
        <button type="button" onClick={() => setPanelOpen(true)} className="fixed bottom-3 left-3 z-[105] hidden rounded-full border border-primary/15 bg-white/90 px-3 py-2 text-[9px] tracking-[.12em] text-muted-foreground uppercase shadow-sm backdrop-blur-md sm:inline-flex">
          {t.settings}
        </button>
      )}
    </>
  );
}
