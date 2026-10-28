CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE public.app_role AS ENUM ('business_owner','customer');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','cancelled','completed','no_show');

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.choose_account_type(_role public.app_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role) ON CONFLICT DO NOTHING;
  IF _role = 'business_owner' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'customer') ON CONFLICT DO NOTHING;
  END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.choose_account_type(public.app_role) TO authenticated;

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,46}[a-z0-9])$'),
  category text,
  description text,
  logo_url text, cover_url text,
  address text, city text, phone text, email text, website text, instagram text,
  timezone text NOT NULL DEFAULT 'Europe/Rome',
  currency text NOT NULL DEFAULT 'EUR',
  accent_color text NOT NULL DEFAULT '#0F766E' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  slot_interval_min int NOT NULL DEFAULT 15 CHECK (slot_interval_min BETWEEN 5 AND 240),
  buffer_min int NOT NULL DEFAULT 0 CHECK (buffer_min BETWEEN 0 AND 240),
  min_notice_hours int NOT NULL DEFAULT 2 CHECK (min_notice_hours >= 0),
  max_advance_days int NOT NULL DEFAULT 60 CHECK (max_advance_days BETWEEN 1 AND 730),
  cancellation_window_hours int NOT NULL DEFAULT 24 CHECK (cancellation_window_hours >= 0),
  auto_confirm boolean NOT NULL DEFAULT true,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX businesses_one_per_owner ON public.businesses(owner_id) WHERE owner_id IS NOT NULL;
CREATE TRIGGER businesses_touch BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.owns_business(_bid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.businesses WHERE id = _bid AND owner_id = auth.uid())
$$;

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  description text,
  duration_min int NOT NULL CHECK (duration_min > 0 AND duration_min <= 720),
  price numeric(10,2) CHECK (price IS NULL OR price >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.services(business_id);

CREATE TABLE public.availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  weekday int NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  CHECK (end_time > start_time)
);
CREATE INDEX ON public.availability_rules(business_id, weekday);

CREATE TABLE public.time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  CHECK (end_at > start_at)
);
CREATE INDEX ON public.time_off(business_id, start_at);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  customer_id uuid,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  service_name text,
  service_price numeric(10,2),
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status public.booking_status NOT NULL DEFAULT 'pending',
  customer_notes text,
  cancelled_by text CHECK (cancelled_by IN ('customer','business')),
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  EXCLUDE USING gist (business_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (status IN ('pending','confirmed'))
);
CREATE INDEX ON public.bookings(business_id, start_at);
CREATE INDEX ON public.bookings(customer_id);
CREATE TRIGGER bookings_touch BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.booking_internal_notes (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.has_booking_with(_bid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bookings WHERE business_id = _bid AND customer_id = auth.uid())
$$;

GRANT SELECT ON public.businesses, public.services, public.availability_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses, public.services, public.availability_rules, public.time_off, public.booking_internal_notes TO authenticated;
GRANT SELECT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.businesses, public.services, public.availability_rules, public.time_off, public.bookings, public.booking_internal_notes TO service_role;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_internal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public published" ON public.businesses FOR SELECT TO anon, authenticated USING (is_published);
CREATE POLICY "owner read" ON public.businesses FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "customer read booked" ON public.businesses FOR SELECT TO authenticated USING (public.has_booking_with(id));
CREATE POLICY "owner insert" ON public.businesses FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(),'business_owner'));
CREATE POLICY "owner update" ON public.businesses FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner delete" ON public.businesses FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "public active" ON public.services FOR SELECT TO anon, authenticated USING (is_active AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.is_published));
CREATE POLICY "customer booked" ON public.services FOR SELECT TO authenticated USING (public.has_booking_with(business_id));
CREATE POLICY "owner all" ON public.services FOR ALL TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));

CREATE POLICY "public read" ON public.availability_rules FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.is_published));
CREATE POLICY "owner all" ON public.availability_rules FOR ALL TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));

CREATE POLICY "owner all" ON public.time_off FOR ALL TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));

CREATE POLICY "customer read own" ON public.bookings FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "owner read" ON public.bookings FOR SELECT TO authenticated USING (public.owns_business(business_id));
CREATE POLICY "owner update" ON public.bookings FOR UPDATE TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));

CREATE POLICY "owner all" ON public.booking_internal_notes FOR ALL TO authenticated USING (public.owns_business(business_id)) WITH CHECK (public.owns_business(business_id));

CREATE OR REPLACE FUNCTION public._slot_is_free(_b public.businesses, _start timestamptz, _end timestamptz, _ignore uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.time_off t WHERE t.business_id = _b.id AND tstzrange(t.start_at, t.end_at) && tstzrange(_start, _end)
  ) AND NOT EXISTS (
    SELECT 1 FROM public.bookings k WHERE k.business_id = _b.id AND k.status IN ('pending','confirmed')
      AND (_ignore IS NULL OR k.id <> _ignore)
      AND tstzrange(k.start_at - make_interval(mins => _b.buffer_min), k.end_at + make_interval(mins => _b.buffer_min)) && tstzrange(_start, _end)
  )
$$;

CREATE OR REPLACE FUNCTION public._slot_in_hours(_b public.businesses, _start timestamptz, _end timestamptz)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (_start AT TIME ZONE _b.timezone)::date = ((_end AT TIME ZONE _b.timezone) - interval '1 second')::date
   AND EXISTS (
    SELECT 1 FROM public.availability_rules r
    WHERE r.business_id = _b.id
      AND r.weekday = extract(dow FROM (_start AT TIME ZONE _b.timezone))::int
      AND (_start AT TIME ZONE _b.timezone)::time >= r.start_time
      AND ((_end AT TIME ZONE _b.timezone) - interval '1 second')::time < r.end_time
  )
$$;

CREATE OR REPLACE FUNCTION public.get_available_slots(business_slug text, service_id uuid, day date)
RETURNS SETOF timestamptz LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b public.businesses; s public.services; r record;
  t timestamp; st timestamptz; en timestamptz;
  earliest timestamptz; latest_day date;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE slug = business_slug AND (is_published OR owner_id = auth.uid());
  IF NOT FOUND THEN RETURN; END IF;
  SELECT * INTO s FROM public.services x WHERE x.id = get_available_slots.service_id AND x.business_id = b.id AND x.is_active;
  IF NOT FOUND THEN RETURN; END IF;
  earliest := now() + make_interval(hours => b.min_notice_hours);
  latest_day := (now() AT TIME ZONE b.timezone)::date + b.max_advance_days;
  IF day > latest_day OR day < (now() AT TIME ZONE b.timezone)::date THEN RETURN; END IF;
  FOR r IN SELECT start_time, end_time FROM public.availability_rules WHERE business_id = b.id AND weekday = extract(dow FROM day)::int ORDER BY start_time LOOP
    t := day + r.start_time;
    WHILE t + make_interval(mins => s.duration_min) <= day + r.end_time LOOP
      st := t AT TIME ZONE b.timezone;
      en := st + make_interval(mins => s.duration_min);
      IF st >= earliest AND public._slot_is_free(b, st, en) THEN
        RETURN NEXT st;
      END IF;
      t := t + make_interval(mins => b.slot_interval_min);
    END LOOP;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.get_available_slots(text, uuid, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_booking(business_id uuid, service_id uuid, start_at timestamptz, customer_notes text DEFAULT NULL, customer_phone text DEFAULT NULL)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b public.businesses; s public.services; p public.profiles; em text; en timestamptz; res public.bookings;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in to book'; END IF;
  SELECT * INTO b FROM public.businesses x WHERE x.id = create_booking.business_id AND x.is_published;
  IF NOT FOUND THEN RAISE EXCEPTION 'This business is not accepting bookings'; END IF;
  SELECT * INTO s FROM public.services x WHERE x.id = create_booking.service_id AND x.business_id = b.id AND x.is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'This service is not available'; END IF;
  en := create_booking.start_at + make_interval(mins => s.duration_min);
  IF create_booking.start_at < now() + make_interval(hours => b.min_notice_hours) THEN RAISE EXCEPTION 'This time is too soon to book'; END IF;
  IF (create_booking.start_at AT TIME ZONE b.timezone)::date > (now() AT TIME ZONE b.timezone)::date + b.max_advance_days THEN RAISE EXCEPTION 'This date is too far ahead'; END IF;
  IF NOT public._slot_in_hours(b, create_booking.start_at, en) THEN RAISE EXCEPTION 'This time is outside opening hours'; END IF;
  IF NOT public._slot_is_free(b, create_booking.start_at, en) THEN RAISE EXCEPTION 'Sorry, this slot was just taken'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = auth.uid();
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  IF create_booking.customer_phone IS NOT NULL AND length(trim(create_booking.customer_phone)) > 0 AND (p.phone IS NULL OR p.phone = '') THEN
    UPDATE public.profiles SET phone = trim(create_booking.customer_phone) WHERE id = auth.uid();
  END IF;
  INSERT INTO public.bookings (business_id, service_id, customer_id, customer_name, customer_email, customer_phone, service_name, service_price, start_at, end_at, status, customer_notes)
  VALUES (b.id, s.id, auth.uid(), COALESCE(NULLIF(p.full_name,''), split_part(em,'@',1)), em,
    COALESCE(NULLIF(trim(create_booking.customer_phone),''), p.phone), s.name, s.price, create_booking.start_at, en,
    CASE WHEN b.auto_confirm THEN 'confirmed'::public.booking_status ELSE 'pending'::public.booking_status END,
    NULLIF(left(create_booking.customer_notes, 1000), ''))
  RETURNING * INTO res;
  RETURN res;
EXCEPTION WHEN exclusion_violation THEN RAISE EXCEPTION 'Sorry, this slot was just taken';
END $$;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid, timestamptz, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_manual_booking(service_id uuid, start_at timestamptz, customer_name text, customer_email text DEFAULT NULL, customer_phone text DEFAULT NULL, customer_notes text DEFAULT NULL)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.businesses; s public.services; en timestamptz; res public.bookings;
BEGIN
  SELECT * INTO s FROM public.services x WHERE x.id = create_manual_booking.service_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Service not found'; END IF;
  SELECT * INTO b FROM public.businesses x WHERE x.id = s.business_id AND x.owner_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF length(trim(coalesce(create_manual_booking.customer_name,''))) = 0 THEN RAISE EXCEPTION 'Customer name is required'; END IF;
  en := create_manual_booking.start_at + make_interval(mins => s.duration_min);
  IF NOT public._slot_in_hours(b, create_manual_booking.start_at, en) THEN RAISE EXCEPTION 'This time is outside opening hours'; END IF;
  IF NOT public._slot_is_free(b, create_manual_booking.start_at, en) THEN RAISE EXCEPTION 'This slot is not free'; END IF;
  INSERT INTO public.bookings (business_id, service_id, customer_id, customer_name, customer_email, customer_phone, service_name, service_price, start_at, end_at, status, customer_notes)
  VALUES (b.id, s.id, NULL, trim(create_manual_booking.customer_name), NULLIF(trim(create_manual_booking.customer_email),''), NULLIF(trim(create_manual_booking.customer_phone),''), s.name, s.price, create_manual_booking.start_at, en, 'confirmed', NULLIF(create_manual_booking.customer_notes,''))
  RETURNING * INTO res;
  RETURN res;
EXCEPTION WHEN exclusion_violation THEN RAISE EXCEPTION 'This slot is not free';
END $$;
GRANT EXECUTE ON FUNCTION public.create_manual_booking(uuid, timestamptz, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_booking(booking_id uuid) RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k public.bookings; b public.businesses; res public.bookings;
BEGIN
  SELECT * INTO k FROM public.bookings x WHERE x.id = cancel_booking.booking_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = k.business_id;
  IF k.status NOT IN ('pending','confirmed') THEN RAISE EXCEPTION 'This booking can no longer be cancelled'; END IF;
  IF b.owner_id = auth.uid() THEN
    UPDATE public.bookings SET status='cancelled', cancelled_by='business', cancelled_at=now() WHERE id = k.id RETURNING * INTO res;
  ELSIF k.customer_id = auth.uid() THEN
    IF k.start_at - make_interval(hours => b.cancellation_window_hours) < now() THEN
      RAISE EXCEPTION 'Too late to cancel online — please contact the business';
    END IF;
    UPDATE public.bookings SET status='cancelled', cancelled_by='customer', cancelled_at=now() WHERE id = k.id RETURNING * INTO res;
  ELSE
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN res;
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_slug_available(_slug text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.businesses WHERE slug = lower(_slug) AND (owner_id IS DISTINCT FROM auth.uid()))
$$;
GRANT EXECUTE ON FUNCTION public.is_slug_available(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public._slot_is_free(public.businesses, timestamptz, timestamptz, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._slot_in_hours(public.businesses, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

CREATE POLICY "media own read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id IN ('business-media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media own write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('business-media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media own update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('business-media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "media own delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('business-media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);

INSERT INTO public.businesses (id, owner_id, name, slug, category, description, address, city, phone, email, website, instagram, accent_color, is_published)
VALUES ('00000000-0000-4000-8000-000000000001', NULL, 'Atelier Nove', 'demo', 'Hair & beauty studio',
 'A calm, light-filled studio for precision cuts, colour and care. Book in under a minute.',
 'Via Tortona 9', 'Milan', '+39 02 1234 5678', 'hello@ateliernove.example', 'https://ateliernove.example', 'ateliernove', '#0F766E', true);
INSERT INTO public.services (business_id, name, description, duration_min, price, sort_order) VALUES
 ('00000000-0000-4000-8000-000000000001','Signature cut','Consultation, wash, precision cut and finish.',45,48,0),
 ('00000000-0000-4000-8000-000000000001','Colour & gloss','Full colour with a glossing treatment.',90,95,1),
 ('00000000-0000-4000-8000-000000000001','Blow-dry & style','Wash and a long-lasting blow-dry.',30,32,2);
INSERT INTO public.availability_rules (business_id, weekday, start_time, end_time)
SELECT '00000000-0000-4000-8000-000000000001', d, t.s, t.e
FROM generate_series(1,6) d, (VALUES ('09:00'::time,'13:00'::time),('14:00'::time,'19:00'::time)) t(s,e);
