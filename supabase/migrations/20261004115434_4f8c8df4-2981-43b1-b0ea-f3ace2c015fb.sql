DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['appliance_catalog','building_archetypes','building_measures','business_sites','homes','procurement_options','products','tariffs'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "public read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "signed-in read" ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', t);
  END LOOP;
END $$;