import Link from "next/link";
import { PLAN_LIMITS } from "@/lib/plans";
import { formatarMoeda } from "@/lib/utils";

const FUNCIONALIDADES = [
  { titulo: "Formulário em etapas", descricao: "Preencha cliente, serviços, prazos e personalização em poucos passos guiados." },
  { titulo: "Cálculo automático", descricao: "Subtotais, descontos e valor total calculados em tempo real, sem erros manuais." },
  { titulo: "PDF profissional", descricao: "Exportação em PDF com capa, tipografia cuidada e espaço para assinatura." },
  { titulo: "Link público", descricao: "Compartilhe a proposta por link ou envie direto pelo WhatsApp." },
  { titulo: "Modelos por profissão", descricao: "Estruturas prontas para sites, design, vídeo, fotografia, tráfego e mais." },
  { titulo: "Apoio de IA", descricao: "Peça sugestões de descrição, escopo e cronograma — você revisa antes de enviar." }
];

const MODELOS = [
  "Sites e Landing Pages",
  "Design Gráfico e Identidade Visual",
  "Produção e Edição de Vídeos",
  "Fotografia e Eventos",
  "Gestão de Tráfego Pago",
  "Social Media e Marketing Digital",
  "Desenvolvimento de Sistemas",
  "Consultoria e Serviços Gerais"
];

const FAQ = [
  { pergunta: "Preciso instalar algo?", resposta: "Não. O PropostaPro funciona direto no navegador, em computador, tablet ou celular." },
  { pergunta: "Posso usar meu próprio logotipo e cores?", resposta: "Sim, em todos os planos você pode personalizar logotipo e identidade visual da proposta." },
  { pergunta: "O cliente precisa criar conta para ver a proposta?", resposta: "Não. Cada proposta gera um link público de visualização, sem necessidade de cadastro." },
  { pergunta: "Posso cancelar minha assinatura quando quiser?", resposta: "Sim, o cancelamento pode ser feito a qualquer momento na página de Assinatura." }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="motion-enter sticky top-0 z-20 border-b border-gray-100 bg-gray-50/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-lg font-semibold tracking-tight">PropostaPro</span>
          <nav className="hidden items-center gap-8 text-sm text-gray-600 md:flex">
            <a href="#funcionalidades" className="hover:text-gray-900">Funcionalidades</a>
            <a href="#modelos" className="hover:text-gray-900">Modelos</a>
            <a href="#planos" className="hover:text-gray-900">Planos</a>
            <a href="#faq" className="hover:text-gray-900">Perguntas frequentes</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900">Entrar</Link>
            <Link href="/cadastro" className="btn-primary">Criar conta grátis</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="motion-enter motion-delay-1 mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-gray-900 md:text-5xl">
          Crie propostas comerciais
          <span className="gradient-heading block">profissionais em minutos.</span>
        </h1>
        <p className="motion-enter motion-delay-2 mx-auto mt-5 max-w-2xl text-lg text-gray-600">
          O PropostaPro economiza seu tempo e melhora a forma como você apresenta seus serviços — monte, personalize
          e envie propostas prontas para fechar negócio, sem depender de documentos soltos ou planilhas manuais.
        </p>
        <div className="motion-enter motion-delay-3 mt-8 flex items-center justify-center gap-3">
          <Link href="/cadastro" className="btn-primary px-6 py-3 text-base">Criar minha primeira proposta</Link>
          <a href="#funcionalidades" className="btn-secondary px-6 py-3 text-base">Ver como funciona</a>
        </div>

        <div className="motion-enter motion-delay-4 mx-auto mt-16 max-w-3xl">
          <div className="card mx-auto overflow-hidden text-left">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-400">Proposta comercial</p>
                <p className="font-medium text-gray-900">Identidade visual — Estúdio Nova</p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">Rascunho</span>
            </div>
            <div className="space-y-3 px-6 py-6 text-sm text-gray-600">
              <div className="flex justify-between"><span>Criação de logotipo</span><span>{formatarMoeda(1800)}</span></div>
              <div className="flex justify-between"><span>Manual de marca</span><span>{formatarMoeda(950)}</span></div>
              <div className="flex justify-between"><span>Aplicações em redes sociais</span><span>{formatarMoeda(600)}</span></div>
              <div className="flex justify-between border-t border-gray-100 pt-3 font-semibold text-gray-900">
                <span>Valor total</span><span>{formatarMoeda(3350)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-semibold text-gray-900 md:text-3xl">Tudo o que você precisa para propor e fechar</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {FUNCIONALIDADES.map((f) => (
              <div key={f.titulo} className="card p-6">
                <h3 className="font-medium text-gray-900">{f.titulo}</h3>
                <p className="mt-2 text-sm text-gray-600">{f.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="modelos" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-2xl font-semibold text-gray-900 md:text-3xl">Modelos prontos para a sua área</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-600">
            Escolha um modelo de partida e personalize campos, descrições e exemplos para o seu tipo de serviço.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {MODELOS.map((m) => (
              <div key={m} className="card p-5 text-sm font-medium text-gray-800">{m}</div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="border-t border-gray-100 bg-gray-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="pricing-eyebrow text-center">Planos PropostaPro</p>
          <h2 className="mt-2 text-center text-2xl font-semibold text-gray-900 md:text-3xl">Escolha seu ritmo para crescer</h2>
          <div className="mx-auto mt-4 max-w-xl text-center text-sm text-gray-500">Comece grátis, evolua quando precisar e mantenha suas propostas no mesmo lugar.</div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {(Object.entries(PLAN_LIMITS) as [string, typeof PLAN_LIMITS.gratuito][]).map(([key, plano]) => (
              <div key={key} className={`pricing-card card p-7 ${key === "premium" ? "pricing-card-featured md:-translate-y-2" : ""}`}>
                {key === "premium" && <p className="pricing-eyebrow mb-3">Mais completo</p>}
                <h3 className="text-lg font-semibold text-gray-900">{plano.nome}</h3>
                <p className="mt-4 text-3xl font-semibold text-gray-900">
                  {plano.precoMensal === 0 ? "Grátis" : formatarMoeda(plano.precoMensal)}
                  {plano.precoMensal > 0 && <span className="text-sm font-normal text-gray-500">/mês</span>}
                </p>
                <ul className="mt-6 space-y-2 text-sm text-gray-600">
                  <li>
                    {plano.propostasPorMes === "ilimitado" ? "Propostas ilimitadas (uso razoável)" : `Até ${plano.propostasPorMes} propostas/mês`}
                  </li>
                  <li>{plano.iaUsosPorMes > 0 ? `${plano.iaUsosPorMes} usos de IA por mês` : "Sem recursos de IA"}</li>
                  <li>{plano.modelosExclusivos ? "Todos os modelos, incluindo exclusivos" : "Modelos básicos"}</li>
                  <li>{plano.personalizacaoAvancada ? "Personalização avançada" : "Personalização padrão"}</li>
                </ul>
                <Link href="/cadastro" className="btn-primary mt-7 w-full">Começar agora</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-semibold text-gray-900 md:text-3xl">Perguntas frequentes</h2>
          <div className="mt-10 space-y-4">
            {FAQ.map((f) => (
              <div key={f.pergunta} className="card p-5">
                <p className="font-medium text-gray-900">{f.pergunta}</p>
                <p className="mt-2 text-sm text-gray-600">{f.resposta}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-brand-600 py-16 text-center">
        <h2 className="text-2xl font-semibold text-white md:text-3xl">Pronto para enviar sua próxima proposta?</h2>
        <Link href="/cadastro" className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-medium text-brand-700 hover:bg-brand-50">
          Criar minha primeira proposta
        </Link>
      </section>

      <footer className="border-t border-gray-100 py-10 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} PropostaPro. Todos os direitos reservados.
      </footer>
    </div>
  );
}
