import { z } from "zod";

const textoOpcional = (max: number) => z.string().max(max).optional().default("");
const dataOpcional = z.string().max(10).refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value)).optional().default("");
const valor = z.number().finite().min(0).max(999999999);

const itemSchema = z.object({
  nome: z.string().trim().min(1).max(160),
  descricao: textoOpcional(4000),
  quantidade: z.number().finite().min(0).max(1000000),
  valorUnitario: valor,
  desconto: valor
});

export const propostaSchema = z.object({
  clienteId: z.string().uuid().nullable().optional(),
  clienteNome: z.string().trim().min(1, "Informe o nome do cliente.").max(200),
  clienteEmail: z.string().max(254).email().or(z.literal("")).optional().default(""),
  clienteTelefone: textoOpcional(40),
  nomeProjeto: z.string().trim().min(1, "Informe o nome do projeto.").max(200),
  dataEmissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validadeDias: z.number().int().min(1).max(3650),
  itens: z.array(itemSchema).min(1, "Adicione pelo menos um serviço.").max(100),
  taxas: valor.default(0),
  prazoExecucao: textoOpcional(200),
  dataEntregaPrevista: dataOpcional,
  condicoesPagamento: textoOpcional(2000),
  numeroParcelas: z.number().int().min(1).max(120).default(1),
  entradaValor: valor.default(0),
  garantias: textoOpcional(4000),
  observacoes: textoOpcional(10000),
  escopo: textoOpcional(10000),
  itensNaoInclusos: textoOpcional(10000),
  templateId: z.string().uuid().nullable().optional(),
  corTema: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#f52f78"),
  assinaturaNome: textoOpcional(200),
  assinaturaCargo: textoOpcional(200)
});
