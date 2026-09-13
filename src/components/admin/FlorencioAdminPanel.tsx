import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { toast } from "sonner";
import ImageField from "@/components/ImageField";
import { settingsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export default function FlorencioAdminPanel() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(settingsQuery);
  const [profileImage, setProfileImage] = useState("");
  const [introImage, setIntroImage] = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState("true");
  const [deliveryPrice, setDeliveryPrice] = useState("");
  const [deliveryDescription, setDeliveryDescription] = useState("");

  const current = (key: string, fallback = "") =>
    settings?.[key] ?? fallback;

  const save = async () => {
    const rows = [
      {
        key: "florencio_profile_image_url",
        value: profileImage || current("florencio_profile_image_url", "/img/florencio.png"),
      },
      {
        key: "florencio_intro_image_url",
        value: introImage || current("florencio_intro_image_url", "/img/florencio.png"),
      },
      {
        key: "florencio_delivery_enabled",
        value: deliveryEnabled || current("florencio_delivery_enabled", "true"),
      },
      {
        key: "florencio_delivery_price_cop",
        value: deliveryPrice || current("florencio_delivery_price_cop"),
      },
      {
        key: "florencio_delivery_description",
        value:
          deliveryDescription ||
          current(
            "florencio_delivery_description",
            "Servicio opcional de entrega especial con Florencio.",
          ),
      },
    ];

    const { error } = await supabase
      .from("site_settings")
      .upsert(rows, { onConflict: "key" });

    if (error) {
      toast.error(error.message);
      return;
    }

    setProfileImage("");
    setIntroImage("");
    setDeliveryPrice("");
    setDeliveryDescription("");
    await qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
    toast.success("Configuración de Florencio guardada");
  };

  return (
    <div className="max-w-5xl space-y-7">
      <div>
        <p className="eyebrow">Mascota y asistente</p>
        <h2 className="mt-2 font-display text-3xl">Florencio</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Gestiona por separado la cara que aparece dentro del chat y la imagen
          principal de la experiencia.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-border bg-background p-6 md:p-8">
          <p className="eyebrow">Foto de perfil</p>
          <h3 className="mt-2 font-display text-2xl">
            Solo el rostro de Florencio
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Esta imagen se recorta en círculo y se utiliza en la conversación,
            recomendaciones e historial.
          </p>

          <div className="mt-6">
            <ImageField
              value={
                profileImage ||
                current("florencio_profile_image_url", "/img/florencio.png")
              }
              folder="florencio/profile"
              label="Foto de perfil"
              onChange={setProfileImage}
            />
          </div>
        </div>

        <div className="border border-border bg-background p-6 md:p-8">
          <p className="eyebrow">Imagen principal</p>
          <h3 className="mt-2 font-display text-2xl">Presentación</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Imagen independiente para la portada o futuras áreas visuales de
            Florencio.
          </p>

          <div className="mt-6">
            <ImageField
              value={
                introImage ||
                current("florencio_intro_image_url", "/img/florencio.png")
              }
              folder="florencio"
              label="Imagen principal"
              onChange={setIntroImage}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-5 border border-border bg-background p-6 md:grid-cols-2 md:p-8">
        <label className="block">
          <span className="text-xs text-muted-foreground">
            Servicio de entrega
          </span>
          <select
            className="mt-2 w-full border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
            value={
              deliveryEnabled || current("florencio_delivery_enabled", "true")
            }
            onChange={(e) => setDeliveryEnabled(e.target.value)}
          >
            <option value="true">Activo</option>
            <option value="false">Oculto</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-muted-foreground">
            Precio extra (COP)
          </span>
          <input
            className="mt-2 w-full border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary"
            type="number"
            value={
              deliveryPrice || current("florencio_delivery_price_cop")
            }
            onChange={(e) => setDeliveryPrice(e.target.value)}
            placeholder="Ej. 25000"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs text-muted-foreground">
            Descripción del servicio
          </span>
          <textarea
            className="mt-2 min-h-28 w-full border border-input bg-transparent px-4 py-3 text-sm outline-none focus:border-primary"
            value={
              deliveryDescription ||
              current(
                "florencio_delivery_description",
                "Servicio opcional de entrega especial con Florencio.",
              )
            }
            onChange={(e) => setDeliveryDescription(e.target.value)}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        className="inline-flex items-center gap-2 bg-primary px-7 py-3.5 text-[11px] tracking-[0.24em] text-primary-foreground uppercase"
      >
        <Save className="h-4 w-4" />
        Guardar Florencio
      </button>
    </div>
  );
}
