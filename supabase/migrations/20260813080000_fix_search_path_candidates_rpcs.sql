-- get_candidate_type_counts/get_active_parties (20260813070000) saíram sem
-- search_path fixo — mesmo warning que já existia em outras funções do banco
-- (function_search_path_mutable), mas dá pra evitar replicar o padrão nas novas.
alter function public.get_candidate_type_counts(int) set search_path = public;
alter function public.get_active_parties(int) set search_path = public;
