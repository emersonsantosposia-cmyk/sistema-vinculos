import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  ExternalHyperlink,
  AlignmentType,
} from "docx";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "Roteiro-Testes-Rede-Lince.docx");

/** Dourado do sistema (tema claro) — próximo ao mockup */
const GOLD = "8F6F14";
const GOLD_SOFT = "F7F3E8";
const INK = "2A2A2A";
const MUTED = "6B6B6B";
const FONT = "Calibri";
const PAGE_W = 9360; // usable width with ~0.75" margins on A4-ish

const noBorder = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};
const goldBorder = {
  style: BorderStyle.SINGLE,
  size: 12,
  color: GOLD,
};
const goldRule = {
  style: BorderStyle.SINGLE,
  size: 12,
  color: GOLD,
};

function run(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: 20, color: INK, ...opts });
}

function titleBlock() {
  return [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        run("ROTEIRO DE TESTES", {
          size: 20,
          bold: true,
          color: GOLD,
          allCaps: true,
          characterSpacing: 120,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 40 },
      children: [run("Rede Lince", { size: 44, bold: true, color: INK })],
    }),
    new Paragraph({
      spacing: { after: 280 },
      children: [
        run("Sistema de Registro de Dados e Vínculos", {
          size: 20,
          color: MUTED,
        }),
      ],
    }),
  ];
}

function introBox() {
  const boxBorders = {
    top: goldBorder,
    bottom: goldBorder,
    left: goldBorder,
    right: goldBorder,
  };
  const pad = { top: 120, bottom: 120, left: 160, right: 160 };

  const lines = [
    new Paragraph({
      spacing: { after: 100 },
      children: [run("Leia antes de começar", { bold: true, size: 21 })],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        run("•  Todos os dados são fictícios — criados só para teste.", {
          size: 19,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        run("•  Acesse: ", { size: 19 }),
        new ExternalHyperlink({
          children: [
            run("https://sistema-vinculos.vercel.app/", {
              size: 19,
              color: GOLD,
              underline: {},
            }),
          ],
          link: "https://sistema-vinculos.vercel.app/",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [
        run("•  Login: ", { size: 19 }),
        run("mj", { size: 19, bold: true }),
        run("  |  Senha: pedida ao administrador do sistema", { size: 19 }),
      ],
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [
        run("•  Troque a senha no 1º acesso (menu do usuário → Trocar senha).", {
          size: 19,
        }),
      ],
    }),
  ];

  return new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: [PAGE_W],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: boxBorders,
            width: { size: PAGE_W, type: WidthType.DXA },
            shading: { fill: GOLD_SOFT },
            margins: pad,
            children: lines,
          }),
        ],
      }),
    ],
  });
}

function sectionTitle(text) {
  return [
    new Paragraph({
      spacing: { before: 320, after: 60 },
      children: [run(text, { size: 24, bold: true, color: INK })],
    }),
    new Table({
      width: { size: PAGE_W, type: WidthType.DXA },
      columnWidths: [PAGE_W],
      rows: [
        new TableRow({
          height: { value: 40, rule: "atLeast" },
          children: [
            new TableCell({
              borders: {
                top: noBorder,
                left: noBorder,
                right: noBorder,
                bottom: goldRule,
              },
              width: { size: PAGE_W, type: WidthType.DXA },
              children: [new Paragraph({ children: [] })],
            }),
          ],
        }),
      ],
    }),
  ];
}

/** Checkbox □ in gold */
function check(text) {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [
      run("☐  ", { size: 20, color: GOLD }),
      run(text, { size: 20 }),
    ],
  });
}

function note(text) {
  return new Paragraph({
    spacing: { before: 80, after: 40 },
    children: [run(text, { size: 18, italics: true, color: MUTED })],
  });
}

function spacer(after = 120) {
  return new Paragraph({ spacing: { after }, children: [] });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        styles: [{ id: "Normal", run: { font: FONT, size: 20 } }],
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children: [
        ...titleBlock(),
        introBox(),
        spacer(80),

        ...sectionTitle("1. Acesso"),
        check("Abra o link no Chrome ou Edge"),
        check("Entre com mj e a senha recebida do administrador"),
        check("Menu do usuário (canto superior direito) → Trocar senha (mín. 8 caracteres)"),
        check("Opcional: abra Sobre o sistema e confira versão/build"),
        note("A senha é pessoal — não compartilhe."),

        ...sectionTitle("2. Primeiro contato"),
        check("No Dashboard, clique em Por que Lince?"),
        check("Observe o painel operacional e os gráficos"),
        check("Teste o filtro de período das métricas"),
        check("Alterne o tema claro / escuro"),
        note("Faz sentido o que o painel mostra?"),

        ...sectionTitle("3. Busca global"),
        check("No campo Busca global do topo, digite ao menos 2 caracteres"),
        check("Busque por nome, placa, documento, empresa etc."),
        check("Abra resultados de tipos diferentes e confira se a página é a correta"),
        check("Teste uma busca sem resultado e outra com acento / parcial"),
        note("A busca encontra o que você esperava?"),

        ...sectionTitle("4. Menu e entidades"),
        check("Percorra o menu: Pessoas, Empresas, Veículos, Endereços, Comunicações, Orcrims"),
        check("Abra o detalhe de pelo menos 2 tipos de entidade"),
        check("Confira Dados cadastrais, Observações e foto/galeria (quando houver)"),
        note("As telas estão claras e os dados legíveis?"),

        ...sectionTitle("5. Vínculos"),
        check("Em uma pessoa ou empresa com muitos vínculos, role até a seção Vínculos"),
        check("Observe os tipos de vínculo e as entidades ligadas"),
        check("Clique em vínculos e navegue até as entidades relacionadas"),
        check("Compare o padrão em veículos, endereços e comunicações"),
        note("Os vínculos fazem sentido entre si?"),

        ...sectionTitle("6. Diagrama"),
        check("No detalhe de uma entidade, clique em Ver diagrama de vínculos"),
        check("Configure níveis (1 / 2 / 3) e filtros de tipos de entidade → Abrir diagrama"),
        check("Teste: Reorganizar e Agrupar por comunidades"),
        check("Teste: Selecionar nós para caminho → Destacar caminho → Limpar caminho"),
        check("No nó: Focar neste nó, Expandir a partir daqui (1 / 2 / 3 níveis), Remover foco"),
        check("Mostre/oculte minimapa e legenda; use Configurar / Aplicar e reabrir"),
        check("No mobile: botão Ferramentas — as ações principais estão acessíveis?"),
        note("O diagrama ajudou a entender a rede?"),

        ...sectionTitle("7. Documentos, casos e mapas"),
        check("Visite Documentos e Casos — abra itens e confira vínculos"),
        check("Em uma entidade com endereços, clique em Ver mapa dos endereços"),
        check("No mapa, teste: Navegar, Medir e Raio"),
        check("Em um endereço individual, confira o painel Mapa / coordenadas"),
        note("Mapa e documentos estão úteis para o fluxo de trabalho?"),

        ...sectionTitle("8. Crie algo novo"),
        check("Crie 1 pessoa e 1 outra entidade (ex.: endereço)"),
        check("Crie 1 vínculo entre elas (+ Adicionar vínculo com…)"),
        check("Opcional: 1 documento ou caso ligado a essas entidades"),
        check("Abra o diagrama da nova entidade e confirme se o vínculo aparece"),
        check("Edite (e, se adequado, exclua) o registro de teste — sem apagar dados de demonstração de outros"),
        note("O cadastro e o vínculo foram intuitivos?"),

        ...sectionTitle("9. Relatório"),
        check("Percorra o sistema de ponta a ponta e anote o que encontrou"),
        check("Reporte problemas críticos: login, tela em branco, erro 500, busca, diagrama/mapa, CRUD"),
        check("Envie sugestões de usabilidade, textos, fluxo, performance ou mobile"),
        note("Para cada item: o que fez · o que esperava · o que aconteceu · navegador + desktop/mobile."),
      ],
    },
  ],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync(outPath, buffer);
console.log("Gerado:", outPath);
