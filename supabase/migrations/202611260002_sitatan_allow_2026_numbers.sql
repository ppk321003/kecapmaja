ALTER TABLE public.sitatan_number_reservations
  DROP CONSTRAINT IF EXISTS sitatan_number_reservations_year_check;

ALTER TABLE public.sitatan_number_reservations
  ADD CONSTRAINT sitatan_number_reservations_year_check CHECK (year >= 2026);

CREATE OR REPLACE FUNCTION public.sitatan_reserve_number(
  p_year integer,
  p_letter_type text,
  p_minimum_next_serial integer,
  p_reserved_by text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_serial integer;
BEGIN
  IF p_year < 2026 OR p_minimum_next_serial < 1 OR p_reserved_by IS NULL OR p_reserved_by = '' THEN
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

  PERFORM pg_advisory_xact_lock(p_year, hashtext(p_letter_type));

  SELECT GREATEST(COALESCE(MAX(serial), 0) + 1, p_minimum_next_serial)
  INTO next_serial
  FROM public.sitatan_number_reservations
  WHERE year = p_year AND letter_type = p_letter_type;

  INSERT INTO public.sitatan_number_reservations (year, letter_type, serial, reserved_by)
  VALUES (p_year, p_letter_type, next_serial, p_reserved_by);

  RETURN next_serial;
END;
$$;
