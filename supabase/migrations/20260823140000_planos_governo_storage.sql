-- Bucket público pra hospedar os PDFs de plano de governo já baixados
-- (etapa 1) — precisamos de um link direto e estável pro PDF de cada
-- candidato na página pública, e a URL do TSE que temos hoje
-- (plano_governo.url_origem) é do ZIP inteiro do recurso, não do documento
-- individual. Os PDFs em si já são públicos no TSE; hospedar uma cópia
-- pública nossa não expõe nada nem depende do TSE estar no ar.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('planos-governo', 'planos-governo', true, 52428800, array['application/pdf'])
on conflict (id) do nothing;

alter table plano_governo add column if not exists pdf_url_publico text;
