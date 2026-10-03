CREATE TABLE public.tariffs (
  id text PRIMARY KEY,
  name text NOT NULL,
  segment text NOT NULL,
  energy_rate numeric NOT NULL,
  fuel_adj numeric NOT NULL DEFAULT 0,
  peak_rate numeric,
  offpeak_rate numeric,
  demand_charge_kw numeric DEFAULT 0,
  carbon_kg_per_kwh numeric NOT NULL DEFAULT 0.39
);
CREATE TABLE public.homes (
  id text PRIMARY KEY,
  name text NOT NULL,
  district text NOT NULL,
  floor_area_m2 numeric NOT NULL,
  occupants int NOT NULL,
  tariff_id text REFERENCES public.tariffs(id),
  monthly_kwh jsonb NOT NULL,
  end_use_share jsonb NOT NULL,
  peer_median_kwh numeric NOT NULL
);
CREATE TABLE public.products (
  id text PRIMARY KEY,
  category text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  price numeric NOT NULL,
  annual_kwh numeric NOT NULL,
  energy_label int NOT NULL,
  lifetime_years int NOT NULL,
  maintenance_per_year numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.business_sites (
  id text PRIMARY KEY,
  name text NOT NULL,
  sector text NOT NULL,
  peak_kw numeric NOT NULL,
  monthly_mwh jsonb NOT NULL,
  peak_share numeric NOT NULL,
  current_option_id text
);
CREATE TABLE public.procurement_options (
  id text PRIMARY KEY,
  name text NOT NULL,
  structure text NOT NULL,
  unit_price numeric NOT NULL,
  peak_premium numeric NOT NULL DEFAULT 0,
  volatility numeric NOT NULL,
  renewable_share numeric NOT NULL,
  term_years int NOT NULL,
  fixed_fee_month numeric NOT NULL DEFAULT 0
);
CREATE TABLE public.ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL,
  subject_id text,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tariffs, public.homes, public.products, public.business_sites, public.procurement_options TO anon, authenticated;
GRANT SELECT ON public.ai_analyses TO anon, authenticated;
GRANT ALL ON public.tariffs, public.homes, public.products, public.business_sites, public.procurement_options, public.ai_analyses TO service_role;

ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procurement_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.tariffs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON public.homes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON public.business_sites FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON public.procurement_options FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public read" ON public.ai_analyses FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.tariffs VALUES
('res-std','Residential Standard','residential',1.12,0.42,NULL,NULL,0,0.39),
('res-tou','Residential Time-of-Use','residential',1.05,0.42,1.48,0.78,0,0.39),
('biz-bulk','Bulk Tariff','business',0.98,0.42,1.36,0.72,72,0.39);

INSERT INTO public.homes VALUES
('home-1','Flat 12B, Tai Koo Shing','Eastern',68,3,'res-std','[310,285,330,420,560,690,780,760,640,450,330,320]','{"cooling":0.38,"water_heating":0.14,"refrigeration":0.11,"lighting":0.08,"cooking":0.09,"electronics":0.12,"other":0.08}',4900),
('home-2','House, Sai Kung','Sai Kung',145,5,'res-tou','[620,590,640,820,1080,1320,1460,1420,1210,880,660,640]','{"cooling":0.42,"water_heating":0.16,"refrigeration":0.08,"lighting":0.07,"cooking":0.07,"electronics":0.1,"other":0.1}',9800),
('home-3','Flat 7A, Sha Tin','Sha Tin',42,2,'res-std','[190,175,200,240,310,380,420,410,350,260,200,195]','{"cooling":0.33,"water_heating":0.18,"refrigeration":0.13,"lighting":0.09,"cooking":0.1,"electronics":0.11,"other":0.06}',3300);

INSERT INTO public.products VALUES
('ac-1','Air conditioner','Daikin','FTXM35 Inverter',9800,620,1,12,250),
('ac-2','Air conditioner','Midea','MSWE-12 Window',3600,1180,3,9,180),
('ac-3','Air conditioner','Mitsubishi','MSZ-LN35',12600,540,1,13,250),
('ac-4','Air conditioner','Generic','WA-1200 Window',2400,1460,5,7,200),
('fr-1','Refrigerator','Panasonic','NR-F654 Inverter',14800,310,1,14,0),
('fr-2','Refrigerator','Whirlpool','WF-420',6200,520,3,12,0),
('fr-3','Refrigerator','Hisense','RB-390',4100,610,4,10,0),
('wh-1','Water heater','Ariston','Heat pump 80L',11500,780,1,12,120),
('wh-2','Water heater','Bosch','Storage 50L',3900,1950,3,10,80),
('wh-3','Water heater','Generic','Instant 6kW',1800,2300,4,8,50);

INSERT INTO public.procurement_options VALUES
('opt-std','Standard bulk tariff','tariff',1.22,0.0,0.06,0.0,1,0),
('opt-fix3','3-year fixed block','fixed',1.15,0.0,0.02,0.0,3,1800),
('opt-idx','Fuel-indexed supply','indexed',1.04,0.0,0.18,0.0,2,900),
('opt-tou','Time-of-use + load shift','tou',1.09,0.28,0.08,0.0,2,600),
('opt-rec','Renewable energy certificates','renewable',1.27,0.0,0.04,1.0,3,1200);

INSERT INTO public.business_sites VALUES
('site-1','Kowloon Bay Data Hall','Data centre',1850,'[1020,940,1040,1060,1150,1210,1260,1255,1190,1110,1030,1010]',0.46,'opt-std'),
('site-2','Tsuen Wan Cold Storage','Logistics',620,'[260,240,265,290,330,360,380,375,345,300,270,262]',0.58,'opt-std'),
('site-3','Central Office Tower','Commercial office',2400,'[410,380,420,470,560,640,690,685,610,500,430,415]',0.71,'opt-fix3');