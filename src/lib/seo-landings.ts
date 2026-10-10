/**
 * Páginas de aterrizaje para búsquedas locales ("flores a domicilio Barranquilla", "rosas Barranquilla"…).
 * Cada una tiene contenido propio, preguntas frecuentes y productos reales filtrados.
 */
export type Landing = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string[];
  /** Regex (sobre categoría + nombre + descripción + etiquetas) para elegir productos. */
  match: RegExp;
  faq: Array<{ q: string; a: string }>;
  cta: string;
};

const DELIVERY_FAQ = {
  q: "¿Con cuánto tiempo de anticipación debo pedir?",
  a: "Para entrega el mismo día, haz tu pedido en la mañana con mínimo 4 horas de anticipación a la hora de entrega. También puedes programar tu pedido para otro día y elegir la hora que prefieras al pagar.",
};
const PAY_FAQ = {
  q: "¿Cómo puedo pagar?",
  a: "Pagas en línea de forma segura con Bold (tarjetas y otros medios disponibles). Si prefieres, también puedes escribirnos por WhatsApp y te ayudamos con tu pedido.",
};

export const LANDINGS: Landing[] = [
  {
    slug: "flores-a-domicilio-barranquilla",
    title: "Flores a domicilio en Barranquilla · Entrega el mismo día | Deluxury",
    h1: "Flores a domicilio en Barranquilla",
    description: "Pide flores a domicilio en Barranquilla: ramos, rosas, cajas y arreglos de lujo hechos a mano. Elige día y hora de entrega y paga en línea.",
    intro: [
      "En Deluxury creamos arreglos florales de autor y los llevamos hasta la puerta de quien más quieres en Barranquilla. Cada pieza se arma a mano, con flor colombiana e importada, y se entrega con empaque firmado y tarjeta con tu dedicatoria.",
      "Tú eliges el día y la hora de entrega desde un calendario con los horarios realmente disponibles. Si necesitas el pedido para hoy, hazlo en la mañana con al menos 4 horas de anticipación.",
    ],
    match: /./,
    faq: [DELIVERY_FAQ, PAY_FAQ, { q: "¿Entregan en toda Barranquilla?", a: "Entregamos en Barranquilla. Si tu destino está en otro municipio del Atlántico, escríbenos por WhatsApp y confirmamos cobertura y tiempos." }],
    cta: "Ver todos los arreglos",
  },
  {
    slug: "rosas-barranquilla",
    title: "Rosas a domicilio en Barranquilla · Ramos y cajas de rosas | Deluxury",
    h1: "Rosas en Barranquilla",
    description: "Ramos y cajas de rosas de tallo largo en Barranquilla, hechos a mano y entregados a domicilio. Rosas rojas, rosadas y blancas para cada ocasión.",
    intro: [
      "Las rosas son el detalle que nunca falla. En Deluxury seleccionamos cada tallo por apertura, color y firmeza, y los componemos en ramos, cajas y arreglos pensados para sorprender.",
      "Elige tu color favorito, programa la entrega en Barranquilla y deja que nosotros nos encarguemos del resto: empaque, tarjeta manuscrita y cinta anudada a mano.",
    ],
    match: /rosa/i,
    faq: [
      { q: "¿Puedo elegir el color de las rosas?", a: "Sí. Muchos arreglos vienen en distintos colores; si no ves el color que buscas, escríbenos por WhatsApp y consultamos disponibilidad de otra variante." },
      DELIVERY_FAQ,
      PAY_FAQ,
    ],
    cta: "Ver arreglos con rosas",
  },
  {
    slug: "flores-amor-aniversario-barranquilla",
    title: "Flores de amor y aniversario en Barranquilla | Deluxury",
    h1: "Flores de amor y aniversario en Barranquilla",
    description: "Arreglos florales románticos para aniversario, San Valentín o para decir te amo en Barranquilla. Rosas, cajas y ramos con entrega a domicilio.",
    intro: [
      "Para un aniversario, una declaración o un simple “pensé en ti”, nuestra colección de amor reúne rosas, cajas y ramos románticos, elegantes y listos para entregar en Barranquilla.",
      "Agrega tu dedicatoria al pagar y escribimos tu mensaje a mano en la tarjeta. Tú decides la fecha y la hora para que llegue justo cuando importa.",
    ],
    match: /amor|romant|aniversario|novia|pareja/i,
    faq: [
      { q: "¿Puedo incluir un mensaje personal?", a: "Sí. En el pago puedes escribir tu dedicatoria y la incluimos en una tarjeta manuscrita." },
      DELIVERY_FAQ,
      PAY_FAQ,
    ],
    cta: "Ver colección de amor",
  },
  {
    slug: "flores-cumpleanos-barranquilla",
    title: "Flores para cumpleaños en Barranquilla · Entrega a domicilio | Deluxury",
    h1: "Flores para cumpleaños en Barranquilla",
    description: "Regala flores de cumpleaños en Barranquilla: ramos y arreglos de lujo con entrega a domicilio y tarjeta personalizada.",
    intro: [
      "Un cumpleaños se celebra con detalles que se recuerdan. Elige un arreglo de nuestro atelier, personaliza la tarjeta y programa la entrega en Barranquilla a la hora que prefieras.",
    ],
    match: /cumple|celebra|fiesta|alegr/i,
    faq: [DELIVERY_FAQ, PAY_FAQ, { q: "¿Puedo sorprender a alguien?", a: "Claro. Indica el nombre de quien recibe y las notas para el mensajero, y coordinamos la entrega para que llegue como sorpresa." }],
    cta: "Ver arreglos de celebración",
  },
  {
    slug: "flores-condolencias-barranquilla",
    title: "Flores para condolencias y funerales en Barranquilla | Deluxury",
    h1: "Flores de condolencias en Barranquilla",
    description: "Arreglos y coronas de condolencias en Barranquilla: un homenaje sobrio y elegante con entrega a domicilio oportuna.",
    intro: [
      "En momentos de duelo, unas flores acompañan cuando las palabras no alcanzan. Nuestros arreglos de condolencias son sobrios y elegantes, y se entregan con el cuidado y el respeto que merece cada despedida.",
      "Si necesitas ayuda con tiempos o con el lugar de entrega, escríbenos por WhatsApp y lo coordinamos contigo.",
    ],
    match: /condol|pesame|fune|luto|homenaje|corona/i,
    faq: [
      { q: "¿Pueden entregar en una funeraria o sala de velación?", a: "Sí, indícanos el lugar y el horario en el pedido o escríbenos por WhatsApp para coordinarlo." },
      DELIVERY_FAQ,
      PAY_FAQ,
    ],
    cta: "Ver arreglos de condolencias",
  },
  {
    slug: "flores-bodas-eventos-barranquilla",
    title: "Flores para bodas y eventos en Barranquilla · Cotiza | Deluxury",
    h1: "Flores para bodas y eventos en Barranquilla",
    description: "Decoración floral para bodas y eventos en Barranquilla: arcos, centros de mesa y arreglos de lujo. Cotiza por WhatsApp.",
    intro: [
      "Diseñamos propuestas florales para bodas, aniversarios y eventos en Barranquilla: arcos, centros de mesa, ramos de novia y ambientación a la medida.",
      "Cada proyecto se cotiza de forma personalizada. Elige las piezas que te inspiran y escríbenos por WhatsApp: te respondemos con una propuesta.",
    ],
    match: /bod|evento|matrimon|novia|arco|centro de mesa/i,
    faq: [
      { q: "¿Cómo cotizo mi evento?", a: "Elige el arreglo que te interesa y usa el botón Cotizar: abre WhatsApp con el link del producto para que te respondamos con una propuesta." },
      { q: "¿Con cuánta anticipación debo escribir?", a: "Mientras más pronto, mejor. Para bodas y eventos recomendamos contactarnos con varias semanas de anticipación." },
    ],
    cta: "Ver bodas y eventos",
  },
];

export const findLanding = (slug: string) => LANDINGS.find((l) => l.slug === slug);

export const HOME_FAQ = [
  { q: "¿Hacen entrega de flores el mismo día en Barranquilla?", a: "Sí. Para entrega el mismo día, haz tu pedido en la mañana con mínimo 4 horas de anticipación a la hora de entrega." },
  { q: "¿Puedo elegir la hora de entrega?", a: "Sí. Al pagar eliges el día y el horario desde un calendario que solo muestra las horas realmente disponibles." },
  { q: "¿Cómo pago mi pedido?", a: "Pagas en línea de forma segura con Bold. Si prefieres, también puedes ayudarte por WhatsApp." },
  { q: "¿Puedo pedir flores para bodas y eventos?", a: "Sí. Los arreglos de bodas y eventos se cotizan de forma personalizada por WhatsApp." },
];
