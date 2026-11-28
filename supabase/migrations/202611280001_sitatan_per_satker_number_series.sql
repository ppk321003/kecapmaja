UPDATE public.sitatan_number_series_reservations
SET series_key = 'satker:3210:' || series_key
WHERE series_key NOT LIKE 'satker:%';

CREATE OR REPLACE FUNCTION public.sitatan_reserve_number_by_series(
  p_year integer,
  p_letter_type text,
  p_archive_code text,
  p_archive_subcode text,
  p_satker_id text,
  p_minimum_next_serial integer,
  p_reserved_by text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_series_key text;
  v_archive_subcode text;
  next_serial integer;
  legacy_max_serial integer := 0;
  uses_archive boolean;
BEGIN
  IF p_year < 2026
    OR p_minimum_next_serial < 1
    OR p_satker_id IS NULL
    OR btrim(p_satker_id) = ''
    OR p_reserved_by IS NULL
    OR p_reserved_by = '' THEN
    RAISE EXCEPTION 'Invalid Sitatan number reservation request';
  END IF;

  IF p_letter_type NOT IN (
    'Surat Keputusan',
    'Surat Perintah/Surat Tugas',
    'Surat Dinas',
    'Nota Dinas/Memorandum',
    'Surat Undangan Intern',
    'Surat Undangan Ekstern',
    'Surat Keterangan',
    'Surat Pengantar',
    'Laporan',
    'Formulir Permintaan'
  ) THEN
    RAISE EXCEPTION 'Unsupported Sitatan letter type';
  END IF;

  uses_archive := p_letter_type IN (
    'Surat Perintah/Surat Tugas',
    'Surat Dinas',
    'Nota Dinas/Memorandum',
    'Surat Undangan Intern',
    'Surat Undangan Ekstern',
    'Surat Keterangan',
    'Surat Pengantar',
    'Formulir Permintaan'
  );

  IF uses_archive THEN
    IF p_archive_code IS NULL OR btrim(p_archive_code) = ''
      OR p_archive_subcode IS NULL OR btrim(p_archive_subcode) = '' THEN
      RAISE EXCEPTION 'Archive code and subcode are required for this Sitatan letter type';
    END IF;
    v_archive_subcode := CASE
      WHEN btrim(p_archive_subcode) ~ '^[0-9]{1,3}$' THEN lpad(btrim(p_archive_subcode), 3, '0')
      ELSE btrim(p_archive_subcode)
    END;
    v_series_key := 'satker:' || btrim(p_satker_id) || ':archive:' || btrim(p_archive_code) || ':' || v_archive_subcode;

    IF btrim(p_satker_id) = '3210' THEN
      SELECT COALESCE(MAX(serial), 0)
      INTO legacy_max_serial
      FROM public.sitatan_number_reservations
      WHERE year = p_year
        AND letter_type IN (
          'Surat Perintah/Surat Tugas',
          'Surat Dinas',
          'Nota Dinas/Memorandum',
          'Surat Undangan Intern',
          'Surat Undangan Ekstern',
          'Surat Keterangan',
          'Surat Pengantar',
          'Formulir Permintaan'
        );
    END IF;
  ELSE
    IF COALESCE(btrim(p_archive_code), '') <> '' OR COALESCE(btrim(p_archive_subcode), '') <> '' THEN
      RAISE EXCEPTION 'Archive code and subcode are not supported for this Sitatan letter type';
    END IF;
    v_series_key := 'satker:' || btrim(p_satker_id) || ':type:' || p_letter_type;

    IF btrim(p_satker_id) = '3210' THEN
      SELECT COALESCE(MAX(serial), 0)
      INTO legacy_max_serial
      FROM public.sitatan_number_reservations
      WHERE year = p_year AND letter_type = p_letter_type;
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(p_year, hashtext(v_series_key));

  SELECT GREATEST(
    COALESCE(MAX(serial), 0) + 1,
    p_minimum_next_serial,
    legacy_max_serial + 1
  )
  INTO next_serial
  FROM public.sitatan_number_series_reservations
  WHERE year = p_year AND series_key = v_series_key;

  INSERT INTO public.sitatan_number_series_reservations (
    year,
    series_key,
    serial,
    letter_type,
    archive_code,
    archive_subcode,
    reserved_by
  )
  VALUES (
    p_year,
    v_series_key,
    next_serial,
    p_letter_type,
    NULLIF(btrim(p_archive_code), ''),
    NULLIF(v_archive_subcode, ''),
    p_reserved_by
  );

  RETURN next_serial;
END;
$$;

REVOKE ALL ON FUNCTION public.sitatan_reserve_number_by_series(integer, text, text, text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sitatan_reserve_number_by_series(integer, text, text, text, text, integer, text) TO service_role;
