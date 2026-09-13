import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Send, ShoppingBag, Sparkles, X } from "lucide-react";
import { categoriesQuery, productsQuery, type Product } from "@/lib/queries";
import { useStore } from "@/lib/store";
import { useContentTranslator } from "@/lib/i18n";
import {
  formatLorenzoFilters,
  hasUsefulFilters,
  parseLorenzoFilters,
  recommendProducts,
  type LorenzoFilters,
  type LorenzoRecommendation,
} from "@/lib/lorenzo-recommendations";

const GREETING_VIDEO = "/video/florencio-saludando.webm";
const PRODUCT_VIDEO = "/video/florencio-con-ramo.webm";

type Message = {
  id: number;
  from: "lorenzo" | "user";
  text: string;
  recommendations?: LorenzoRecommendation[];
};

function money(price: number) {
  return `$${Number(price).toLocaleString("es-CO")}`;
}

export default function LorenzoChat() {
  const { add, setCartOpen, lines } = useStore();
  const { data: products = [], isLoading: productsLoading } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const tc = useContentTranslator([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const idRef = useRef(1);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [filters, setFilters] = useState<LorenzoFilters>({});
  const [video, setVideo] = useState(GREETING_VIDEO);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      from: "lorenzo",
      text: "¡Hola! Soy Lorenzo 🧸. Cuéntame qué detalle quieres encontrar y te ayudo a elegir algo especial de Deluxury.",
    },
  ]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  useEffect(() => {
    const onProductSelected = () => setVideo(PRODUCT_VIDEO);
    window.addEventListener("florencio:product-selected", onProductSelected);
    return () => window.removeEventListener("florencio:product-selected", onProductSelected);
  }, []);

  const ask = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    const parsed = parseLorenzoFilters(clean);
    const nextFilters: LorenzoFilters = {
      ...filters,
      ...Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined && value !== "")),
      query: clean,
    };

    setFilters(nextFilters);
    setInput("");
    setVideo(PRODUCT_VIDEO);

    const currentRecommendations = recommendProducts(products, categories, nextFilters, 3);
    const filterLabels = formatLorenzoFilters(nextFilters);

    let response = "Perfecto. Déjame cruzar eso con los productos reales de Deluxury… ✨";
    if (productsLoading) {
      response = "Perfecto. Estoy cargando nuestro catálogo para buscarte algo que encaje de verdad. ✨";
    } else if (currentRecommendations.length) {
      response = filterLabels.length
        ? `Listo. Busqué ${filterLabels.join(" · ")}. Encontré estas opciones y te marco por qué pueden funcionar. 🌷`
        : "Creo que estas opciones pueden gustarte. Las ordené por qué tan bien encajan con lo que me contaste. 🌷";
    } else {
      response = "No encontré una coincidencia perfecta con esos filtros. Puedo abrir un poco el rango y enseñarte las opciones más cercanas. 💐";
    }

    setMessages((prev) => [
      ...prev,
      { id: idRef.current++, from: "user", text: clean },
      { id: idRef.current++, from: "lorenzo", text: response, recommendations: currentRecommendations },
    ]);
  };

  const addRecommendation = (product: Product) => {
    add(product);
    setVideo(PRODUCT_VIDEO);
    setMessages((prev) => [
      ...prev,
      {
        id: idRef.current++,
        from: "lorenzo",
        text: `¡Excelente elección! 🧸 Añadí ${tc(product.name)} al carrito. Si quieres, también puedo ayudarte a buscar un complemento.`,
      },
    ]);
  };

  const quickQuestions = [
    "Un regalo para mi novia",
    "Algo para un aniversario",
    "Tengo $200.000 de presupuesto",
  ];

  return (
    <>
      <div className="fixed right-3 bottom-4 z-[70] sm:right-6 sm:bottom-6">
        {open ? (
          <div className="w-[min(390px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-primary/15 bg-background/98 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 overflow-hidden rounded-full border border-primary/20 bg-secondary shadow-sm">
                  <video src={video} autoPlay muted playsInline className="h-full w-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-display text-lg">
                    Lorenzo <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">Asistente Deluxury</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar chat" className="rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="max-h-[min(58vh,560px)] min-h-[330px] space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
              {messages.map((message) => (
                <div key={message.id} className={message.from === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={message.from === "user" ? "max-w-[82%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-xs text-primary-foreground" : "max-w-[92%] rounded-2xl rounded-bl-md bg-secondary px-3.5 py-3 text-xs text-foreground"}>
                    <div className="whitespace-pre-wrap leading-relaxed">{message.text}</div>
                    {message.recommendations?.length ? (
                      <div className="mt-3 space-y-2">
                        {message.recommendations.map((product) => (
                          <div key={product.id} className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                            <div className="flex gap-3 p-2.5">
                              <img src={product.images?.[0] ?? "/img/prod-01.jpg"} alt={tc(product.name)} className="h-20 w-16 shrink-0 rounded-xl object-cover" />
                              <div className="min-w-0 flex-1">
                                <p className="font-display text-sm leading-tight">{tc(product.name)}</p>
                                <p className="mt-1 text-xs text-primary">{money(Number(product.price_cop))}</p>
                                {product.reasons.length ? <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">{product.reasons.join(" · ")}</p> : null}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 border-t border-border/60 p-2">
                              <button type="button" onClick={() => window.location.assign(`/producto/${product.slug}`)} className="rounded-xl border border-border px-2 py-2 text-[10px] tracking-wide uppercase hover:bg-secondary">Ver producto</button>
                              <button type="button" onClick={() => addRecommendation(product)} className="rounded-xl bg-primary px-2 py-2 text-[10px] tracking-wide text-primary-foreground uppercase"><ShoppingBag className="mr-1 inline h-3 w-3" />Agregar</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}

              {!messages.some((message) => message.recommendations?.length) && !hasUsefulFilters(filters) ? (
                <div className="pt-1">
                  <p className="mb-2 px-1 text-[10px] tracking-[0.15em] text-muted-foreground uppercase">Prueba decirme…</p>
                  <div className="flex flex-wrap gap-2">
                    {quickQuestions.map((question) => (
                      <button key={question} type="button" onClick={() => ask(question)} className="rounded-full border border-border bg-background px-3 py-2 text-[10px] hover:border-primary hover:text-primary">{question}</button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border/70 p-3">
              <div className="mb-2 flex items-center justify-between px-1 text-[10px] text-muted-foreground">
                <span>{lines.length ? `${lines.reduce((sum, line) => sum + line.qty, 0)} artículo(s) en tu carrito` : "Lorenzo busca en el catálogo real"}</span>
                {lines.length ? <button type="button" onClick={() => setCartOpen(true)} className="font-medium text-primary hover:underline">Ver carrito</button> : null}
              </div>
              <form onSubmit={(event) => { event.preventDefault(); ask(input); }} className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 p-1.5 pl-3">
                <input ref={inputRef} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Cuéntame qué necesitas…" className="min-w-0 flex-1 bg-transparent py-2 text-xs outline-none placeholder:text-muted-foreground" />
                <button type="submit" aria-label="Enviar" disabled={!input.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40"><Send className="h-3.5 w-3.5" /></button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <button type="button" onClick={() => setOpen(true)} className="group relative h-[104px] w-[104px] overflow-hidden rounded-full border border-primary/20 bg-secondary p-1 shadow-[0_20px_55px_-22px_rgba(0,0,0,0.65)] transition-transform duration-500 hover:scale-105 sm:h-[122px] sm:w-[122px]" aria-label="Abrir chat con Lorenzo">
              <video src={video} autoPlay muted loop playsInline preload="metadata" className="h-full w-full rounded-full object-cover" />
              <span className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full border border-background bg-primary text-primary-foreground shadow-sm"><MessageCircle className="h-3.5 w-3.5" /></span>
            </button>
            <button type="button" onClick={() => setOpen(true)} className="rounded-full border border-primary/15 bg-background/95 px-3.5 py-2 text-[10px] font-medium shadow-lg backdrop-blur-md transition hover:border-primary hover:text-primary">¿Te ayudo a elegir? ✨</button>
          </div>
        )}
      </div>

      {open ? <button type="button" aria-label="Cerrar chat" onClick={() => setOpen(false)} className="fixed inset-0 z-[60] cursor-default bg-black/10 sm:bg-transparent" /> : null}
    </>
  );
}
