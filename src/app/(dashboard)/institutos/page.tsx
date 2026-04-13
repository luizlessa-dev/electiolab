import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InstituteRanking } from "@/components/charts/institute-ranking";
import { getInstitutes } from "@/lib/queries";

export default async function InstitutosPage() {
  const institutes = await getInstitutes();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ranking de Institutos</h1>
        <p className="text-sm text-muted-foreground">
          Confiabilidade baseada no historico de acerto de cada instituto
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {institutes.length} Institutos Monitorados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InstituteRanking data={institutes as any[]} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como calculamos</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none text-muted-foreground">
          <p>
            O score de confiabilidade de cada instituto e calculado automaticamente
            com base no <strong>erro medio absoluto (MAE)</strong> entre as
            pesquisas publicadas e o resultado oficial das eleicoes.
          </p>
          <ul>
            <li>
              <strong>Excelente (85%+):</strong> Erro medio menor que 1.6pp
            </li>
            <li>
              <strong>Bom (75-84%):</strong> Erro medio entre 1.6 e 2.9pp
            </li>
            <li>
              <strong>Regular (65-74%):</strong> Erro medio entre 2.9 e 4.3pp
            </li>
            <li>
              <strong>Fraco (&lt;65%):</strong> Erro medio maior que 4.3pp
            </li>
          </ul>
          <p>
            Eleicoes mais recentes tem mais peso no calculo. Um instituto que
            acertou em 2022 e mais valorizado que um que so acertou em 2018.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
