CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  user_type text NOT NULL DEFAULT 'household' CHECK (user_type IN ('household','business')),
  tour_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, user_type)
  VALUES (NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    CASE WHEN NEW.raw_user_meta_data->>'user_type' = 'business' THEN 'business' ELSE 'household' END)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.user_homes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  profile jsonb NOT NULL,
  appliances jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_homes_user_idx ON public.user_homes(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_homes TO authenticated;
GRANT ALL ON public.user_homes TO service_role;
ALTER TABLE public.user_homes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own homes" ON public.user_homes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.ai_analyses ADD COLUMN user_id uuid;
CREATE INDEX ai_analyses_user_idx ON public.ai_analyses(user_id, created_at DESC);
DROP POLICY IF EXISTS "public read" ON public.ai_analyses;
REVOKE SELECT ON public.ai_analyses FROM anon;
GRANT SELECT ON public.ai_analyses TO authenticated;
CREATE POLICY "own analyses read" ON public.ai_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.products (id,category,brand,model,price,annual_kwh,energy_label,lifetime_years,maintenance_per_year,usage_basis,reference_value,usage_elasticity,capacity,capacity_unit,shift_kwh) VALUES
('wm-1','Washing machine','Bosch','Serie 6 8kg front-load',6800,150,1,12,100,'occupants',3,0.8,8,'kg',0),
('wm-2','Washing machine','Whirlpool','6kg top-load',2600,260,3,9,100,'occupants',3,0.8,6,'kg',0),
('wm-3','Washing machine','Panasonic','NA-V10 10kg heat-pump',9800,120,1,12,120,'occupants',3,0.8,10,'kg',0),
('dh-1','Dehumidifier','Mitsubishi','MJ-E20 20L',3200,330,1,10,0,'area',50,0.6,20,'L/day',0),
('dh-2','Dehumidifier','Generic','12L compressor',1200,520,3,6,0,'area',50,0.6,12,'L/day',0),
('dw-1','Dishwasher','Siemens','iQ300 slimline',5900,210,1,10,80,'occupants',3,0.7,null,null,0),
('dw-2','Dishwasher','Midea','Countertop 6-place',2200,280,3,7,60,'occupants',3,0.7,null,null,0),
('ck-1','Cooktop','Bosch','Induction 2-zone',3800,320,1,12,0,'occupants',3,0.8,null,null,0),
('ck-2','Cooktop','Generic','Ceramic radiant 2-zone',1500,450,3,8,0,'occupants',3,0.8,null,null,0),
('dr-1','Dryer','Electrolux','Heat-pump 8kg',7900,180,1,12,80,'occupants',3,0.8,8,'kg',0),
('dr-2','Dryer','Generic','Vented 7kg',2800,520,3,8,60,'occupants',3,0.8,7,'kg',0),
('lt-1','Lighting','Philips','LED retrofit (whole flat)',1200,180,1,15,0,'area',55,1,null,null,0),
('lt-2','Lighting','Generic','Fluorescent tubes (whole flat)',400,450,3,6,50,'area',55,1,null,null,0);