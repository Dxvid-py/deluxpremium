-- Deluxury · soporte de pagos Bold
-- Se puede ejecutar de forma segura aunque algunas columnas ya existan.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS payment_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS orders_payment_transaction_id_idx
  ON public.orders(payment_transaction_id);

CREATE INDEX IF NOT EXISTS orders_payment_status_idx
  ON public.orders(payment_status);

CREATE INDEX IF NOT EXISTS orders_user_id_idx
  ON public.orders(user_id);
