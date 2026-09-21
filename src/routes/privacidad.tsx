import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacidad")({ component: PrivacyPage });

function PrivacyPage() {
  const { lang } = useI18n();
  const en = lang === "en";
  const sections = en
    ? [
        ["Who is responsible", "Deluxury Floristería is the site operator. Current contact details published by the site include Barranquilla, Colombia, Carrera 43 #79-226, Local 1, WhatsApp 300 630 1123 and floristeriadeluxury@gmail.com. Verify and update these details with the business before publishing this page as a final legal notice."],
        ["What we process", "Depending on what you use, the site may process account information, delivery details, order information, cart/preferences, messages sent to Florencio, and technical/security information needed to operate the service."],
        ["Why we process it", "We use information to provide the requested website functions, manage accounts and orders, respond to inquiries, operate Florencio recommendations, maintain security, and remember selected preferences such as language."],
        ["Florencio and third parties", "When you use Florencio, your message and the minimum context needed for the assistant may be sent to the AI service used by Deluxury. The site also uses Supabase for application data/authentication. WhatsApp is only involved when you choose to contact the business there."],
        ["Your choices and rights", "You can change cookie choices from Cookie settings. For personal-data requests, contact Deluxury using the published contact channels. Requests may include access, correction, deletion or revocation where applicable under the law."],
        ["Retention", "Information is kept only for as long as necessary for the stated purposes, security, accounting/order records, or legal obligations that apply."],
      ]
    : [
        ["Responsable", "Deluxury Floristería es quien opera el sitio. Los datos de contacto actualmente publicados incluyen Barranquilla, Colombia, Carrera 43 #79-226, Local 1, WhatsApp 300 630 1123 y floristeriadeluxury@gmail.com. Verifica y actualiza estos datos con el negocio antes de publicar esta página como aviso legal definitivo."],
        ["Qué información tratamos", "Según lo que uses, el sitio puede tratar datos de cuenta, datos de entrega, información de pedidos, carrito/preferencias, mensajes enviados a Florencio y datos técnicos o de seguridad necesarios para operar el servicio."],
        ["Para qué la usamos", "Usamos la información para prestar las funciones solicitadas, gestionar cuentas y pedidos, responder consultas, operar las recomendaciones de Florencio, mantener la seguridad y recordar preferencias como el idioma seleccionado."],
        ["Florencio y terceros", "Cuando usas Florencio, tu mensaje y el contexto mínimo necesario para el asistente pueden enviarse al servicio de IA utilizado por Deluxury. El sitio también utiliza Supabase para datos de aplicación/autenticación. WhatsApp solo interviene cuando eliges contactar al negocio por ese canal."],
        ["Tus derechos y opciones", "Puedes cambiar tus preferencias de cookies desde Preferencias de cookies. Para solicitudes sobre datos personales, contacta a Deluxury mediante sus canales publicados. Las solicitudes pueden incluir acceso, actualización, supresión o revocación cuando corresponda legalmente."],
        ["Conservación", "La información se conserva solo durante el tiempo necesario para las finalidades indicadas, la seguridad, los registros de pedidos/contabilidad o las obligaciones legales aplicables."],
      ];

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-32 md:px-8 md:pt-40">
      <p className="eyebrow">Deluxury · {en ? "Privacy" : "Privacidad"}</p>
      <h1 className="mt-4 font-display text-5xl leading-none md:text-7xl">{en ? "Privacy policy" : "Política de privacidad"}</h1>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{en ? "Last reviewed: 21 September 2026. This page is a technical/legal-information template and should be reviewed against the business's final legal identity and processing practices before publication." : "Última revisión: 21 de septiembre de 2026. Esta página es una plantilla de información técnico-legal y debe revisarse con la identidad jurídica definitiva del negocio y sus prácticas reales de tratamiento antes de publicarse."}</p>
      <div className="mt-10 space-y-4">
        {sections.map(([title, body]) => (
          <section key={title} className="rounded-3xl border border-border bg-white/65 p-6 shadow-[0_20px_60px_-45px_rgba(55,31,17,.3)] md:p-8">
            <h2 className="font-display text-3xl">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
