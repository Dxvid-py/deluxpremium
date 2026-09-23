import { supabase } from "@/integrations/supabase/client";

type BoldCheckoutConfig = {
  orderId: string;
  currency: string;
  amount: string;
  apiKey: string;
  integritySignature: string;
  description: string;
  redirectionUrl: string;
  renderMode?: "embedded" | "redirect";
  customerData?: string;
  billingAddress?: string;
};

type BoldCheckoutInstance = {
  open: () => void;
};

declare global {
  interface Window {
    BoldCheckout?: new (config: BoldCheckoutConfig) => BoldCheckoutInstance;
  }
}

const BOLD_SCRIPT = "https://checkout.bold.co/library/boldPaymentButton.js";
let boldScriptPromise: Promise<void> | null = null;

function loadBoldScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Bold solo puede abrirse en el navegador."));
  if (window.BoldCheckout) return Promise.resolve();
  if (boldScriptPromise) return boldScriptPromise;

  boldScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${BOLD_SCRIPT}"]`);
    if (existing) {
      if (window.BoldCheckout) {
        resolve();
        return;
      }
      const onLoaded = () => { cleanup(); resolve(); };
      const onFailed = () => { cleanup(); reject(new Error("No se pudo cargar la pasarela de pagos de Bold.")); };
      const cleanup = () => {
        existing.removeEventListener("load", onLoaded);
        existing.removeEventListener("error", onFailed);
      };
      existing.addEventListener("load", onLoaded);
      existing.addEventListener("error", onFailed);
      return;
    }

    const script = document.createElement("script");
    script.src = BOLD_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar la pasarela de pagos de Bold."));
    document.head.appendChild(script);
  });

  return boldScriptPromise;
}

export type BoldPrepareResponse = {
  orderId: string;
  amount: number;
  currency: "COP";
  apiKey: string;
  integritySignature: string;
  description: string;
};

export async function prepareBoldPayment(orderNumber: string, callbackUrl: string) {
  const { data, error } = await supabase.functions.invoke("bold-payment", {
    body: { action: "prepare", orderNumber, callbackUrl },
  });
  if (error) throw new Error(error.message || "No se pudo preparar el pago.");
  if (!data?.apiKey || !data?.integritySignature || !data?.orderId) {
    throw new Error("Bold no devolvió una configuración de pago válida.");
  }
  return data as BoldPrepareResponse;
}

export async function openBoldCheckout(input: {
  payment: BoldPrepareResponse;
  callbackUrl: string;
  customer: { name: string; phone: string; email?: string | null };
  address: { address: string; city: string; country: string };
}) {
  await loadBoldScript();
  if (!window.BoldCheckout) throw new Error("La pasarela de Bold no está disponible.");

  const checkout = new window.BoldCheckout({
    orderId: input.payment.orderId,
    currency: input.payment.currency,
    amount: String(input.payment.amount),
    apiKey: input.payment.apiKey,
    integritySignature: input.payment.integritySignature,
    description: input.payment.description,
    redirectionUrl: input.callbackUrl,
    renderMode: "embedded",
    customerData: JSON.stringify({
      email: input.customer.email || undefined,
      fullName: input.customer.name,
      phone: input.customer.phone,
      dialCode: "+57",
    }),
    billingAddress: JSON.stringify({
      address: input.address.address,
      city: input.address.city,
      country: input.address.country,
    }),
  });

  checkout.open();
}

export async function getBoldPaymentStatus(orderNumber: string) {
  const { data, error } = await supabase.functions.invoke("bold-payment", {
    body: { action: "status", orderNumber },
  });
  if (error) throw new Error(error.message || "No se pudo consultar el estado del pago.");
  return data as {
    orderNumber: string;
    paymentStatus: string;
    orderStatus: string;
    transactionId?: string | null;
    found: boolean;
  };
}
