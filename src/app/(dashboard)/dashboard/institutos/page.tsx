import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstituteRanking } from "@/components/charts/institute-ranking";
import { getInstitutes } from "@/lib/queries";

export default async function InstitutosPage() {
  const institutes = await getInstitutes();

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Ranking de Institutos</h1>
        <p className="text-xs font-mono text-muted-foreground">
          {institutes.length} institutos monitorados · score baseado em MAE historico
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <InstituteRanking data={institutes as any[]} />
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader className="px-3 py-2.5 border-b border-border">
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Metodologia de Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 py-3 text-xs text-muted-foreground space-y-2">
          <p>
            O score de cada instituto e calculado automaticamente via{" "}
            <span className="font-mono text-foreground">MAE</span>{" "}
            (Mean Absolute Error) entre pesquisas publicadas e resultado oficial.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
            <div className="px-2 py-1.5 rounded-sm bg-muted/30 border border-border">
              <span className="text-emerald-400 font-bold">A+</span>
              <span className="text-muted-foreground ml-1.5">MAE &lt; 1.6pp</span>
            </div>
            <div className="px-2 py-1.5 rounded-sm bg-muted/30 border border-border">
              <span className="text-yellow-400 font-bold">A</span>
              <span className="text-muted-foreground ml-1.5">MAE 1.6-2.9pp</span>
            </div>
            <div className="px-2 py-1.5 rounded-sm bg-muted/30 border border-border">
              <span className="text-orange-400 font-bold">B</span>
              <span className="text-muted-foreground ml-1.5">MAE 2.9-4.3pp</span>
            </div>
            <div className="px-2 py-1.5 rounded-sm bg-muted/30 border border-border">
              <span className="text-red-400 font-bold">C</span>
              <span className="text-muted-foreground ml-1.5">MAE &gt; 4.3pp</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
