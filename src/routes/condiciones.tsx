import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/condiciones")({
  head: () => ({
    meta: [
      { title: "Términos y condiciones · Deluxury Floristería" },
      {
        name: "description",
        content:
          "Términos y condiciones de uso, compras, pagos, entregas y servicios de Deluxury Floristería.",
      },
    ],
  }),
  component: ConditionsPage,
});

function ConditionsPage() {
  const { lang } = useI18n();
  const en = lang === "en";

  const sections = en
    ? [
        ["1. Acceptance", "By browsing the site, creating an account or placing an order, you agree to these Terms and Conditions. If you do not agree, please do not use the purchasing services."],
        ["2. Products and availability", "Deluxury makes reasonable efforts to keep photographs, descriptions and prices accurate. Because flowers are natural and availability changes, colors, varieties, foliage or small presentation details may vary while preserving the nature and value of the purchased design."],
        ["3. Prices and orders", "Prices are shown in Colombian pesos (COP). The applicable price is the one shown at checkout, except in the event of an obvious publication error. An order is confirmed when the platform records the order and, when applicable, the payment is approved."],
        ["4. Payments", "Payments are processed through the payment methods enabled on the website and may involve specialized third-party payment providers. Deluxury does not request banking passwords or card security codes through informal channels."],
        ["5. Delivery", "Delivery is subject to coverage, product availability, the requested date and the information supplied by the customer. The customer is responsible for providing a complete and accurate address and contact information."],
        ["6. Personalized and perishable products", "Some floral designs are prepared according to customer specifications and many products are perishable. Cancellations, changes and withdrawal rights may therefore be subject to the exceptions and conditions established by applicable Colombian consumer law."],
        ["7. Changes, cancellations and guarantees", "Requests related to changes, cancellations, defects, guarantees or non-conformity should be submitted through Deluxury's official contact channels with the order information. Each case will be reviewed under the applicable consumer-protection rules."],
        ["8. User accounts", "Users must provide accurate information and protect their account credentials. Google sign-in and other authentication methods are subject to the corresponding provider's terms and privacy policies."],
        ["9. Florencio", "Florencio is a floral assistant designed to help customers discover real Deluxury products. His suggestions are informational and do not guarantee stock, delivery, price or suitability. The current catalog and checkout determine the final product information."],
        ["10. Intellectual property", "Deluxury's name, logo, photographs, texts, designs, videos, interfaces and other original materials may be protected by intellectual-property rules and may not be reproduced or commercially used without authorization, except where the law allows it."],
        ["11. Privacy", "Personal information is handled according to Deluxury's Privacy Policy and applicable Colombian law. The Privacy Policy is complementary to these Terms and Conditions."],
        ["12. Contact and consumer rights", "Customers may submit questions, requests, complaints or claims through Deluxury's official channels. Nothing in these terms is intended to limit mandatory rights granted to consumers by Colombian law."],
        ["13. Applicable law and updates", "These terms are governed by the laws of the Republic of Colombia. Deluxury may update them when its services, processes or legal requirements change. The current version will always be available at www.floristeriadeluxury.com/condiciones."],
      ]
    : [
        ["1. Aceptación", "Al navegar por el sitio, crear una cuenta o realizar un pedido, aceptas estos Términos y Condiciones. Si no estás de acuerdo, debes abstenerte de utilizar los servicios de compra."],
        ["2. Productos y disponibilidad", "Deluxury procura mantener actualizadas las fotografías, descripciones y precios. Debido a que las flores son productos naturales y su disponibilidad puede variar, pueden existir pequeñas diferencias de color, variedad, follaje o presentación, conservando la esencia y el valor del diseño adquirido."],
        ["3. Precios y pedidos", "Los precios se muestran en pesos colombianos (COP). El precio aplicable será el informado durante el proceso de compra, salvo errores manifiestos de publicación. Un pedido se considera confirmado cuando la plataforma registra correctamente la orden y, cuando corresponda, el pago es aprobado."],
        ["4. Pagos", "Los pagos se procesan mediante los medios habilitados en el sitio y pueden involucrar proveedores especializados de pago. Deluxury no solicita contraseñas bancarias ni códigos de seguridad de tarjetas mediante canales informales."],
        ["5. Entregas", "Las entregas están sujetas a cobertura, disponibilidad del producto, fecha solicitada y datos suministrados por el cliente. El cliente es responsable de proporcionar una dirección y datos de contacto completos y correctos."],
        ["6. Productos personalizados y perecederos", "Algunos arreglos florales se elaboran según las especificaciones del cliente y muchos productos son perecederos. Por ello, las cancelaciones, cambios y el derecho de retracto pueden estar sujetos a las excepciones y condiciones establecidas por la legislación colombiana de protección al consumidor."],
        ["7. Cambios, cancelaciones y garantías", "Las solicitudes relacionadas con cambios, cancelaciones, defectos, garantías o falta de conformidad deberán presentarse mediante los canales oficiales de Deluxury, indicando la información del pedido. Cada caso será revisado conforme a las normas de protección al consumidor aplicables."],
        ["8. Cuentas de usuario", "El usuario debe proporcionar información verdadera y mantener seguras sus credenciales. El inicio de sesión con Google y otros métodos de autenticación están sujetos a las condiciones y políticas de privacidad de sus respectivos proveedores."],
        ["9. Florencio", "Florencio es un asistente floral diseñado para ayudar a descubrir productos reales de Deluxury. Sus recomendaciones son orientativas y no garantizan disponibilidad, entrega, precio o adecuación. La información definitiva es la que aparece en el catálogo y durante el proceso de compra."],
        ["10. Propiedad intelectual", "El nombre, logotipo, fotografías, textos, diseños, videos, interfaces y demás materiales originales de Deluxury pueden estar protegidos por normas de propiedad intelectual y no podrán reproducirse o utilizarse comercialmente sin autorización, salvo cuando la ley permita hacerlo."],
        ["11. Privacidad", "Los datos personales se tratan de acuerdo con la Política de Privacidad de Deluxury y la legislación colombiana aplicable. La Política de Privacidad complementa estos Términos y Condiciones."],
        ["12. Contacto y derechos del consumidor", "Los clientes pueden presentar consultas, peticiones, quejas o reclamos mediante los canales oficiales de Deluxury. Nada de estos términos pretende limitar los derechos irrenunciables reconocidos a los consumidores por la legislación colombiana."],
        ["13. Ley aplicable y actualizaciones", "Estos términos se rigen por las leyes de la República de Colombia. Deluxury podrá actualizarlos cuando cambien sus servicios, procesos o requisitos legales. La versión vigente estará disponible en www.floristeriadeluxury.com/condiciones."],
      ];

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-32 md:px-8 md:pt-40">
      <p className="eyebrow">Deluxury · {en ? "Terms" : "Condiciones"}</p>
      <h1 className="mt-4 font-display text-5xl leading-none md:text-7xl">
        {en ? "Terms & conditions" : "Términos y condiciones"}
      </h1>
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {en
          ? "Last reviewed: 26 September 2026."
          : "Última actualización: 26 de septiembre de 2026."}
      </p>

      <div className="mt-10 space-y-4">
        {sections.map(([title, body]) => (
          <section
            key={title}
            className="rounded-3xl border border-border bg-white/65 p-6 shadow-[0_20px_60px_-45px_rgba(55,31,17,.3)] md:p-8"
          >
            <h2 className="font-display text-3xl">{title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
