
CREATE OR REPLACE FUNCTION public.sync_kpi_card_status_from_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_status text;
  reason text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'approved' THEN
    target_status := 'aktiv';
  ELSIF NEW.status = 'rejected' THEN
    target_status := 'imtina';
    BEGIN
      SELECT COALESCE(
        (SELECT (value->>'comment') FROM jsonb_each(NEW.decisions) WHERE value->>'decision' = 'rejected' LIMIT 1),
        'İmtina edildi'
      ) INTO reason;
    EXCEPTION WHEN OTHERS THEN reason := 'İmtina edildi'; END;
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    UPDATE public.kpi_cards
    SET status = target_status,
        rejected_reason = CASE WHEN target_status = 'imtina' THEN reason ELSE NULL END,
        updated_at = now()
    WHERE organization_id = NEW.organization_id
      AND (id::text = NEW.kpi_card_local_id OR legacy_string_id = NEW.kpi_card_local_id);
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kpi_card_status ON public.approval_queue;
CREATE TRIGGER trg_sync_kpi_card_status
AFTER UPDATE OF status ON public.approval_queue
FOR EACH ROW
EXECUTE FUNCTION public.sync_kpi_card_status_from_approval();
