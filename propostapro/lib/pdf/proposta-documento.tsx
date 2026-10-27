import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { Proposal, ProposalItem } from "@/types/database";

function formatarMoedaPdf(valor: number) {
  return "R$ " + Number(valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatarDataPdf(data: string | null | undefined) {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

interface Props {
  proposta: Proposal & { items: ProposalItem[] };
  marca: { nome_empresa?: string | null; logo_url?: string | null; site?: string | null } | null;
}

export function PropostaDocumento({ proposta, marca }: Props) {
  const cor = proposta.cor_tema || "#f52f78";
  const styles = criarEstilos(cor);

  return (
    <Document title={`Proposta — ${proposta.nome_projeto}`}>
      {/* Capa */}
      <Page size="A4" style={styles.capa}>
        <View style={styles.capaConteudo}>
          {marca?.logo_url && <Image src={marca.logo_url} style={styles.logo} />}
          <Text style={styles.capaEmpresa}>{marca?.nome_empresa || "Proposta Comercial"}</Text>
          <Text style={styles.capaTitulo}>{proposta.nome_projeto}</Text>
          <Text style={styles.capaCliente}>Preparado para {proposta.cliente_nome}</Text>
          <Text style={styles.capaData}>Emitido em {formatarDataPdf(proposta.data_emissao)}</Text>
        </View>
      </Page>

      {/* Conteúdo */}
      <Page size="A4" style={styles.pagina}>
        <Text style={styles.secaoTitulo}>Resumo da proposta</Text>
        <View style={styles.linhaInfo}>
          <InfoBloco label="Cliente" valor={proposta.cliente_nome} styles={styles} />
          <InfoBloco label="Emitida em" valor={formatarDataPdf(proposta.data_emissao)} styles={styles} />
          <InfoBloco label="Válida até" valor={`${proposta.validade_dias} dias`} styles={styles} />
        </View>

        <Text style={styles.secaoTitulo}>Serviços</Text>
        <View style={styles.tabela}>
          <View style={[styles.tabelaLinha, styles.tabelaCabecalho]}>
            <Text style={[styles.celula, { flex: 3 }]}>Serviço</Text>
            <Text style={[styles.celula, { flex: 1, textAlign: "center" }]}>Qtd.</Text>
            <Text style={[styles.celula, { flex: 1.5, textAlign: "right" }]}>Valor unit.</Text>
            <Text style={[styles.celula, { flex: 1.5, textAlign: "right" }]}>Subtotal</Text>
          </View>
          {proposta.items.map((item) => (
            <View key={item.id} style={styles.tabelaLinha} wrap={false}>
              <View style={{ flex: 3 }}>
                <Text style={styles.celula}>{item.nome}</Text>
                {item.descricao && <Text style={styles.celulaDescricao}>{item.descricao}</Text>}
              </View>
              <Text style={[styles.celula, { flex: 1, textAlign: "center" }]}>{item.quantidade}</Text>
              <Text style={[styles.celula, { flex: 1.5, textAlign: "right" }]}>{formatarMoedaPdf(item.valor_unitario)}</Text>
              <Text style={[styles.celula, { flex: 1.5, textAlign: "right" }]}>
                {formatarMoedaPdf(item.quantidade * item.valor_unitario - item.desconto)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totais}>
          <TotalLinha label="Subtotal" valor={formatarMoedaPdf(proposta.subtotal)} styles={styles} />
          <TotalLinha label="Descontos" valor={`- ${formatarMoedaPdf(proposta.desconto_total)}`} styles={styles} />
          <TotalLinha label="Taxas" valor={formatarMoedaPdf(proposta.taxas)} styles={styles} />
          <TotalLinha label="Valor total" valor={formatarMoedaPdf(proposta.valor_total)} styles={styles} destaque />
        </View>

        {proposta.escopo && <Secao titulo="Escopo do projeto" texto={proposta.escopo} styles={styles} />}
        {proposta.itens_nao_inclusos && <Secao titulo="Itens não inclusos" texto={proposta.itens_nao_inclusos} styles={styles} />}

        <Text style={styles.secaoTitulo}>Prazo e condições comerciais</Text>
        <View style={styles.linhaInfo}>
          <InfoBloco label="Prazo de execução" valor={proposta.prazo_execucao || "—"} styles={styles} />
          <InfoBloco label="Entrega prevista" valor={formatarDataPdf(proposta.data_entrega_prevista)} styles={styles} />
          <InfoBloco label="Parcelas" valor={String(proposta.numero_parcelas)} styles={styles} />
        </View>
        {proposta.condicoes_pagamento && <Secao titulo="Condições de pagamento" texto={proposta.condicoes_pagamento} styles={styles} />}
        {proposta.garantias && <Secao titulo="Garantias e observações" texto={proposta.garantias} styles={styles} />}

        <View style={styles.assinaturaArea} wrap={false}>
          <View style={styles.assinaturaLinha} />
          <Text style={styles.assinaturaNome}>{proposta.assinatura_nome || proposta.cliente_nome}</Text>
          <Text style={styles.assinaturaCargo}>{proposta.assinatura_cargo || "Responsável"}</Text>
          <Text style={styles.assinaturaAceite}>Aceite do cliente</Text>
        </View>

        <Text style={styles.rodape} fixed>
          {marca?.nome_empresa || ""} {marca?.site ? `· ${marca.site}` : ""}
        </Text>
      </Page>
    </Document>
  );
}

function InfoBloco({ label, valor, styles }: { label: string; valor: string; styles: any }) {
  return (
    <View style={styles.infoBloco}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValor}>{valor}</Text>
    </View>
  );
}

function TotalLinha({ label, valor, styles, destaque }: { label: string; valor: string; styles: any; destaque?: boolean }) {
  return (
    <View style={styles.totalLinha}>
      <Text style={destaque ? styles.totalLabelDestaque : styles.totalLabel}>{label}</Text>
      <Text style={destaque ? styles.totalValorDestaque : styles.totalValor}>{valor}</Text>
    </View>
  );
}

function Secao({ titulo, texto, styles }: { titulo: string; texto: string; styles: any }) {
  return (
    <View style={styles.secaoTexto}>
      <Text style={styles.secaoSubtitulo}>{titulo}</Text>
      <Text style={styles.paragrafo}>{texto}</Text>
    </View>
  );
}

function criarEstilos(cor: string) {
  return StyleSheet.create({
    capa: { backgroundColor: cor, padding: 0 },
    capaConteudo: { position: "absolute", bottom: 90, left: 56, right: 56 },
    logo: { width: 90, height: 40, objectFit: "contain", marginBottom: 24 },
    capaEmpresa: { color: "#ffffff", fontSize: 12, opacity: 0.8, marginBottom: 10, letterSpacing: 1 },
    capaTitulo: { color: "#ffffff", fontSize: 28, fontWeight: 700, marginBottom: 10 },
    capaCliente: { color: "#ffffff", fontSize: 13, opacity: 0.9 },
    capaData: { color: "#ffffff", fontSize: 10, opacity: 0.7, marginTop: 6 },

    pagina: { padding: 48, fontSize: 10, color: "#1f2937", fontFamily: "Helvetica" },
    secaoTitulo: { fontSize: 13, fontWeight: 700, color: "#111827", marginTop: 18, marginBottom: 10 },
    secaoSubtitulo: { fontSize: 11, fontWeight: 700, color: "#111827", marginBottom: 4 },
    secaoTexto: { marginTop: 14 },
    paragrafo: { fontSize: 10, lineHeight: 1.5, color: "#374151" },

    linhaInfo: { flexDirection: "row", gap: 24, marginBottom: 4 },
    infoBloco: { flex: 1 },
    infoLabel: { fontSize: 8, color: "#6b7280", marginBottom: 2, textTransform: "uppercase" },
    infoValor: { fontSize: 10, color: "#111827", fontWeight: 700 },

    tabela: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4 },
    tabelaLinha: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 8, paddingHorizontal: 8 },
    tabelaCabecalho: { backgroundColor: "#f9fafb" },
    celula: { fontSize: 9.5, color: "#111827" },
    celulaDescricao: { fontSize: 8.5, color: "#6b7280", marginTop: 2 },

    totais: { alignSelf: "flex-end", width: 220, marginTop: 10 },
    totalLinha: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
    totalLabel: { fontSize: 9.5, color: "#6b7280" },
    totalValor: { fontSize: 9.5, color: "#111827" },
    totalLabelDestaque: { fontSize: 11, fontWeight: 700, color: "#111827", marginTop: 4 },
    totalValorDestaque: { fontSize: 11, fontWeight: 700, color: cor, marginTop: 4 },

    assinaturaArea: { marginTop: 50, width: 220 },
    assinaturaLinha: { borderBottomWidth: 1, borderBottomColor: "#111827", marginBottom: 6 },
    assinaturaNome: { fontSize: 10, fontWeight: 700, color: "#111827" },
    assinaturaCargo: { fontSize: 9, color: "#6b7280" },
    assinaturaAceite: { fontSize: 8, color: "#9ca3af", marginTop: 4 },

    rodape: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 8, color: "#9ca3af", textAlign: "center" }
  });
}
