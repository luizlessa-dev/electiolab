-- net.http_post é assíncrono: retorna um request_id na hora, sem esperar a
-- resposta real. Os 4 crons de e-mail (cron_send_pro_weekly_report,
-- cron_send_weekly_digest, cron_check_stale_polls, cron_check_user_alerts)
-- faziam PERFORM/SELECT net.http_post e contavam sucesso só por não ter
-- lançado exceção Postgres — mas erro HTTP (401 da Resend, por exemplo) não
-- lança exceção, só chega como status_code de erro na resposta assíncrona.
-- Foi assim que a resend_api_key ficou inválida por pelo menos 30 dias sem
-- nenhum alerta disparar (achado ao testar o relatório Pro em 2026-09-01).
--
-- Fix: dispara todos os e-mails sem bloquear (net.http_post puro, como já
-- era), guarda os request_ids, e só então lê net._http_response em lote —
-- uma leitura de tabela simples — pra confirmar o status_code real.
--
-- A margem de espera precisou de 3 iterações em teste ao vivo: um
-- net.http_collect_response(id, async:=false) bloqueante (tentativa 1) já
-- estourou 8s pra uma chamada HTTP simples nesse projeto — o worker do
-- pg_net aqui é bem mais lento que o normal. Um pg_sleep(5) fixo (tentativa
-- 2) ainda deu falso negativo: a resposta real (200, confirmado em
-- net._http_response) chegou ~0.03s depois do check. Versão final: até 8
-- tentativas de pg_sleep(4) = até 32s de margem, saindo assim que todos os
-- request_ids tiverem resposta — alinhado ao timeout_milliseconds:=30000
-- que os próprios requests já usam. Os 4 crons rodam como role `postgres`
-- via pg_cron, que não tem statement_timeout configurado, então esperar
-- mais não trava nada em produção (só o teste via client de SQL comum, que
-- tem um cap de 8s próprio).

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
  v_req_id bigint;
  v_req_ids bigint[] := '{}';
  v_resolved int;
  v_attempt int;
BEGIN
  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'resend_api_key' LIMIT 1;
  IF v_resend_key IS NULL THEN
    RAISE EXCEPTION 'Vault: resend_api_key ausente';
  END IF;

  SELECT id INTO v_flagship_election_id
  FROM elections WHERE type = 'presidente' AND year = 2026 AND round = 1
  LIMIT 1;

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

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', name, 'avg', avg, 'delta', delta)), '[]'::jsonb)
  INTO v_panorama
  FROM (
    SELECT c.name,
           round(w.weighted_average::numeric, 1) AS avg,
           CASE WHEN pw.weighted_average IS NOT NULL
                THEN round((w.weighted_average - pw.weighted_average)::numeric, 1)
                ELSE NULL END AS delta
    FROM (
      SELECT DISTINCT ON (candidate_id) candidate_id, weighted_average
      FROM weighted_averages
      WHERE election_id = v_flagship_election_id AND scenario_label IS NULL
      ORDER BY candidate_id, calculated_at DESC
    ) w
    JOIN candidates c ON c.id = w.candidate_id
    LEFT JOIN LATERAL (
      SELECT weighted_average FROM weighted_averages
      WHERE candidate_id = w.candidate_id AND election_id = v_flagship_election_id AND scenario_label IS NULL
        AND calculated_at <= now() - (p_window_days || ' days')::interval
      ORDER BY calculated_at DESC LIMIT 1
    ) pw ON true
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
    FROM auth.users u
    LEFT JOIN api_keys ak ON ak.user_id = u.id AND ak.tier = 'pro' AND ak.is_active = true
    WHERE (p_test_recipient IS NOT NULL AND u.email = p_test_recipient)
       OR (p_test_recipient IS NULL AND ak.id IS NOT NULL)
  LOOP
    v_recipients := v_recipients + 1;
    v_first_name := split_part(v_recipient.full_name, ' ', 1);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'name', c.name,
      'avg', round(wa.weighted_average::numeric, 1),
      'delta', CASE WHEN pw.weighted_average IS NOT NULL
                    THEN round((wa.weighted_average - pw.weighted_average)::numeric, 1)
                    ELSE NULL END
    ) ORDER BY wa.weighted_average DESC), '[]'::jsonb)
    INTO v_personal_candidates
    FROM user_alerts ua
    JOIN candidates c ON c.id = ua.candidate_id
    JOIN LATERAL (
      SELECT weighted_average FROM weighted_averages
      WHERE candidate_id = ua.candidate_id AND scenario_label IS NULL
      ORDER BY calculated_at DESC LIMIT 1
    ) wa ON true
    LEFT JOIN LATERAL (
      SELECT weighted_average FROM weighted_averages
      WHERE candidate_id = ua.candidate_id AND scenario_label IS NULL
        AND calculated_at <= now() - (p_window_days || ' days')::interval
      ORDER BY calculated_at DESC LIMIT 1
    ) pw ON true
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
      v_req_id := net.http_post(
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
      v_req_ids := array_append(v_req_ids, v_req_id);
    EXCEPTION WHEN OTHERS THEN
      v_failures := v_failures + 1;
    END;
  END LOOP;

  IF array_length(v_req_ids, 1) > 0 THEN
    FOR v_attempt IN 1..8 LOOP
      PERFORM pg_sleep(4);
      SELECT count(*) INTO v_resolved FROM net._http_response WHERE id = ANY(v_req_ids);
      EXIT WHEN v_resolved >= array_length(v_req_ids, 1);
    END LOOP;

    SELECT count(*) FILTER (WHERE status_code BETWEEN 200 AND 299) INTO v_successes
    FROM net._http_response WHERE id = ANY(v_req_ids);
    v_failures := v_failures + (array_length(v_req_ids, 1) - v_successes);
  END IF;

  UPDATE pro_report_runs
  SET recipients = v_recipients, successes = v_successes, failures = v_failures
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'sent', v_successes > 0,
    'run_id', v_run_id,
    'recipients', v_recipients,
    'successes', v_successes,
    'failures', v_failures
  );
END;
$function$;

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
  v_req_id bigint;
  v_req_ids bigint[] := '{}';
  v_resolved int;
  v_attempt int;
BEGIN
  SELECT decrypted_secret INTO v_resend_key FROM vault.decrypted_secrets WHERE name = 'resend_api_key' LIMIT 1;
  IF v_resend_key IS NULL THEN
    RAISE EXCEPTION 'Vault: resend_api_key ausente';
  END IF;

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

  v_movers := '[]'::jsonb;

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

  IF p_dry_run THEN
    RETURN jsonb_build_object('dry_run', true, 'payload', v_payload);
  END IF;

  INSERT INTO digest_runs (recipients, payload, notes)
  VALUES (0, v_payload, CASE WHEN p_test_recipient IS NOT NULL THEN 'test recipient: ' || p_test_recipient ELSE NULL END)
  RETURNING id INTO v_run_id;

  v_subject := format(
    '[Sinal Eleitoral] %s — %s pesquisas novas',
    to_char(CURRENT_DATE, 'DD/MM'),
    jsonb_array_length(v_new_polls)
  );

  FOR v_subscribers IN
    SELECT id, email FROM newsletter_subscribers
    WHERE is_active = true
      AND confirmed_at IS NOT NULL
      AND unsubscribed_at IS NULL
      AND (p_test_recipient IS NULL OR email = p_test_recipient)
  LOOP
    v_recipients := v_recipients + 1;
    v_unsub_url := 'https://electiolab.com/api/newsletter/unsubscribe?id=' || v_subscribers.id;

    v_html := build_digest_html(v_payload, v_unsub_url);

    BEGIN
      v_req_id := net.http_post(
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
      v_req_ids := array_append(v_req_ids, v_req_id);
    EXCEPTION WHEN OTHERS THEN
      v_failures := v_failures + 1;
    END;
  END LOOP;

  IF array_length(v_req_ids, 1) > 0 THEN
    FOR v_attempt IN 1..8 LOOP
      PERFORM pg_sleep(4);
      SELECT count(*) INTO v_resolved FROM net._http_response WHERE id = ANY(v_req_ids);
      EXIT WHEN v_resolved >= array_length(v_req_ids, 1);
    END LOOP;

    SELECT count(*) FILTER (WHERE status_code BETWEEN 200 AND 299) INTO v_successes
    FROM net._http_response WHERE id = ANY(v_req_ids);
    v_failures := v_failures + (array_length(v_req_ids, 1) - v_successes);
  END IF;

  UPDATE digest_runs
  SET recipients = v_recipients, successes = v_successes, failures = v_failures
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'sent', v_successes > 0,
    'run_id', v_run_id,
    'recipients', v_recipients,
    'successes', v_successes,
    'failures', v_failures,
    'payload', v_payload
  );
END;
$function$;

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
  v_status_code int;
  v_attempt    int;
  v_result     jsonb;
  v_row        record;
  v_list_html  text := '';
  v_list_text  text := '';
BEGIN
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

  v_req_id := net.http_post(
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
  );

  FOR v_attempt IN 1..8 LOOP
    PERFORM pg_sleep(4);
    SELECT status_code INTO v_status_code FROM net._http_response WHERE id = v_req_id;
    EXIT WHEN v_status_code IS NOT NULL;
  END LOOP;

  INSERT INTO public.stale_poll_alerts (threshold_days, stale_count, payload, http_request_id)
  VALUES (p_threshold_days, v_stale_count, v_stale, v_req_id);

  v_result := jsonb_build_object(
    'sent', COALESCE(v_status_code, 0) BETWEEN 200 AND 299,
    'http_status', v_status_code,
    'stale_count', v_stale_count,
    'threshold_days', p_threshold_days,
    'recipient', v_recipient,
    'http_request_id', v_req_id,
    'stale', v_stale
  );
  RETURN v_result;
END;
$function$;

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
  v_pending jsonb := '[]'::jsonb;
  v_pending_ids bigint[] := '{}';
  v_p RECORD;
  v_status_code int;
  v_ok boolean;
  v_resolved int;
  v_attempt int;
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

    SELECT email INTO v_user_email FROM auth.users WHERE id = v_alert.user_id;
    IF v_user_email IS NULL THEN CONTINUE; END IF;

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

    ELSIF v_alert.alert_type = 'tse_change' AND v_alert.candidate_id IS NOT NULL THEN
      DECLARE
        v_current_situation text;
      BEGIN
        SELECT tse_last_situation INTO v_current_situation
        FROM candidates WHERE id = v_alert.candidate_id;
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
              v_current_value := v_current_num;
            END IF;
          END;
        END IF;
      END;
    END IF;

    UPDATE user_alerts
    SET last_checked_at = now(),
        last_value = COALESCE(v_current_value, last_value)
    WHERE id = v_alert.id;

    IF NOT v_should_trigger THEN CONTINUE; END IF;

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
      v_req_id := net.http_post(
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
      );
      v_pending := v_pending || jsonb_build_array(jsonb_build_object(
        'alert_id', v_alert.id, 'req_id', v_req_id, 'subject', v_subject, 'value', v_current_value
      ));
      v_pending_ids := array_append(v_pending_ids, v_req_id);
    EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;

  IF jsonb_array_length(v_pending) > 0 THEN
    FOR v_attempt IN 1..8 LOOP
      PERFORM pg_sleep(4);
      SELECT count(*) INTO v_resolved FROM net._http_response WHERE id = ANY(v_pending_ids);
      EXIT WHEN v_resolved >= array_length(v_pending_ids, 1);
    END LOOP;

    FOR v_p IN SELECT * FROM jsonb_to_recordset(v_pending)
      AS x(alert_id uuid, req_id bigint, subject text, value numeric)
    LOOP
      SELECT status_code INTO v_status_code FROM net._http_response WHERE id = v_p.req_id;
      v_ok := COALESCE(v_status_code, 0) BETWEEN 200 AND 299;

      INSERT INTO user_alert_deliveries (alert_id, payload, http_request_id)
      VALUES (
        v_p.alert_id,
        jsonb_build_object('subject', v_p.subject, 'value', v_p.value, 'sent', v_ok, 'http_status', v_status_code),
        v_p.req_id
      );

      IF v_ok THEN
        UPDATE user_alerts SET last_triggered_at = now() WHERE id = v_p.alert_id;
        v_triggered := v_triggered + 1;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('checked', v_checked, 'triggered', v_triggered);
END;
$function$;
