"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PollRow {
  id: string;
  publication_date: string;
  institute_name: string;
  methodology: string;
  sample_size: number;
  margin_of_error: number | null;
  results: { candidate_name: string; percentage: number; color: string }[];
}

const methodBadge: Record<string, string> = {
  presencial: "bg-emerald-100 text-emerald-800",
  telefonica: "bg-blue-100 text-blue-800",
  online: "bg-purple-100 text-purple-800",
  mista: "bg-amber-100 text-amber-800",
};

export function PollTable({ polls }: { polls: PollRow[] }) {
  if (polls.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nenhuma pesquisa encontrada.
      </p>
    );
  }

  // Get top candidates from first poll
  const topCandidates = polls[0]?.results
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4) ?? [];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead>Instituto</TableHead>
            <TableHead className="w-[90px]">Metodo</TableHead>
            <TableHead className="w-[70px] text-right">Amostra</TableHead>
            {topCandidates.map((c) => (
              <TableHead key={c.candidate_name} className="w-[70px] text-right">
                {c.candidate_name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {polls.map((poll) => (
            <TableRow key={poll.id}>
              <TableCell className="font-mono text-xs">
                {new Date(poll.publication_date).toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell className="font-medium text-sm">
                {poll.institute_name}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`text-xs ${methodBadge[poll.methodology] ?? ""}`}
                >
                  {poll.methodology}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-xs">
                {poll.sample_size.toLocaleString("pt-BR")}
              </TableCell>
              {topCandidates.map((tc) => {
                const result = poll.results.find(
                  (r) => r.candidate_name === tc.candidate_name
                );
                return (
                  <TableCell
                    key={tc.candidate_name}
                    className="text-right font-mono text-sm font-semibold"
                    style={{ color: tc.color }}
                  >
                    {result ? `${result.percentage}%` : "—"}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
