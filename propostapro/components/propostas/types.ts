export interface ItemFormulario {
  idTemp: string;
  nome: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  desconto: number;
}

export interface PropostaFormulario {
  // Etapa 1
  clienteId: string | null;
  clienteNome: string;
  clienteEmail: string;
  clienteTelefone: string;
  nomeProjeto: string;
  dataEmissao: string;
  validadeDias: number;

  // Etapa 2
  itens: ItemFormulario[];
  taxas: number;

  // Etapa 3
  prazoExecucao: string;
  dataEntregaPrevista: string;
  condicoesPagamento: string;
  numeroParcelas: number;
  entradaValor: number;
  garantias: string;
  observacoes: string;
  escopo: string;
  itensNaoInclusos: string;

  // Etapa 4
  templateId: string | null;
  corTema: string;
  assinaturaNome: string;
  assinaturaCargo: string;
}

export const FORMULARIO_INICIAL: PropostaFormulario = {
  clienteId: null,
  clienteNome: "",
  clienteEmail: "",
  clienteTelefone: "",
  nomeProjeto: "",
  dataEmissao: new Date().toISOString().slice(0, 10),
  validadeDias: 15,
  itens: [],
  taxas: 0,
  prazoExecucao: "",
  dataEntregaPrevista: "",
  condicoesPagamento: "À vista",
  numeroParcelas: 1,
  entradaValor: 0,
  garantias: "",
  observacoes: "",
  escopo: "",
  itensNaoInclusos: "",
  templateId: null,
  corTema: "#f52f78",
  assinaturaNome: "",
  assinaturaCargo: ""
};
