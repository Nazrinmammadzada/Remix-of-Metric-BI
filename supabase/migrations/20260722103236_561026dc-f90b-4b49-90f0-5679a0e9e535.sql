GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_records TO authenticated;
GRANT ALL ON public.salary_records TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_uploads TO authenticated;
GRANT ALL ON public.salary_uploads TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_settings TO authenticated;
GRANT ALL ON public.notification_settings TO service_role;