CREATE TABLE public.appliance_catalog (
  id text PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  watts numeric NOT NULL,
  standby_watts numeric NOT NULL DEFAULT 0,
  default_hours_per_day numeric NOT NULL,
  default_days_per_year integer NOT NULL DEFAULT 365,
  end_use text NOT NULL
);
GRANT SELECT ON public.appliance_catalog TO anon, authenticated;
GRANT ALL ON public.appliance_catalog TO service_role;
ALTER TABLE public.appliance_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.appliance_catalog FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.appliance_catalog (id,category,name,watts,standby_watts,default_hours_per_day,default_days_per_year,end_use) VALUES
('tv-43','TV','LED TV 43"',70,0.5,4,365,'electronics'),
('tv-55','TV','4K TV 55"',110,0.5,4,365,'electronics'),
('tv-65','TV','OLED TV 65"',160,0.5,4,365,'electronics'),
('tv-75','TV','Mini-LED TV 75"',230,0.5,4,365,'electronics'),
('ac-split','Air conditioner','Split AC 1.5hp (inverter)',900,2,8,180,'cooling'),
('ac-window','Air conditioner','Window AC 1.5hp',1400,1,8,180,'cooling'),
('fridge','Refrigerator','Fridge-freezer 400L',45,0,24,365,'refrigeration'),
('wh-storage','Water heater','Electric storage water heater',2500,0,1.5,365,'water_heating'),
('washer','Laundry','Washing machine',500,1,0.8,365,'laundry'),
('dryer','Laundry','Tumble dryer',2200,1,0.6,200,'laundry'),
('dehumid','Air treatment','Dehumidifier',300,1,6,150,'cooling'),
('purifier','Air treatment','Air purifier',40,1,10,365,'cooling'),
('rice','Kitchen','Rice cooker',700,3,1,365,'cooking'),
('induction','Kitchen','Induction hob',1800,1,1,365,'cooking'),
('microwave','Kitchen','Microwave',1100,2,0.25,365,'cooking'),
('kettle','Kitchen','Electric kettle',2000,0,0.2,365,'cooking'),
('dishwasher','Kitchen','Dishwasher',1300,1,1,250,'cooking'),
('desktop','Electronics','Desktop PC + monitor',180,3,5,365,'electronics'),
('laptop','Electronics','Laptop',50,1,6,365,'electronics'),
('console','Electronics','Games console',150,10,2,365,'electronics'),
('router','Electronics','Wi-Fi router',10,0,24,365,'electronics'),
('led-lights','Lighting','LED lighting (whole flat)',120,0,5,365,'lighting'),
('cfl-lights','Lighting','Fluorescent lighting (whole flat)',300,0,5,365,'lighting'),
('ev-charger','EV','Home EV charger 7kW',7000,2,1.2,365,'ev');

-- TVs for the purchase comparison
INSERT INTO public.products (id,category,brand,model,price,annual_kwh,energy_label,lifetime_years,maintenance_per_year,usage_basis,reference_value,usage_elasticity,capacity,capacity_unit,shift_kwh) VALUES
('tv-1','TV','Samsung','QN90 55" Neo QLED',11800,150,1,8,0,'fixed',1,1,55,'in',0),
('tv-2','TV','TCL','P745 55" LED',3900,230,3,6,0,'fixed',1,1,55,'in',0),
('tv-3','TV','LG','C4 65" OLED',16800,190,2,8,0,'fixed',1,1,65,'in',0);

CREATE TABLE public.building_archetypes (
  id text PRIMARY KEY,
  name text NOT NULL,
  kwh_per_m2 numeric NOT NULL,
  hours_per_day numeric NOT NULL,
  days_per_week numeric NOT NULL,
  occupancy_per_1000m2 numeric NOT NULL,
  peak_w_per_m2 numeric NOT NULL,
  end_use_share jsonb NOT NULL,
  default_area_m2 numeric NOT NULL,
  roof_ratio numeric NOT NULL
);
GRANT SELECT ON public.building_archetypes TO anon, authenticated;
GRANT ALL ON public.building_archetypes TO service_role;
ALTER TABLE public.building_archetypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.building_archetypes FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.building_archetypes VALUES
('mall','Shopping mall',380,12,7,60,95,'{"hvac":0.5,"lighting":0.25,"water_heating":0.02,"refrigeration":0.08,"other":0.15}',40000,0.35),
('hotel','Hotel',300,24,7,25,60,'{"hvac":0.45,"lighting":0.12,"water_heating":0.15,"refrigeration":0.06,"other":0.22}',25000,0.15),
('office','Office',230,11,5,80,70,'{"hvac":0.48,"lighting":0.22,"water_heating":0.02,"refrigeration":0.02,"other":0.26}',30000,0.12),
('gym','Gym / sports centre',260,16,7,40,65,'{"hvac":0.42,"lighting":0.18,"water_heating":0.2,"refrigeration":0.02,"other":0.18}',3000,0.5),
('school','School',110,10,5,150,40,'{"hvac":0.45,"lighting":0.3,"water_heating":0.05,"refrigeration":0.03,"other":0.17}',12000,0.4),
('apartment','Apartment complex (common areas)',45,24,7,30,12,'{"hvac":0.25,"lighting":0.35,"water_heating":0.1,"refrigeration":0.0,"other":0.3}',60000,0.06);

CREATE TABLE public.building_measures (
  id text PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  end_use text,
  savings_pct numeric NOT NULL DEFAULT 0,
  capex_rate numeric NOT NULL,
  capex_unit text NOT NULL,
  maint_pct_capex numeric NOT NULL DEFAULT 0,
  lifetime_years integer NOT NULL,
  install_weeks integer NOT NULL DEFAULT 2
);
GRANT SELECT ON public.building_measures TO anon, authenticated;
GRANT ALL ON public.building_measures TO service_role;
ALTER TABLE public.building_measures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.building_measures FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.building_measures VALUES
('hvac','HVAC replacement','High-efficiency chiller plant','Replace chillers with magnetic-bearing units and VSD pumps','hvac',0.32,420,'m2',0.01,20,8),
('lighting','Lighting replacement','LED retrofit with controls','LED fittings plus occupancy and daylight sensors','lighting',0.55,110,'m2',0.0,12,3),
('battery','Battery','Battery storage (2h)','Peak shaving and off-peak charging','',0,4200,'kWh',0.015,12,4),
('solar','Solar','Rooftop solar PV','Self-consumed rooftop generation','',0,9500,'kWp',0.01,25,4),
('water','Water heating','Heat-pump water heating','Replace electric boilers with heat pumps','water_heating',0.62,70,'m2',0.02,15,3),
('refrig','Refrigeration','Refrigeration upgrade','EC fans, doors on cases, efficient compressors','refrigeration',0.3,60,'m2',0.01,15,2),
('ev','EV charging infrastructure','EV chargers (7kW)','Chargers resold to tenants or visitors','',0,38000,'charger',0.03,10,2);