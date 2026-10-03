ALTER TABLE public.products
  ADD COLUMN usage_basis text NOT NULL DEFAULT 'fixed',
  ADD COLUMN reference_value numeric NOT NULL DEFAULT 1,
  ADD COLUMN usage_elasticity numeric NOT NULL DEFAULT 1,
  ADD COLUMN capacity numeric,
  ADD COLUMN capacity_unit text,
  ADD COLUMN shift_kwh numeric NOT NULL DEFAULT 0;

UPDATE public.products SET usage_basis='area', reference_value=40, usage_elasticity=1, capacity_unit='kW' WHERE category='Air conditioner';
UPDATE public.products SET capacity=3.5 WHERE id IN ('ac-1','ac-3');
UPDATE public.products SET capacity=2.6 WHERE id IN ('ac-2','ac-4');
UPDATE public.products SET usage_basis='occupants', reference_value=3, usage_elasticity=0.3, capacity_unit='L' WHERE category='Refrigerator';
UPDATE public.products SET capacity=650 WHERE id='fr-1';
UPDATE public.products SET capacity=420 WHERE id='fr-2';
UPDATE public.products SET capacity=390 WHERE id='fr-3';
UPDATE public.products SET usage_basis='occupants', reference_value=3, usage_elasticity=1, capacity_unit='L' WHERE category='Water heater';
UPDATE public.products SET capacity=80 WHERE id='wh-1';
UPDATE public.products SET capacity=50 WHERE id='wh-2';

INSERT INTO public.products (id,category,brand,model,price,annual_kwh,energy_label,lifetime_years,maintenance_per_year,usage_basis,reference_value,usage_elasticity,capacity,capacity_unit,shift_kwh) VALUES
('ac-5','Air conditioner','Daikin','FTXM50 Inverter',14800,900,1,12,350,'area',40,1,5.0,'kW',0),
('ev-1','EV','BYD','Atto 3',239000,2100,1,10,1500,'km',12000,1,60,'kWh',0),
('ev-2','EV','Tesla','Model 3 RWD',279000,1800,1,10,1200,'km',12000,1,57,'kWh',0),
('ev-3','EV','MG','MG4',189000,2000,1,10,1800,'km',12000,1,51,'kWh',0),
('bt-1','Home battery','Tesla','Powerwall 3',78000,500,1,12,0,'fixed',1,1,13.5,'kWh',4000),
('bt-2','Home battery','Generic','LFP 10kWh',42000,600,2,10,300,'fixed',1,1,10,'kWh',3000);