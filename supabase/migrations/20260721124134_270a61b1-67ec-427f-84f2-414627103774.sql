ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roles;
ALTER TABLE public.role_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.roles REPLICA IDENTITY FULL;