-- Automação do "Relatório semanal por e-mail" prometido no plano Pro
-- (PLANS.pro.features, src/lib/stripe/config.ts) — nunca teve implementação
-- real. O primeiro assinante Pro mensal (Luis Filipe, oiluis@gmail.com,
-- api_keys.tier='pro' desde 2026-09-01) recebeu um piloto montado manualmente;
-- esta migration transforma esse piloto em cron dedicado.
--
-- Por que não reaproveitar `cron_send_weekly_digest` como está:
--   1. Ele manda pra `newsletter_subscribers`, não pra quem paga o Pro
--      (`api_keys.tier='pro'`) — são listas completamente diferentes.
--   2. Janela fixa de 7 dias: no piloto de 2026-09-01, a pesquisa mais recente
--      era de 24/08 (8 dias antes), o que teria gerado "nenhuma pesquisa nova
--      esta semana" pro primeiro e-mail de um assinante pago. Aqui a janela é
--      parâmetro (`p_window_days`, default 14 dias) em vez de fixa.
--   3. Bug no ranking de institutos: `ORDER BY reliability_score DESC LIMIT 5`
--      sem checar se o instituto tem alguma pesquisa no banco. Isso trazia
--      SMS Direct / INDEXA / LAPOP (score 1.00 mas 0 pesquisas — claramente
--      placeholder) na frente de Datafolha/Quaest, que têm dezenas de
--      pesquisas reais. Aqui exige `EXISTS (SELECT 1 FROM polls ...)`.
--   4. `v_movers` (maiores variações de média) nunca foi implementado — fica
--      sempre '[]'::jsonb. Continua assim aqui: `cron_recalculate_averages`
--      roda sem `keep_history=true` (supabase/functions/recalculate-averages),
--      ou seja, weighted_averages é limpa e reescrita a cada 6h — não existe
--      snapshot histórico pra calcular delta semana-a-semana. Ligar
--      keep_history é decisão de infra separada (a tabela cresceria a cada
--      recálculo, pra ~140 eleições, indefinidamente) — não faz parte desta
--      migration. Em vez de inventar uma variação falsa, mostramos o
--      panorama atual (sem delta).
--
-- Personalização: quem já configurou alerta de candidato (`user_alerts`,
-- ver /dashboard/alertas) recebe a seção "Seus candidatos" com a média atual
-- de quem monitora; quem ainda não configurou nada recebe o panorama da
-- Presidencial 2026 1º turno como fallback (mesmo conteúdo do piloto manual).

create table if not exists public.pro_report_runs (
  id         uuid primary key default gen_random_uuid(),
  sent_at    timestamptz not null default now(),
  recipients integer not null default 0,
  successes  integer not null default 0,
  failures   integer not null default 0,
  payload    jsonb,
  notes      text
);

create index if not exists pro_report_runs_sent_at_idx
  on public.pro_report_runs (sent_at desc);

alter table public.pro_report_runs enable row level security;

create policy "service_role_full_access"
  on public.pro_report_runs
  for all
  to service_role
  using (true)
  with check (true);

-- Monta o HTML do relatório Pro a partir do payload (pesquisas novas +
-- candidatos monitorados ou panorama padrão + top institutos reais).
create or replace function public.build_pro_report_html(p_payload jsonb)
 returns text
 language plpgsql
 immutable
as $function$
DECLARE
  v_polls_html text := '';
  v_inst_html text := '';
  v_cand_html text := '';
  v_poll record;
  v_inst record;
  v_cand record;
BEGIN
  FOR v_poll IN SELECT * FROM jsonb_to_recordset(p_payload->'new_polls')
    AS x(institute text, election text, state text, date text)
  LOOP
    v_polls_html := v_polls_html || format(
      '<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">%s</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">%s</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;color:#525252">%s</td></tr>',
      v_poll.institute, v_poll.election, v_poll.date
    );
  END LOOP;
  IF v_polls_html = '' THEN
    v_polls_html := format(
      '<tr><td colspan="3" style="padding:16px;color:#9ca3af;text-align:center;font-style:italic">Nenhuma pesquisa nova nos últimos %s dias.</td></tr>',
      p_payload->>'window_days'
    );
  END IF;

  FOR v_cand IN SELECT * FROM jsonb_to_recordset(p_payload->'candidates')
    AS x(name text, avg numeric)
  LOOP
    v_cand_html := v_cand_html || format(
      '<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">%s</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace">%s%%</td></tr>',
      v_cand.name, replace(v_cand.avg::text, '.', ',')
    );
  END LOOP;

  FOR v_inst IN SELECT * FROM jsonb_to_recordset(p_payload->'top_institutes')
    AS x(name text, reliability numeric)
  LOOP
    v_inst_html := v_inst_html || format(
      '<li style="margin-bottom:6px"><strong>%s</strong> <span style="color:#525252;font-size:12px;font-family:monospace">%s</span></li>',
      v_inst.name,
      ROUND(v_inst.reliability * 100)::text || '%'
    );
  END LOOP;

  RETURN format($H$
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
      <div style="border-left:4px solid #2563eb;padding-left:16px;margin-bottom:24px">
        <p style="font-size:11px;color:#525252;letter-spacing:1.5px;text-transform:uppercase;margin:0">Sinal Eleitoral · ElectioLab Pro</p>
        <h1 style="font-size:24px;font-weight:800;margin:8px 0 0 0">Panorama semanal, %s</h1>
      </div>
      <h2 style="font-size:18px;font-weight:700;margin:24px 0 12px 0">Pesquisas recentes (últimos %s dias)</h2>
      <table style="width:100%%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#525252">Instituto</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#525252">Eleição</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#525252">Data</th>
          </tr>
        </thead>
        <tbody>%s</tbody>
      </table>
      <h2 style="font-size:18px;font-weight:700;margin:24px 0 12px 0">%s</h2>
      <table style="width:100%%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#525252">Candidato</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#525252">Média ponderada</th>
          </tr>
        </thead>
        <tbody>%s</tbody>
      </table>
      <h2 style="font-size:18px;font-weight:700;margin:24px 0 12px 0">Institutos mais confiáveis</h2>
      <ul style="padding-left:20px;font-size:14px">%s</ul>
      <p style="margin-top:32px;text-align:center">
        <a href="https://electiolab.com/dashboard/alertas" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
          Configurar alertas por candidato →
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0"/>
      <p style="color:#9ca3af;font-size:11px;text-align:center">
        ElectioLab Pro · <a href="https://electiolab.com" style="color:#2563eb">electiolab.com</a><br/>
        Você está recebendo este e-mail por ser assinante do plano Pro.
      </p>
    </div>
  $H$, p_payload->>'first_name', p_payload->>'window_days', v_polls_html, p_payload->>'candidates_label', v_cand_html, v_inst_html);
END;
$function$;

-- Envia o relatório semanal Pro pra quem tem api_keys.tier='pro' ativo.
create or replace function public.cron_send_pro_weekly_report(
  p_dry_run boolean default false,
  p_test_recipient text default null,
  p_window_days integer default 14
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'vault', 'net', 'auth', 'extensions', 'pg_catalog'
as $function$
DECLARE
  v_resend_key text;
  v_flagship_election_id uuid;
  v_new_polls jsonb;
  v_top_inst jsonb;
  v_panorama jsonb;
  v_recipient RECORD;
  v_personal_candidates jsonb;
  v_payload jsonb;
  v_recipients int := 0;
  v_successes int := 0;
  v_failures int := 0;
  v_run_id uuid;
  v_subject text;
  v_html text;
  v_first_name text;
BEGIN
  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'resend_api_key' LIMIT 1;
  IF v_resend_key IS NULL THEN
    RAISE EXCEPTION 'Vault: resend_api_key ausente';
  END IF;

  -- Eleição "carro-chefe" pra quem ainda não configurou nenhum alerta.
  SELECT id INTO v_flagship_election_id
  FROM elections WHERE type = 'presidente' AND year = 2026 AND round = 1
  LIMIT 1;

  -- Pesquisas novas na janela dedicada (não fixa em 7 dias, ver nota no topo do arquivo).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'institute', i.name,
    'election', e.name,
    'state', e.state,
    'date', p.publication_date::text
  ) ORDER BY p.publication_date DESC), '[]'::jsonb)
  INTO v_new_polls
  FROM polls p
  JOIN institutes i ON i.id = p.institute_id
  JOIN elections e ON e.id = p.election_id
  WHERE p.publication_date >= CURRENT_DATE - (p_window_days || ' days')::interval
    AND p.round = 1
  LIMIT 20;

  -- Institutos confiáveis — exige >=20 pesquisas no histórico (não só "ter
  -- alguma"), senão scores placeholder de institutos com pouquíssimo track
  -- record (ex.: GERP com 12, VOX BRASIL com 9, ambos score=1.00) furavam
  -- na frente de Datafolha/Quaest, que têm dezenas de pesquisas reais.
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'reliability', reliability_score)), '[]'::jsonb)
  INTO v_top_inst
  FROM (
    SELECT i.name, i.reliability_score
    FROM institutes i
    WHERE i.reliability_score IS NOT NULL
      AND (SELECT COUNT(*) FROM polls p WHERE p.institute_id = i.id) >= 20
    ORDER BY i.reliability_score DESC
    LIMIT 5
  ) x;

  -- Panorama padrão (Presidencial 2026 1T) — snapshot mais recente por
  -- candidato, sem variação semanal (weighted_averages não guarda histórico
  -- hoje, ver nota no topo do arquivo).
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'avg', avg)), '[]'::jsonb)
  INTO v_panorama
  FROM (
    SELECT c.name, round(w.weighted_average::numeric, 1) AS avg
    FROM (
      SELECT DISTINCT ON (candidate_id) candidate_id, weighted_average
      FROM weighted_averages
      WHERE election_id = v_flagship_election_id AND scenario_label IS NULL
      ORDER BY candidate_id, calculated_at DESC
    ) w
    JOIN candidates c ON c.id = w.candidate_id
    ORDER BY w.weighted_average DESC
    LIMIT 8
  ) x;

  IF p_dry_run THEN
    RETURN jsonb_build_object(
      'dry_run', true,
      'window_days', p_window_days,
      'new_polls', v_new_polls,
      'top_institutes', v_top_inst,
      'panorama', v_panorama
    );
  END IF;

  INSERT INTO pro_report_runs (recipients, payload, notes)
  VALUES (
    0,
    jsonb_build_object('window_days', p_window_days, 'new_polls', v_new_polls, 'top_institutes', v_top_inst, 'panorama', v_panorama),
    CASE WHEN p_test_recipient IS NOT NULL THEN 'test recipient: ' || p_test_recipient ELSE NULL END
  )
  RETURNING id INTO v_run_id;

  v_subject := format('[ElectioLab Pro] Panorama semanal — %s', to_char(CURRENT_DATE, 'DD/MM'));

  FOR v_recipient IN
    SELECT DISTINCT u.id AS user_id, u.email,
           COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) AS full_name
    FROM api_keys ak
    JOIN auth.users u ON u.id = ak.user_id
    WHERE ak.tier = 'pro' AND ak.is_active = true
      AND (p_test_recipient IS NULL OR u.email = p_test_recipient)
  LOOP
    v_recipients := v_recipients + 1;
    v_first_name := split_part(v_recipient.full_name, ' ', 1);

    -- Candidatos que este assinante já monitora via alerta (personalização real).
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.name, 'avg', round(wa.weighted_average::numeric, 1)) ORDER BY wa.weighted_average DESC), '[]'::jsonb)
    INTO v_personal_candidates
    FROM user_alerts ua
    JOIN candidates c ON c.id = ua.candidate_id
    JOIN LATERAL (
      SELECT weighted_average FROM weighted_averages
      WHERE candidate_id = ua.candidate_id AND scenario_label IS NULL
      ORDER BY calculated_at DESC LIMIT 1
    ) wa ON true
    WHERE ua.user_id = v_recipient.user_id AND ua.is_active = true AND ua.candidate_id IS NOT NULL;

    v_payload := jsonb_build_object(
      'first_name', v_first_name,
      'window_days', p_window_days,
      'new_polls', v_new_polls,
      'top_institutes', v_top_inst,
      'candidates_label', CASE WHEN jsonb_array_length(v_personal_candidates) > 0 THEN 'Seus candidatos' ELSE 'Panorama atual — Presidencial 2026, 1º turno' END,
      'candidates', CASE WHEN jsonb_array_length(v_personal_candidates) > 0 THEN v_personal_candidates ELSE v_panorama END
    );

    v_html := build_pro_report_html(v_payload);

    BEGIN
      PERFORM net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_resend_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'Sinal Eleitoral <noreply@electiolab.com>',
          'to', jsonb_build_array(v_recipient.email),
          'subject', v_subject,
          'html', v_html
        ),
        timeout_milliseconds := 30000
      );
      v_successes := v_successes + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failures := v_failures + 1;
    END;
  END LOOP;

  UPDATE pro_report_runs
  SET recipients = v_recipients, successes = v_successes, failures = v_failures
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'sent', true,
    'run_id', v_run_id,
    'recipients', v_recipients,
    'successes', v_successes,
    'failures', v_failures
  );
END;
$function$;

-- SECURITY DEFINER ganha EXECUTE pra PUBLIC automaticamente na criação —
-- e todo role do Postgres (inclusive anon/authenticated) é membro implícito
-- de PUBLIC. Sem revogar, qualquer visitante não autenticado conseguiria
-- forçar envio de e-mail real pra todos os assinantes Pro batendo em
-- /rest/v1/rpc/cron_send_pro_weekly_report. Só pg_cron (postgres) deve chamar.
revoke execute on function public.cron_send_pro_weekly_report(boolean, text, integer) from public;
grant execute on function public.cron_send_pro_weekly_report(boolean, text, integer) to postgres, service_role;

-- Toda segunda 11:15 (10min depois do weekly-digest-sinal-eleitoral, evita
-- concorrência na mesma janela de cron). cron.schedule é upsert por nome.
select cron.schedule(
  'weekly-pro-report',
  '15 11 * * 1',
  $$ SELECT public.cron_send_pro_weekly_report(false, NULL, 14); $$
);
