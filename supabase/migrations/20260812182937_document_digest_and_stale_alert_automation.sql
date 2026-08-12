-- DOCUMENTAÇÃO — sem mudança de comportamento.
--
-- Esta automação (digest semanal "Sinal Eleitoral", alerta de pesquisa parada,
-- alerta de usuário) já roda em produção há tempo, mas até 2026-08-12 existia
-- só dentro do Postgres (funções + pg_cron + pg_net) e não tinha nenhuma linha
-- versionada no Git. Este arquivo reconstrói fielmente o que já está rodando,
-- extraído de `pg_get_functiondef` e `cron.job` no projeto real — CREATE OR
-- REPLACE / IF NOT EXISTS / cron.schedule (idempotente por nome de job) tornam
-- reaplicar isso um no-op. Ver docs/PENDENCIES.md e a auditoria de 2026-08-12.
--
-- Tabelas de auditoria (já com RLS habilitada em
-- 20260812182214_enable_rls_digest_and_alerts_cron_tables.sql).

create table if not exists public.digest_runs (
  id         uuid primary key default gen_random_uuid(),
  sent_at    timestamptz not null default now(),
  recipients integer not null default 0,
  successes  integer not null default 0,
  failures   integer not null default 0,
  payload    jsonb,
  notes      text
);

create index if not exists digest_runs_sent_at_idx
  on public.digest_runs (sent_at desc);

create table if not exists public.stale_poll_alerts (
  id              uuid primary key default gen_random_uuid(),
  sent_at         timestamptz not null default now(),
  threshold_days  integer not null,
  stale_count     integer not null,
  payload         jsonb not null,
  http_request_id bigint
);

create index if not exists stale_poll_alerts_sent_at_idx
  on public.stale_poll_alerts (sent_at desc);

create table if not exists public.user_alert_deliveries (
  id              uuid primary key default gen_random_uuid(),
  alert_id        uuid not null references public.user_alerts(id) on delete cascade,
  triggered_at    timestamptz not null default now(),
  payload         jsonb not null,
  http_request_id bigint
);

create index if not exists uad_alert_idx
  on public.user_alert_deliveries (alert_id, triggered_at desc);

-- Monta o HTML do digest semanal a partir do payload (pesquisas novas + top institutos).
create or replace function public.build_digest_html(p_payload jsonb, p_unsub_url text)
 returns text
 language plpgsql
 immutable
as $function$
DECLARE
  v_polls_html text := '';
  v_inst_html text := '';
  v_poll record;
  v_inst record;
BEGIN
  FOR v_poll IN SELECT * FROM jsonb_to_recordset(p_payload->'new_polls')
    AS x(institute text, election text, state text, date text, sample int)
  LOOP
    v_polls_html := v_polls_html || format(
      '<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-weight:600">%s</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">%s</td><td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;color:#525252">%s</td></tr>',
      v_poll.institute, v_poll.election, v_poll.date
    );
  END LOOP;
  IF v_polls_html = '' THEN
    v_polls_html := '<tr><td colspan="3" style="padding:16px;color:#9ca3af;text-align:center;font-style:italic">Nenhuma pesquisa nova esta semana.</td></tr>';
  END IF;

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
        <p style="font-size:11px;color:#525252;letter-spacing:1.5px;text-transform:uppercase;margin:0">Sinal Eleitoral · ElectioLab</p>
        <h1 style="font-size:24px;font-weight:800;margin:8px 0 0 0">Resumo da semana</h1>
      </div>
      <h2 style="font-size:18px;font-weight:700;margin:24px 0 12px 0">Pesquisas novas</h2>
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
      <h2 style="font-size:18px;font-weight:700;margin:24px 0 12px 0">Top institutos por acurácia</h2>
      <ul style="padding-left:20px;font-size:14px">%s</ul>
      <p style="margin-top:32px;text-align:center">
        <a href="https://electiolab.com" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
          Acessar dashboard →
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0"/>
      <p style="color:#9ca3af;font-size:11px;text-align:center">
        ElectioLab · <a href="https://electiolab.com" style="color:#2563eb">electiolab.com</a><br/>
        Não quer mais receber? <a href="%s" style="color:#9ca3af;text-decoration:underline">Cancelar inscrição</a>
      </p>
    </div>
  $H$, v_polls_html, v_inst_html, p_unsub_url);
END;
$function$;

-- Envia o digest semanal "Sinal Eleitoral" para os inscritos confirmados da newsletter.
create or replace function public.cron_send_weekly_digest(p_dry_run boolean default false, p_test_recipient text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'vault', 'net', 'extensions', 'pg_catalog'
as $function$
DECLARE
  v_resend_key text;
  v_subscribers RECORD;
  v_recipients int := 0;
  v_successes int := 0;
  v_failures int := 0;
  v_payload jsonb;
  v_movers jsonb;
  v_new_polls jsonb;
  v_top_inst jsonb;
  v_html text;
  v_subject text;
  v_run_id uuid;
  v_unsub_url text;
BEGIN
  -- 1) Busca os secrets
  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'resend_api_key' LIMIT 1;
  IF v_resend_key IS NULL THEN
    RAISE EXCEPTION 'Vault: resend_api_key ausente';
  END IF;

  -- 2) Coleta dados da semana

  -- 2a. Pesquisas publicadas nos últimos 7 dias
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'institute', i.name,
    'election', e.name,
    'state', e.state,
    'date', p.publication_date::text,
    'sample', p.sample_size
  ) ORDER BY p.publication_date DESC), '[]'::jsonb)
  INTO v_new_polls
  FROM polls p
  JOIN institutes i ON i.id = p.institute_id
  JOIN elections e ON e.id = p.election_id
  WHERE p.publication_date >= CURRENT_DATE - INTERVAL '7 days'
    AND p.round = 1
  LIMIT 20;

  -- 2b. Top movimentos: candidatos com maior |delta| entre 2 médias
  --     mais recentes (precisa keep_history=true ativo, fallback: skipa)
  v_movers := '[]'::jsonb;

  -- 2c. Top 5 institutos por reliability
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'name', name,
    'reliability', reliability_score
  ) ORDER BY reliability_score DESC NULLS LAST), '[]'::jsonb)
  INTO v_top_inst
  FROM institutes
  WHERE reliability_score IS NOT NULL
  LIMIT 5;

  v_payload := jsonb_build_object(
    'period_end', CURRENT_DATE::text,
    'new_polls_count', jsonb_array_length(v_new_polls),
    'new_polls', v_new_polls,
    'top_institutes', v_top_inst
  );

  -- 3) Se dry_run, retorna payload sem enviar
  IF p_dry_run THEN
    RETURN jsonb_build_object('dry_run', true, 'payload', v_payload);
  END IF;

  -- 4) Cria registro do run (com 0s; vamos atualizar)
  INSERT INTO digest_runs (recipients, payload, notes)
  VALUES (0, v_payload, CASE WHEN p_test_recipient IS NOT NULL THEN 'test recipient: ' || p_test_recipient ELSE NULL END)
  RETURNING id INTO v_run_id;

  v_subject := format(
    '[Sinal Eleitoral] %s — %s pesquisas novas',
    to_char(CURRENT_DATE, 'DD/MM'),
    jsonb_array_length(v_new_polls)
  );

  -- 5) Loop subscribers (ou 1 se test_recipient)
  FOR v_subscribers IN
    SELECT id, email FROM newsletter_subscribers
    WHERE is_active = true
      AND confirmed_at IS NOT NULL
      AND unsubscribed_at IS NULL
      AND (p_test_recipient IS NULL OR email = p_test_recipient)
  LOOP
    v_recipients := v_recipients + 1;
    v_unsub_url := 'https://electiolab.com/api/newsletter/unsubscribe?id=' || v_subscribers.id;

    -- HTML body usando v_payload
    v_html := build_digest_html(v_payload, v_unsub_url);

    -- POST Resend (best-effort, não bloqueia loop)
    BEGIN
      PERFORM net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_resend_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'Sinal Eleitoral <noreply@electiolab.com>',
          'to', jsonb_build_array(v_subscribers.email),
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

  UPDATE digest_runs
  SET recipients = v_recipients, successes = v_successes, failures = v_failures
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'sent', true,
    'run_id', v_run_id,
    'recipients', v_recipients,
    'successes', v_successes,
    'failures', v_failures,
    'payload', v_payload
  );
END;
$function$;

-- Alerta por e-mail quando uma UF governador 2026 fica sem pesquisa nova há mais de threshold_days.
create or replace function public.cron_check_stale_polls(p_threshold_days integer default 30, p_force boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'vault', 'net', 'extensions', 'pg_catalog'
as $function$
DECLARE
  v_resend_key text;
  v_recipient  text;
  v_stale      jsonb;
  v_stale_count int;
  v_html       text;
  v_text       text;
  v_subject    text;
  v_req_id     bigint;
  v_result     jsonb;
  v_row        record;
  v_list_html  text := '';
  v_list_text  text := '';
BEGIN
  -- Coleta UFs governador 2026 com pesquisa mais recente > threshold dias
  SELECT
    COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.days_old DESC), '[]'::jsonb),
    COUNT(*)
  INTO v_stale, v_stale_count
  FROM (
    SELECT
      e.state,
      e.id AS election_id,
      e.name,
      MAX(p.publication_date)::text AS most_recent,
      (CURRENT_DATE - MAX(p.publication_date))::int AS days_old
    FROM elections e
    LEFT JOIN polls p ON p.election_id = e.id
    WHERE e.type = 'governador' AND e.year = 2026 AND e.round = 1
    GROUP BY e.state, e.id, e.name
    HAVING MAX(p.publication_date) IS NULL
        OR (CURRENT_DATE - MAX(p.publication_date)) > p_threshold_days
  ) r;

  -- Se nada stale e não é force-run, sai cedo
  IF v_stale_count = 0 AND NOT p_force THEN
    RETURN jsonb_build_object(
      'sent', false,
      'reason', 'no_stale_ufs',
      'threshold_days', p_threshold_days
    );
  END IF;

  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'resend_api_key' LIMIT 1;
  SELECT decrypted_secret INTO v_recipient  FROM vault.decrypted_secrets WHERE name = 'alert_recipient' LIMIT 1;

  IF v_resend_key IS NULL OR v_recipient IS NULL THEN
    RAISE EXCEPTION 'Vault: resend_api_key ou alert_recipient ausentes';
  END IF;

  -- Monta corpo do email (HTML + plain)
  FOR v_row IN SELECT * FROM jsonb_to_recordset(v_stale)
    AS x(state text, election_id uuid, name text, most_recent text, days_old int)
    ORDER BY (days_old IS NULL) DESC, days_old DESC
  LOOP
    v_list_html := v_list_html || format(
      '<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;">%s</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">%s</td><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-family:monospace;color:%s;">%s dias</td></tr>',
      v_row.state,
      COALESCE(v_row.most_recent, '— sem pesquisa'),
      CASE WHEN v_row.days_old IS NULL OR v_row.days_old > 60 THEN '#b91c1c' WHEN v_row.days_old > 45 THEN '#d97706' ELSE '#525252' END,
      COALESCE(v_row.days_old::text, '∞')
    );
    v_list_text := v_list_text || format(E'  %s — %s (%s dias)\n', v_row.state, COALESCE(v_row.most_recent, 'sem pesquisa'), COALESCE(v_row.days_old::text, '∞'));
  END LOOP;

  v_subject := format('[ElectioLab] %s UFs com pesquisa stale (>%s dias)', v_stale_count, p_threshold_days);

  v_html := format($H$
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#111827">
      <h2 style="color:#2563eb;margin:0 0 8px 0">⚠️ Pesquisas eleitorais stale</h2>
      <p style="color:#525252;margin:0 0 16px 0">
        %s UFs Governador 2026 estão sem pesquisa nova há mais de %s dias.
      </p>
      <table style="width:100%%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#525252">UF</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#525252">Mais recente</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#525252">Idade</th>
          </tr>
        </thead>
        <tbody>%s</tbody>
      </table>
      <p style="margin-top:24px;color:#525252;font-size:13px">
        Sugestão: rodar busca manual ou usar <code>npx tsx scripts/ingest-manual.ts</code> após
        confirmar via TSE / Gazeta do Povo / sites institucionais.
      </p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
      <p style="color:#9ca3af;font-size:11px">
        ElectioLab cron • <code>cron_check_stale_polls(threshold=%s)</code>
      </p>
    </div>
  $H$, v_stale_count, p_threshold_days, v_list_html, p_threshold_days);

  v_text := format(E'%s UFs Governador 2026 stale (>%s dias):\n\n%s', v_stale_count, p_threshold_days, v_list_text);

  -- POST Resend via pg_net
  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_resend_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'from', 'ElectioLab <noreply@electiolab.com>',
      'to', jsonb_build_array(v_recipient),
      'subject', v_subject,
      'html', v_html,
      'text', v_text
    ),
    timeout_milliseconds := 30000
  ) INTO v_req_id;

  -- Audit
  INSERT INTO public.stale_poll_alerts (threshold_days, stale_count, payload, http_request_id)
  VALUES (p_threshold_days, v_stale_count, v_stale, v_req_id);

  v_result := jsonb_build_object(
    'sent', true,
    'stale_count', v_stale_count,
    'threshold_days', p_threshold_days,
    'recipient', v_recipient,
    'http_request_id', v_req_id,
    'stale', v_stale
  );
  RETURN v_result;
END;
$function$;

-- Checa alertas de usuário ativos (nova pesquisa / movimento / mudança TSE) e dispara e-mail via Resend.
create or replace function public.cron_check_user_alerts()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'vault', 'net', 'auth', 'extensions', 'pg_catalog'
as $function$
DECLARE
  v_resend_key text;
  v_alert RECORD;
  v_user_email text;
  v_current_value numeric;
  v_should_trigger boolean;
  v_subject text;
  v_html text;
  v_req_id bigint;
  v_triggered int := 0;
  v_checked int := 0;
BEGIN
  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'resend_api_key' LIMIT 1;
  IF v_resend_key IS NULL THEN
    RAISE EXCEPTION 'Vault: resend_api_key ausente';
  END IF;

  FOR v_alert IN
    SELECT a.*,
           c.name AS cand_name, c.slug AS cand_slug, c.color AS cand_color, c.party,
           e.name AS election_name, e.state AS election_state
    FROM user_alerts a
    LEFT JOIN candidates c ON c.id = a.candidate_id
    LEFT JOIN elections e ON e.id = COALESCE(a.election_id, c.election_id)
    WHERE a.is_active = true
  LOOP
    v_checked := v_checked + 1;
    v_should_trigger := false;
    v_current_value := NULL;
    v_subject := NULL;

    -- Pega email do user
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_alert.user_id;
    IF v_user_email IS NULL THEN CONTINUE; END IF;

    -- TIPO 1: new_poll — alerta se há pesquisa nova após last_checked_at
    IF v_alert.alert_type = 'new_poll' THEN
      DECLARE
        v_new_count int;
      BEGIN
        SELECT COUNT(*) INTO v_new_count FROM polls p
        WHERE p.election_id = COALESCE(v_alert.election_id,
                                       (SELECT election_id FROM candidates WHERE id = v_alert.candidate_id))
          AND p.created_at > COALESCE(v_alert.last_checked_at, v_alert.created_at);
        IF v_new_count > 0 THEN
          v_should_trigger := true;
          v_subject := format('[ElectioLab] %s pesquisa(s) nova(s) — %s',
                              v_new_count, COALESCE(v_alert.cand_name, v_alert.election_name));
          v_current_value := v_new_count;
        END IF;
      END;

    -- TIPO 2: movement — alerta se média ponderada do candidato mudou >= threshold_pp
    ELSIF v_alert.alert_type = 'movement' AND v_alert.candidate_id IS NOT NULL THEN
      SELECT weighted_average INTO v_current_value
      FROM weighted_averages
      WHERE candidate_id = v_alert.candidate_id
      ORDER BY calculated_at DESC LIMIT 1;

      IF v_current_value IS NOT NULL AND v_alert.last_value IS NOT NULL THEN
        IF abs(v_current_value - v_alert.last_value) >= COALESCE(v_alert.threshold_pp, 5) THEN
          v_should_trigger := true;
          v_subject := format('[ElectioLab] %s mudou %s pp (%s%% → %s%%)',
                              v_alert.cand_name,
                              ROUND(abs(v_current_value - v_alert.last_value)::numeric, 1)::text,
                              ROUND(v_alert.last_value::numeric, 1)::text,
                              ROUND(v_current_value::numeric, 1)::text);
        END IF;
      END IF;

    -- TIPO 3: tse_change — alerta se tse_last_situation mudou
    ELSIF v_alert.alert_type = 'tse_change' AND v_alert.candidate_id IS NOT NULL THEN
      DECLARE
        v_current_situation text;
      BEGIN
        SELECT tse_last_situation INTO v_current_situation
        FROM candidates WHERE id = v_alert.candidate_id;
        -- Trigger se mudou desde a última checagem (last_value armazenamos como numeric;
        -- pra TSE: 1=APTO, 0=INAPTO, NULL=unknown)
        IF v_current_situation IS NOT NULL THEN
          DECLARE
            v_current_num numeric := CASE v_current_situation
              WHEN 'APTO' THEN 1 WHEN 'INAPTO' THEN 0 ELSE NULL END;
          BEGIN
            IF v_alert.last_value IS NOT NULL AND v_current_num != v_alert.last_value THEN
              v_should_trigger := true;
              v_current_value := v_current_num;
              v_subject := format('[ElectioLab] %s — situação TSE mudou para %s',
                                  v_alert.cand_name, v_current_situation);
            ELSIF v_alert.last_value IS NULL AND v_current_num IS NOT NULL THEN
              -- Primeira leitura, só seta baseline sem trigger
              v_current_value := v_current_num;
            END IF;
          END;
        END IF;
      END;
    END IF;

    -- Atualiza baseline + last_checked
    UPDATE user_alerts
    SET last_checked_at = now(),
        last_value = COALESCE(v_current_value, last_value)
    WHERE id = v_alert.id;

    IF NOT v_should_trigger THEN CONTINUE; END IF;

    -- Monta HTML simples
    v_html := format($H$
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <h2 style="color:#2563eb;margin:0 0 12px 0">⚠️ Alerta ElectioLab</h2>
        <p style="font-size:15px;line-height:1.5">%s</p>
        <p style="margin:24px 0">
          <a href="https://electiolab.com/candidato/%s"
             style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
            Ver perfil completo →
          </a>
        </p>
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">
          Você configurou esse alerta em /dashboard/alertas. Para parar de receber, desative-o lá.
        </p>
      </div>
    $H$, v_subject, COALESCE(v_alert.cand_slug, ''));

    BEGIN
      SELECT net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || v_resend_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'from', 'ElectioLab Alertas <noreply@electiolab.com>',
          'to', jsonb_build_array(v_user_email),
          'subject', v_subject,
          'html', v_html
        ),
        timeout_milliseconds := 20000
      ) INTO v_req_id;

      INSERT INTO user_alert_deliveries (alert_id, payload, http_request_id)
      VALUES (
        v_alert.id,
        jsonb_build_object('subject', v_subject, 'value', v_current_value),
        v_req_id
      );

      UPDATE user_alerts SET last_triggered_at = now() WHERE id = v_alert.id;
      v_triggered := v_triggered + 1;
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;

  RETURN jsonb_build_object('checked', v_checked, 'triggered', v_triggered);
END;
$function$;

-- Dispara a Edge Function recalculate-averages (?all=true) a cada 6h.
create or replace function public.cron_recalculate_averages()
 returns bigint
 language plpgsql
 security definer
 set search_path to 'public', 'vault', 'net', 'extensions'
as $function$
DECLARE
  v_url   text;
  v_token text;
  v_req_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_url   FROM vault.decrypted_secrets WHERE name = 'project_url'      LIMIT 1;
  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;

  IF v_url IS NULL OR v_token IS NULL THEN
    RAISE EXCEPTION 'Secrets project_url/service_role_key não encontrados no vault';
  END IF;

  SELECT net.http_post(
    url := v_url || '/functions/v1/recalculate-averages?all=true',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || v_token,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO v_req_id;

  RETURN v_req_id;
END;
$function$;

-- Registro dos 4 jobs pg_cron do ElectioLab (cron.schedule é upsert por nome —
-- reaplicar é no-op). NÃO inclui meta-ads-daily-ingest / bacen-daily-ingest,
-- que são de outro produto compartilhando este mesmo projeto Supabase de propósito.
select cron.schedule(
  'recalculate-averages-every-6h',
  '5 */6 * * *',
  $$ SELECT public.cron_recalculate_averages(); $$
);

select cron.schedule(
  'check-stale-polls-weekly',
  '5 12 * * 1',
  $$ SELECT public.cron_check_stale_polls(30, false); $$
);

select cron.schedule(
  'weekly-digest-sinal-eleitoral',
  '5 11 * * 1',
  $$ SELECT public.cron_send_weekly_digest(false, NULL); $$
);

select cron.schedule(
  'check-user-alerts-30min',
  '*/30 * * * *',
  $$ SELECT public.cron_check_user_alerts(); $$
);
