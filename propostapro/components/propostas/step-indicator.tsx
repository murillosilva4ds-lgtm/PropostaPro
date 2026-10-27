import { cn } from "@/lib/utils";

const ETAPAS = ["Cliente", "Serviços", "Prazo e condições", "Personalização", "Gerar"];

export function StepIndicator({ etapaAtual }: { etapaAtual: number }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm">
      {ETAPAS.map((nome, i) => {
        const numero = i + 1;
        const ativa = numero === etapaAtual;
        const concluida = numero < etapaAtual;
        return (
          <li key={nome} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                ativa && "bg-brand-600 text-white",
                concluida && "bg-brand-100 text-brand-700",
                !ativa && !concluida && "bg-gray-100 text-gray-500"
              )}
            >
              {numero}
            </span>
            <span className={cn("hidden font-medium sm:inline", ativa ? "text-gray-900" : "text-gray-500")}>{nome}</span>
            {numero < ETAPAS.length && <span className="mx-1 h-px w-5 bg-gray-200" />}
          </li>
        );
      })}
    </ol>
  );
}
