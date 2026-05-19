-- Invoice number generator for ClinicOS
-- Usage: select generate_invoice_number('<clinic_uuid>');

create or replace function public.generate_invoice_number(p_clinic_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_year text;
  v_clinic_short text;
  v_seq_name text;
  v_next bigint;
begin
  v_year := to_char(current_date, 'YYYY');
  v_clinic_short := substring(replace(p_clinic_id::text, '-', '') from 1 for 8);
  v_seq_name := format('invoice_seq_%s', v_clinic_short);

  execute format('create sequence if not exists %I increment 1 minvalue 1 start 1', v_seq_name);
  execute format('select nextval(%L)', v_seq_name) into v_next;

  return format('INV-%s-%s', v_year, lpad(v_next::text, 3, '0'));
end;
$$;

grant execute on function public.generate_invoice_number(uuid) to authenticated;
