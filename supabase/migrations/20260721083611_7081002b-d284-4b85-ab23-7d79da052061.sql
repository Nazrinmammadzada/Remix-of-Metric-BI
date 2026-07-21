
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  to_employee_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Org members can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Org members can update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE POLICY "Org members can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id) OR public.is_platform_super_admin(auth.uid()));

CREATE INDEX idx_notifications_org_employee ON public.notifications(organization_id, to_employee_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
