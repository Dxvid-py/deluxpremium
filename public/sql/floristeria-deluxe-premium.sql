CREATE TYPE public.app_role AS ENUM ('admin','editor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER categories_touch BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  price_cop numeric(12,2) NOT NULL DEFAULT 0,
  compare_price_cop numeric(12,2),
  images text[] NOT NULL DEFAULT '{}',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  stock integer NOT NULL DEFAULT 10,
  tags text[] NOT NULL DEFAULT '{}',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "products admin write" ON public.products FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_touch BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('FDP-' || to_char(now(),'YYMMDD') || '-' || upper(substr(md5(random()::text),1,5))),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  recipient_name text,
  recipient_phone text,
  address text NOT NULL,
  city text NOT NULL DEFAULT 'Barranquilla',
  delivery_date date,
  delivery_slot text,
  dedication text,
  notes text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cop numeric(12,2) NOT NULL DEFAULT 0,
  shipping_cop numeric(12,2) NOT NULL DEFAULT 0,
  total_cop numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'nuevo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can create order" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admins read orders" ON public.orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin write" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.site_settings (key, value) VALUES
  ('trm_cop_usd','3950'),
  ('whatsapp_number','573006301123'),
  ('brand_name','Floristería Deluxe Premium'),
  ('email','floristeriadeluxe@gmail.com'),
  ('address','Carrera 43 #79-226, Local 1, Barranquilla, Colombia'),
  ('shipping_cop','18000'),
  ('free_shipping_from_cop','350000'),
  ('instagram','https://instagram.com/floristeriadeluxe');

INSERT INTO public.categories (name, slug, description, image_url, sort_order) VALUES
  ('Amor & Romance','amor','Arreglos intensos para declarar lo que las palabras no alcanzan.','/img/cat-amor.jpg',1),
  ('Cumpleaños','cumpleanos','Color, luz y celebración en cada tallo seleccionado.','/img/cat-cumpleanos.jpg',2),
  ('Elegancia','elegancia','Composiciones minimalistas de alta gama para espacios únicos.','/img/cat-elegancia.jpg',3),
  ('Condolencias','condolencias','Homenajes serenos y respetuosos, entregados con delicadeza.','/img/cat-condolencias.jpg',4);

INSERT INTO public.products (name, slug, description, price_cop, compare_price_cop, images, category_id, is_featured, stock, tags, sort_order)
SELECT 'Rouge Éternel · 24 Rosas','rouge-eternel','Veinticuatro rosas rojas premium de tallo largo envueltas en papel seda blush y cinta de satín. Una declaración clásica, ejecutada con precisión editorial.',389000,459000,ARRAY['/img/prod-01.jpg','/img/hero-01.jpg'],c.id,true,12,ARRAY['rosas','premium','rojo'],1 FROM public.categories c WHERE c.slug='amor';
INSERT INTO public.products (name, slug, description, price_cop, compare_price_cop, images, category_id, is_featured, stock, tags, sort_order)
SELECT 'Blush Atelier Box','blush-atelier-box','Caja sombrerera blanca con rosas rosadas y marfil dispuestas en cúpula. Perfecta para sorprender con sobriedad.',329000,NULL,ARRAY['/img/prod-02.jpg'],c.id,true,15,ARRAY['caja','rosas'],2 FROM public.categories c WHERE c.slug='amor';
INSERT INTO public.products (name, slug, description, price_cop, compare_price_cop, images, category_id, is_featured, stock, tags, sort_order)
SELECT 'Orchidée Noire','orchidee-noire','Orquídea phalaenopsis blanca en maceta cerámica negra mate. Escultura viva de líneas puras.',420000,NULL,ARRAY['/img/prod-03.jpg'],c.id,true,8,ARRAY['orquídea','minimal'],3 FROM public.categories c WHERE c.slug='elegancia';
INSERT INTO public.products (name, slug, description, price_cop, compare_price_cop, images, category_id, is_featured, stock, tags, sort_order)
SELECT 'Célébration Deluxe','celebration-deluxe','Ramo pastel acompañado de bombonería fina y espumoso. El set completo para un cumpleaños memorable.',465000,520000,ARRAY['/img/prod-04.jpg'],c.id,true,10,ARRAY['regalo','cumpleaños'],4 FROM public.categories c WHERE c.slug='cumpleanos';
INSERT INTO public.products (name, slug, description, price_cop, compare_price_cop, images, category_id, is_featured, stock, tags, sort_order)
SELECT 'Corona Serena','corona-serena','Corona fúnebre en lirios y crisantemos blancos sobre trípode. Entrega discreta y puntual en salas de velación.',540000,NULL,ARRAY['/img/prod-05.jpg'],c.id,false,6,ARRAY['condolencias'],5 FROM public.categories c WHERE c.slug='condolencias';
INSERT INTO public.products (name, slug, description, price_cop, compare_price_cop, images, category_id, is_featured, stock, tags, sort_order)
SELECT 'Grand Bouquet Signature','grand-bouquet-signature','Nuestro ramo insignia: rosas rojas y rosadas en gran formato con envoltura editorial firmada por el atelier.',590000,690000,ARRAY['/img/prod-06.jpg'],c.id,true,7,ARRAY['signature','premium'],6 FROM public.categories c WHERE c.slug='amor';
INSERT INTO public.products (name, slug, description, price_cop, images, category_id, is_featured, stock, tags, sort_order)
SELECT 'Lumière Blanche','lumiere-blanche','Composición de lirios, orquídeas y astilbe en caja marfil con acabado dorado.',445000,ARRAY['/img/hero-02.jpg'],c.id,false,9,ARRAY['blanco','elegancia'],7 FROM public.categories c WHERE c.slug='elegancia';
INSERT INTO public.products (name, slug, description, price_cop, images, category_id, is_featured, stock, tags, sort_order)
SELECT 'Rose Dorée Intimité','rose-doree-intimite','Rosas jardín rosadas con velas y detalles dorados para una noche íntima.',298000,ARRAY['/img/hero-03.jpg'],c.id,false,14,ARRAY['romance','velas'],8 FROM public.categories c WHERE c.slug='amor';DROP POLICY "categories public read" ON public.categories;
CREATE POLICY "categories anon read active" ON public.categories FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "categories auth read" ON public.categories FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));

DROP POLICY "products public read" ON public.products;
CREATE POLICY "products anon read active" ON public.products FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "products auth read" ON public.products FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;insert into public.site_settings (key, value) values
 ('address','Carrera 43 #79-226, Local 1, Barranquilla, Colombia'),
 ('city','Barranquilla'),
 ('email','floristeriadeluxe@gmail.com'),
 ('instagram','https://instagram.com/floristeriadeluxe'),
 ('instagram_handle','@floristeriadeluxe'),
 ('maps_url','https://maps.app.goo.gl/iP9B2jxw3JVnETTe7'),
 ('whatsapp_number','573006301123'),
 ('hours_weekdays','Lunes a sábado 8:00 – 20:00'),
 ('hours_sunday','Domingo 9:00 – 18:00'),
 ('hours_whatsapp','Pedidos por WhatsApp 24/7')
on conflict (key) do update set value = excluded.value;