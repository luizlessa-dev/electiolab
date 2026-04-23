import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de privacidade do ElectioLab conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).",
  alternates: { canonical: "https://electiolab.com/privacidade" },
  robots: { index: true, follow: true },
};

const LAST_UPDATED = "23 de abril de 2026";
const CONTACT_EMAIL = "privacidade@electiolab.com";

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-sidebar/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="h-[2px] bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm tracking-tight">ElectioLab</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Voltar
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="space-y-3 mb-10">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Última atualização: {LAST_UPDATED}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
          <p className="text-muted-foreground">
            Esta política descreve como o <strong className="text-foreground">ElectioLab</strong> coleta, usa e protege
            seus dados pessoais, em conformidade com a{" "}
            <strong className="text-foreground">Lei Geral de Proteção de Dados — LGPD (Lei nº 13.709/2018)</strong>.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Controlador dos Dados</h2>
            <p>
              O controlador responsável pelo tratamento dos seus dados pessoais é o <strong className="text-foreground">ElectioLab</strong>,
              plataforma de agregação de pesquisas eleitorais disponível em{" "}
              <Link href="https://electiolab.com" className="text-primary hover:underline">electiolab.com</Link>.
            </p>
            <p>
              Para questões relacionadas a esta política ou ao exercício dos seus direitos, entre em contato pelo e-mail:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Dados Coletados</h2>
            <p>Coletamos apenas os dados necessários para a prestação do serviço:</p>
            <div className="space-y-2 ml-4">
              <div className="border-l-2 border-border pl-4 space-y-1">
                <p className="font-medium text-foreground">Dados de conta (usuários cadastrados)</p>
                <p>E-mail e senha (hash bcrypt). Não armazenamos a senha em texto puro.</p>
              </div>
              <div className="border-l-2 border-border pl-4 space-y-1">
                <p className="font-medium text-foreground">Dados de uso</p>
                <p>
                  Logs de acesso anonimizados (IP truncado), páginas visitadas e interações com o
                  dashboard, coletados via Google Analytics 4 com IP anonimizado.
                </p>
              </div>
              <div className="border-l-2 border-border pl-4 space-y-1">
                <p className="font-medium text-foreground">Dados de pagamento</p>
                <p>
                  Processados exclusivamente pelo Stripe. O ElectioLab não armazena dados de cartão
                  de crédito. Consultamos apenas o status da assinatura.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Finalidade e Base Legal</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-4 text-foreground font-semibold">Finalidade</th>
                    <th className="text-left py-2 pr-4 text-foreground font-semibold">Base Legal (LGPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Autenticação e acesso ao dashboard", "Execução de contrato (Art. 7º, V)"],
                    ["Processamento de assinaturas", "Execução de contrato (Art. 7º, V)"],
                    ["Analytics de uso anonimizado", "Legítimo interesse (Art. 7º, IX)"],
                    ["Envio de e-mails transacionais", "Execução de contrato (Art. 7º, V)"],
                    ["Cumprimento de obrigações legais", "Obrigação legal (Art. 7º, II)"],
                  ].map(([fin, base]) => (
                    <tr key={fin}>
                      <td className="py-2 pr-4">{fin}</td>
                      <td className="py-2">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para autenticação de sessão (Supabase Auth) e cookies de
              analytics com IP anonimizado (Google Analytics 4). Não utilizamos cookies de
              publicidade ou rastreamento de terceiros.
            </p>
            <p>
              Você pode desativar cookies não essenciais nas configurações do seu navegador sem
              prejuízo do acesso ao dashboard.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Compartilhamento de Dados</h2>
            <p>Seus dados são compartilhados apenas com:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li><strong className="text-foreground">Supabase</strong> — banco de dados e autenticação (servidores na região sa-east-1, São Paulo)</li>
              <li><strong className="text-foreground">Stripe</strong> — processamento de pagamentos (PCI DSS Level 1)</li>
              <li><strong className="text-foreground">Vercel</strong> — hospedagem da aplicação (CDN global)</li>
              <li><strong className="text-foreground">Google Analytics</strong> — analytics anonimizado</li>
            </ul>
            <p>
              Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins comerciais
              ou publicitários.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Retenção dos Dados</h2>
            <p>
              Dados de conta são mantidos enquanto a conta estiver ativa. Após o cancelamento, os
              dados são excluídos em até <strong className="text-foreground">30 dias</strong>, exceto
              quando a retenção for exigida por lei (ex: registros fiscais por 5 anos).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Seus Direitos (LGPD Art. 18)</h2>
            <p>Como titular, você tem direito a:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>Confirmar a existência de tratamento de seus dados</li>
              <li>Acessar os dados que temos sobre você</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação dos dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Portabilidade dos dados para outro fornecedor</li>
            </ul>
            <p>
              Para exercer qualquer um desses direitos, envie um e-mail para{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>{" "}
              com o assunto <em>&quot;Direitos LGPD&quot;</em>. Responderemos em até 15 dias úteis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Segurança</h2>
            <p>
              Adotamos medidas técnicas e organizacionais adequadas: HTTPS em todas as comunicações,
              senhas armazenadas com hash bcrypt, Row Level Security (RLS) no banco de dados, e
              tokens de sessão com expiração.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">9. Menores de Idade</h2>
            <p>
              O ElectioLab não é direcionado a menores de 18 anos e não coleta intencionalmente dados
              de crianças ou adolescentes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">10. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Quando houver alterações materiais,
              notificaremos por e-mail (usuários cadastrados) e atualizaremos a data no topo desta
              página.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">11. Contato e DPO</h2>
            <p>
              Para dúvidas, solicitações ou reclamações relacionadas ao tratamento de dados pessoais:
            </p>
            <p>
              <strong className="text-foreground">E-mail:</strong>{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>
            </p>
            <p className="text-xs text-muted-foreground/70 pt-4 border-t border-border">
              Caso não esteja satisfeito com nossa resposta, você pode apresentar reclamação à{" "}
              <strong>ANPD</strong> — Autoridade Nacional de Proteção de Dados (gov.br/anpd).
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">
              ElectioLab — Terminal de Inteligência Eleitoral
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <Link href="/" className="hover:text-foreground transition-colors">Início</Link>
            <span>·</span>
            <Link href="/sobre" className="hover:text-foreground transition-colors">Sobre</Link>
            <span>·</span>
            <Link href="/precos" className="hover:text-foreground transition-colors">Preços</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
