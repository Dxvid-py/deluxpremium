import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "@/lib/store";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import CinematicIntro from "@/components/CinematicIntro";
import { LanguageProvider } from "@/lib/i18n";
import { useScrollProgress } from "@/hooks/use-reveal";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 font-display text-4xl">Esta página se marchitó</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          El enlace que buscas no existe o cambió de lugar.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-primary px-7 py-3.5 text-[11px] tracking-[0.26em] text-primary-foreground uppercase"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-3xl">Algo no cargó bien</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Puedes reintentar o volver al inicio.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-primary px-7 py-3.5 text-[11px] tracking-[0.26em] text-primary-foreground uppercase"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="border border-border px-7 py-3.5 text-[11px] tracking-[0.26em] uppercase"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Floristería Deluxe Premium · Atelier floral en Barranquilla" },
      {
        name: "description",
        content:
          "Arreglos florales de lujo hechos a mano en Barranquilla. Rosas premium, cajas firmadas y entrega el mismo día.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Jost:wght@200;300;400;500&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ScrollProgress() {
  useScrollProgress();
  return <div className="scroll-progress-bar" aria-hidden="true" />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <StoreProvider>
          <ScrollProgress />
          <CinematicIntro />
          <Header />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <main>
            <Outlet />
          </main>
          <Footer />
          <CartDrawer />
          <Toaster position="bottom-center" />
        </StoreProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
