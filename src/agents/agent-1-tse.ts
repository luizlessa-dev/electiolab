/**
 * Agent 1: TSE Ingestão
 *
 * Downloads pesquisa_eleitoral_2026.zip from TSE CDN daily,
 * parses CSV, upserts to pesqele_registry, triggers Agent 2
 *
 * Status: ✅ MVP READY
 */

import { RufloAgent, AgentConfig } from "./base";
import { createHash } from "crypto";

// @ts-ignore
const AdmZip = require("adm-zip");

const TSE_CDN_URL =
  "https://cdn.tse.jus.br/pesquisa_eleitoral_2026.zip";

export interface PesqeleRow {
  protocol: string;
  institute: string;
  fieldwork_start: string;
  fieldwork_end: string;
  publication_date: string;
  [key: string]: any;
}

export class TseIngestAgent extends RufloAgent {
  constructor() {
    const config: AgentConfig = {
      name: "TSE Ingestão",
      id: "tse-ingestion-001",
      timeout_ms: 300000,
      max_retries: 4,
    };
    super(config);
  }

  async run() {
    const startTime = Date.now();
    console.log(`[${this.config.id}] Starting TSE ingestão...`);

    try {
      const result = await this.retry(async () => {
        const zipBuffer = await this.downloadTseZip();
        const checksum = this.sha256(Buffer.from(zipBuffer));
        console.log(
          `[${this.config.id}] ZIP downloaded, checksum: ${checksum}`
        );

        const csvContent = this.extractCsv(zipBuffer);
        console.log(
          `[${this.config.id}] CSV extracted, ${csvContent.length} bytes`
        );

        const lines = this.parseCSV(csvContent);
        console.log(`[${this.config.id}] Parsed ${lines.length} rows`);

        if (lines.length === 0) {
          throw new Error("CSV is empty after parsing");
        }

        const upserted = await this.upsertPesqele(lines);
        console.log(`[${this.config.id}] Upserted ${upserted} rows`);

        const missing = await this.updateMissingQueue();
        console.log(
          `[${this.config.id}] Updated missing queue, ${missing} items`
        );

        const duration = Date.now() - startTime;

        return {
          ok: true,
          download_id: `tse_${new Date().toISOString().slice(0, 10)}`,
          checksum_sha256: checksum,
          row_count: lines.length,
          upserted_count: upserted,
          missing_count: missing,
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        };
      });

      await this.logAudit(result);
      return result;
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(`[${this.config.id}] ERROR:`, error.message);
      await this.logAudit(null, error);
      throw error;
    }
  }

  private async downloadTseZip(): Promise<ArrayBuffer> {
    console.log(`[${this.config.id}] Downloading from ${TSE_CDN_URL}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout_ms);

    try {
      const response = await fetch(TSE_CDN_URL, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `TSE CDN returned ${response.status}: ${response.statusText}`
        );
      }

      return await response.arrayBuffer();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private extractCsv(zipBuffer: ArrayBuffer): string {
    const zip = new AdmZip(Buffer.from(zipBuffer));
    const csvContent = zip.readAsText("pesquisa_eleitoral_2026.csv");
    return csvContent;
  }

  private sha256(data: Buffer): string {
    return createHash("sha256").update(data).digest("hex");
  }

  private parseCSV(content: string): PesqeleRow[] {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows: PesqeleRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: Record<string, string> = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });

      if (row.protocol) {
        rows.push(row as PesqeleRow);
      }
    }

    return rows;
  }

  private async upsertPesqele(rows: PesqeleRow[]): Promise<number> {
    const { data, error } = await this.supabase
      .from("pesqele_registry")
      .upsert(
        rows.map((row) => ({
          protocol: row.protocol,
          institute: row.institute,
          fieldwork_start: row.fieldwork_start,
          fieldwork_end: row.fieldwork_end,
          publication_date: row.publication_date,
          _tse_ingested_at: new Date().toISOString(),
          _source: "TSE CDN",
        })),
        { onConflict: "protocol" }
      )
      .select("count");

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    return data?.length || 0;
  }

  private async updateMissingQueue(): Promise<number> {
    const { data, error } = await this.supabase.rpc(
      "update_pesqele_missing",
      { year: 2026 }
    );

    if (error) {
      console.warn(
        `[${this.config.id}] RPC update_pesqele_missing warning:`,
        error.message
      );
      return 0;
    }

    return (data as { missing_count: number })?.missing_count || 0;
  }
}

export async function handleTseIngestWebhook(result: any) {
  console.log("[tse-complete webhook] Received result:", {
    ok: result.ok,
    row_count: result.row_count,
    upserted_count: result.upserted_count,
    duration_ms: result.duration_ms,
  });
}
