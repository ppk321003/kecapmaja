CREATE TABLE IF NOT EXISTS public.portal_mitra_lookup_attempts (
  subject_hash text NOT NULL,
  ip_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_mitra_lookup_subject_time_idx
  ON public.portal_mitra_lookup_attempts (subject_hash, attempted_at DESC);

CREATE INDEX IF NOT EXISTS portal_mitra_lookup_ip_time_idx
  ON public.portal_mitra_lookup_attempts (ip_hash, attempted_at DESC);

ALTER TABLE public.portal_mitra_lookup_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_mitra_lookup_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.portal_mitra_lookup_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.portal_mitra_check_rate_limit(
  p_subject_hash text,
  p_ip_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  subject_lock bigint;
  ip_lock bigint;
  subject_attempts integer;
  ip_attempts integer;
BEGIN
  IF p_subject_hash IS NULL OR p_subject_hash = '' OR p_ip_hash IS NULL OR p_ip_hash = '' THEN
    RETURN false;
  END IF;

  subject_lock := hashtextextended('subject:' || p_subject_hash, 0);
  ip_lock := hashtextextended('ip:' || p_ip_hash, 0);

  IF subject_lock < ip_lock THEN
    PERFORM pg_advisory_xact_lock(subject_lock);
    PERFORM pg_advisory_xact_lock(ip_lock);
  ELSE
    PERFORM pg_advisory_xact_lock(ip_lock);
    PERFORM pg_advisory_xact_lock(subject_lock);
  END IF;

  DELETE FROM public.portal_mitra_lookup_attempts
  WHERE attempted_at < now() - interval '1 day';

  SELECT count(*) INTO subject_attempts
  FROM public.portal_mitra_lookup_attempts
  WHERE subject_hash = p_subject_hash
    AND attempted_at > now() - interval '15 minutes';

  SELECT count(*) INTO ip_attempts
  FROM public.portal_mitra_lookup_attempts
  WHERE ip_hash = p_ip_hash
    AND attempted_at > now() - interval '1 hour';

  IF subject_attempts >= 5 OR ip_attempts >= 30 THEN
    RETURN false;
  END IF;

  INSERT INTO public.portal_mitra_lookup_attempts (subject_hash, ip_hash)
  VALUES (p_subject_hash, p_ip_hash);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.portal_mitra_check_rate_limit(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_mitra_check_rate_limit(text, text) TO service_role;
