/**
 * Generador oficial Hold the Box — mismo patrón que Min Minas:
 * plantilla MD (fuente) → este script → .docx + .pdf en out/
 *
 * Uso: npm install && npm run build
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType,
  Header, Footer, LevelFormat, ImageRun, PageBreak,
} = require("docx");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "out");
const COVER = path.join(__dirname, "cover.png");
const DOCX_OUT = path.join(OUT_DIR, "Hold_the_Box_El_Proyecto.docx");
const PDF_OUT = path.join(OUT_DIR, "Hold_the_Box_El_Proyecto.pdf");

// ── Brand HTB (caribe / muelle — no purple, no oro institucional) ─────────────
const NAVY = "0B3D4A";
const TEAL = "1A7A8C";
const SKY = "8FD3F4";
const SKY_LIGHT = "E8F6FC";
const WOOD = "C4783A";
const SAND = "F0C9A0";
const SAND_LIGHT = "FBF3E8";
const DARK = "1A1A1A";
const WHITE = "FFFFFF";
const GRAY = "666666";
const GRAY_LINE = "D0D0D0";
const GREEN = "1A5C1A";
const GREEN_BG = "E8F5E8";

const CW = 9026;
const bGray = { style: BorderStyle.SINGLE, size: 6, color: GRAY_LINE };
const bTeal = { style: BorderStyle.SINGLE, size: 8, color: TEAL };
const borders = { top: bGray, bottom: bGray, left: bGray, right: bGray };
const pad = { top: 70, bottom: 70, left: 100, right: 100 };

function p(children, opts = {}) {
  return new Paragraph({ children, ...opts });
}
function t(text, opts = {}) {
  return new TextRun({ text: text || "", font: "Nunito Sans", ...opts });
}
function empty(after = 100) {
  return p([t("")], { spacing: { after } });
}
function divider() {
  return p([t("")], {
    spacing: { before: 120, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: TEAL, space: 1 } },
  });
}
function sectionTitle(text) {
  return p([t(text, { bold: true, color: TEAL, size: 36, smallCaps: true })], {
    spacing: { before: 280, after: 140 },
  });
}
function subTitle(text) {
  return p([t(text, { bold: true, color: NAVY, size: 26 })], {
    spacing: { before: 160, after: 80 },
  });
}
function body(text, italic = false) {
  return p([t(text, { size: 20, italics: italic, color: DARK })], {
    spacing: { after: 90 },
  });
}
function quote(text) {
  return p([t(text, { size: 22, italics: true, color: WOOD })], {
    spacing: { before: 80, after: 120 },
    indent: { left: 360 },
  });
}
function note(text) {
  return p([t(text, { size: 17, italics: true, color: GRAY })], {
    spacing: { before: 40, after: 60 },
  });
}
function monoLine(text) {
  return p([new TextRun({ text, font: "Courier New", size: 16, color: NAVY })], {
    spacing: { after: 40 },
  });
}
function hCell(text, w) {
  return new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: TEAL, type: ShadingType.CLEAR },
    margins: pad,
    children: [p([t(text, { bold: true, color: WHITE, size: 17 })])],
  });
}
function dCell(text, w, bg = WHITE, fg = DARK, bold = false) {
  return new TableCell({
    borders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: pad,
    children: [p([t(text || "", { size: 17, color: fg, bold })])],
  });
}
function simpleTable(headers, rows, widths) {
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => hCell(h, widths[i])),
      }),
      ...rows.map((cols, i) => {
        const bg = i % 2 === 0 ? WHITE : SKY_LIGHT;
        return new TableRow({
          children: cols.map((c, j) => dCell(String(c), widths[j], bg)),
        });
      }),
    ],
  });
}
function codeBox(lines) {
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [CW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: { top: bTeal, bottom: bTeal, left: bTeal, right: bTeal },
            width: { size: CW, type: WidthType.DXA },
            shading: { fill: "0D1117", type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: lines.map((line) =>
              p(
                [new TextRun({ text: line, font: "Courier New", size: 15, color: "79C0FF" })],
                { spacing: { after: 0 } }
              )
            ),
          }),
        ],
      }),
    ],
  });
}

// ══════════════════════════════════════════════════════════════════════════════
async function buildDocx() {
  const hasCover = fs.existsSync(COVER);
  const coverBytes = hasCover ? fs.readFileSync(COVER) : null;

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
                run: { font: "Nunito Sans", size: 20 },
              },
            },
          ],
        },
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: { indent: { left: 720, hanging: 360 } },
                run: { font: "Nunito Sans", size: 20 },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: { document: { run: { font: "Nunito Sans", size: 20, color: DARK } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
          },
        },
        headers: {
          default: new Header({
            children: [
              p(
                [
                  t("HOLD THE BOX", { bold: true, size: 16, color: TEAL }),
                  t("  ·  Documento oficial de contexto y roles", { size: 15, color: GRAY }),
                ],
                {
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 4 },
                  },
                  spacing: { after: 80 },
                }
              ),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              p(
                [
                  t(
                    "Hold the Box  ·  GameJamPlus 2026  ·  Better Together (se juega, no se recita)",
                    { size: 14, color: GRAY }
                  ),
                ],
                {
                  border: {
                    top: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 4 },
                  },
                  spacing: { before: 60 },
                }
              ),
            ],
          }),
        },
        children: [
          // ── PORTADA ────────────────────────────────────────────────────────
          empty(200),
          ...(coverBytes
            ? [
                p(
                  [
                    new ImageRun({
                      data: coverBytes,
                      transformation: { width: 420, height: 236 },
                      type: "png",
                    }),
                  ],
                  { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
                ),
              ]
            : []),
          p([t("HOLD THE BOX", { bold: true, size: 56, color: TEAL, smallCaps: true })], {
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
          }),
          p([t("Cómo se hizo el proyecto", { size: 28, color: NAVY })], {
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
          }),
          p([t("Contexto · tecnología · arquitectura · roles", { size: 20, color: GRAY })], {
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          quote("Ya no jugamos lo mismo. Por eso hicimos un juego donde tienen que ir juntos."),
          empty(80),
          p([t("Autor: ", { bold: true, size: 20 }), t("José Maza", { size: 20 })], {
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
          }),
          p([t("Fecha: ", { bold: true, size: 20 }), t("Noviembre 2026", { size: 20 })], {
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
          }),
          p(
            [
              t("Versión: ", { bold: true, size: 20 }),
              t("1.0 — Documento oficial de onboarding", { size: 20 }),
            ],
            { alignment: AlignmentType.CENTER, spacing: { after: 40 } }
          ),
          p(
            [
              t("Expo universidad · 26 nov · multi PC↔PC + local 2P", {
                size: 18,
                color: WOOD,
              }),
            ],
            { alignment: AlignmentType.CENTER, spacing: { after: 200 } }
          ),

          // ── 1 QUÉ ES ───────────────────────────────────────────────────────
          p([new PageBreak()]),
          divider(),
          sectionTitle("1. Qué es"),
          body(
            "Dos jugadores cargan una caja viva. Si uno tira y el otro no, se tuerce. Se inclina, gotea por el huequito, se moja. Coordinarse = estabilidad."
          ),
          quote("El enemigo no es el mapa: es no botar, no mojar, no soltar."),
          body("Nació en jam (Better Together). Controles: P1 WASD + Espacio · P2 Flechas + Enter."),
          empty(60),
          simpleTable(
            ["Mecánica", "Qué hace"],
            [
              ["Inclinación", "Desync → tilt → critical → sueltan la caja"],
              ["Huequito", "Inclinada = pierde contenido"],
              ["Mojado", "Agua / lluvia / chorros → más pesada e inestable"],
              ["Sincronía", "Inputs alineados → más velocidad y se endereza"],
            ],
            [2400, CW - 2400]
          ),
          empty(100),
          body("Tres cajas (misma regla, distinto énfasis): VIP · gato · bomba."),
          body(
            "Cuatro mapas de campaña: El Muelle · La Bahía · La Aldea · El Campamento."
          ),

          // ── 2 EQUIPO ───────────────────────────────────────────────────────
          divider(),
          sectionTitle("2. El equipo"),
          body(
            "Hay un núcleo de construcción (ya en marcha) y se abren tres sillas creativas para quienes llegan."
          ),
          empty(60),
          codeBox([
            "              JOSE (Lead + construcción)",
            "                       │",
            "        ┌──────────────┼──────────────┐",
            "        ▼              ▼              ▼",
            "     DANEL           LUIS         CREATIVOS ×3",
            "  Dev estrella   Relaciones +     slots A / B / C",
            "   apps/ sync    apoyo en dev     docs/ux · story",
          ]),
          empty(120),
          subTitle("Núcleo listo"),
          simpleTable(
            ["Persona", "Rol", "En una frase"],
            [
              [
                "Jose",
                "Lead + construcción",
                "Decide alcance, arma backend (Supabase), mergea, despliega, recibe gente nueva.",
              ],
              [
                "Luis",
                "Relaciones + apoyo dev",
                "Puente con quienes tienen info de proyectos. UI auth, lobby, Coming soon móvil, mute.",
              ],
              [
                "Danel",
                "Dev estrella",
                "Owner de apps/: sim, sync online, menú Local/Multi, Records, voz.",
              ],
            ],
            [1400, 2200, CW - 3600]
          ),
          empty(120),
          subTitle("Creativos — slots abiertos"),
          body(
            "Salen del roster activo Matias, Zharick y Juanes (carpetas históricas). Los creativos no programan el motor: documentan, playtesteán y proponen con la voz del juego."
          ),
          simpleTable(
            ["Slot", "Foco", "Entregables"],
            [
              [
                "A — Claridad",
                "Pantallas, lectura, campaña",
                "Playtest claridad · Campamento + biomas · mapa mundo",
              ],
              [
                "B — Caja",
                "Cómo se siente cargar",
                "Playtest caja · brief Aldea · transiciones",
              ],
              [
                "C — Nivel",
                "Camino, carteles, ritmo",
                "Playtest nivel · Muelle + Bahía · boceto mapa mundo",
              ],
            ],
            [1800, 2400, CW - 4200]
          ),
          empty(100),
          subTitle("Flujo día a día"),
          codeBox([
            "Creativos ──playtests / briefs──► Luis (contexto) ──► Jose (alcance)",
            "     │",
            "     └──── no tocan apps/ ──► Danel integra lo que Jose aprueba",
          ]),
          empty(80),
          ...[
            "Jose cierra el sí / no / después.",
            "Luis traduce entre creativos, jam, info externa y el track técnico.",
            "Danel construye y estabiliza en código.",
            "Creativos escriben en docs/ux/ y docs/story/ con tono Hold the Box.",
          ].map((txt) =>
            p([t(txt, { size: 20 })], {
              numbering: { reference: "bullets", level: 0 },
              spacing: { after: 50 },
            })
          ),

          // ── 3 TECNOLOGÍA ───────────────────────────────────────────────────
          p([new PageBreak()]),
          divider(),
          sectionTitle("3. Tecnología"),
          simpleTable(
            ["Capa", "Qué usamos"],
            [
              ["Motor", "PlayCanvas 2.x en código (Vite)"],
              ["Simulación", "JS puro en apps/src/sim/ — Vitest sin navegador"],
              ["Vista", "apps/src/view/ (meshes, agua, clima, audio)"],
              ["UI", "HTML/CSS sobre el canvas (apps/src/ui/)"],
              ["Backend", "Supabase (auth + salas + ranking por usuario en la expo)"],
              ["Deploy", "GitHub Pages desde main · itch.io"],
              ["Repo", "apps/ · supabase/ · docs/ · deliveries/ · team/"],
            ],
            [2200, CW - 2200]
          ),
          empty(100),
          subTitle("Arranque local"),
          codeBox([
            "git checkout dev && git pull",
            "cd apps && npm install && npm run dev",
            "→ http://localhost:5173",
          ]),
          empty(60),
          note("?debug / F2 = knobs · ?level=muelle|bahia|aldea|campamento = salta menú"),

          // ── 4 ARQUITECTURA ─────────────────────────────────────────────────
          divider(),
          sectionTitle("4. Arquitectura"),
          body(
            "El juego se separó a propósito en capas. Así se puede tunear la caja o el menú sin romper todo."
          ),
          codeBox([
            "teclado (input.js)",
            "        ↓",
            "   sim/  — reglas (testeable, sin PlayCanvas)",
            "        ↓ estado + eventos",
            "   view/ — PlayCanvas dibuja",
            "        ↓",
            "   ui/   — menú / HUD / win-fail",
          ]),
          empty(80),
          quote("Regla de oro: lógica en sim/ · vista representa · UI reacciona a game.state y game.events."),
          subTitle("Historia de construcción"),
          ...[
            "Bootstrap Vite+PlayCanvas",
            "P1/P2 + caja compartida ← primer Better Together",
            "Huequito + mojado + nivel 1 ← vertical slice",
            "Clima, rieles, NPCs, 4 mapas",
            "Menú, personajes, audio, ranking, Pages",
            "Ahora → Local vs Multi · auth · salas · sync · micro",
          ].map((txt) =>
            p([t(txt, { size: 20 })], {
              numbering: { reference: "numbers", level: 0 },
              spacing: { after: 50 },
            })
          ),
          empty(80),
          subTitle("Piso que no se reescribe sin OK de Jose"),
          body(
            "Coop local · caja (tilt / huequito / mojado) · 4 mapas · clima · NPCs · recovery · menú · vidas · tests · CI. La fase expo suma producto online; no tira el local."
          ),
          subTitle("Producto expo"),
          simpleTable(
            ["Modo", "Qué es"],
            [
              ["Local", "Mismo PC, SIN login obligatorio"],
              ["Multijugador", "2 PCs: magic link + username + salas + sync + micro"],
              ["Móvil", "Coming soon"],
              ["Ranking", "local | multiplayer separados (play_mode)"],
            ],
            [2200, CW - 2200]
          ),
          empty(60),
          note("Issues técnicos: #63–#68 · Docs/UX: #69–#71"),

          // ── 5 REPO ─────────────────────────────────────────────────────────
          p([new PageBreak()]),
          divider(),
          sectionTitle("5. Mapa del repo"),
          simpleTable(
            ["Carpeta", "Qué es", "Quién"],
            [
              ["apps/", "El juego", "Danel (+ Luis UI producto)"],
              ["supabase/", "Auth, ranking, functions", "Jose"],
              ["docs/contexto/", "Este relato + plantillas", "Lectura de todos"],
              ["docs/ux/ · story/", "Playtests, briefs, campaña", "Creativos A/B/C"],
              ["deliveries/", "Arte / audio", "Según asignación"],
              ["team/<nombre>/", "Tareas personales", "Cada activo / nuevo"],
            ],
            [2400, 2800, CW - 5200]
          ),
          empty(80),
          body(
            "Flujo Git: rama issue/<n>-slug desde dev → PR a dev → Jose promueve a main cuando toca desplegar."
          ),

          // ── 6 LLEGADA ──────────────────────────────────────────────────────
          divider(),
          sectionTitle("6. Si acabas de llegar"),
          ...[
            "Lee este documento completo.",
            "Si eres creativo: voz-y-estilo + tu slot (§2) + skeletons en docs/ux o docs/story.",
            "Si entras a código: ONBOARDING.md + apps/README.md.",
            "Dudas de alcance → Jose. Contexto entre proyectos → Luis. ¿Dónde se implementa? → Danel.",
          ].map((txt) =>
            p([t(txt, { size: 20 })], {
              numbering: { reference: "numbers", level: 0 },
              spacing: { after: 60 },
            })
          ),

          // ── APÉNDICES ──────────────────────────────────────────────────────
          divider(),
          sectionTitle("Apéndices"),
          simpleTable(
            ["Doc", "Para qué"],
            [
              ["roles.md", "Issues por persona / slot"],
              ["aportes.md", "Checklist huecos expo"],
              ["templates.json", "Catálogos + skeletons máquina"],
              ["voz-y-estilo.md", "Cómo debe sonar un texto HTB"],
              ["COLLABORATORS.md", "GitHubs e invitaciones"],
            ],
            [2800, CW - 2800]
          ),
          empty(160),
          note(
            "Fuente: docs/contexto/EL-PROYECTO.md · Generado con docs/contexto/plantilla/ (patrón Min Minas)."
          ),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(DOCX_OUT, buf);
  console.log("OK docx →", DOCX_OUT);
}

// ══════════════════════════════════════════════════════════════════════════════
function buildPdf() {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      bufferPages: true,
      margins: { top: 56, bottom: 56, left: 52, right: 52 },
      info: {
        Title: "Hold the Box — El Proyecto",
        Author: "José Maza",
        Subject: "Contexto, tecnología y roles",
      },
    });
    const stream = fs.createWriteStream(PDF_OUT);
    doc.pipe(stream);

    const navy = "#0B3D4A";
    const teal = "#1A7A8C";
    const wood = "#C4783A";
    const dark = "#1A1A1A";
    const gray = "#666666";

    function hr() {
      doc
        .moveTo(52, doc.y)
        .lineTo(543, doc.y)
        .strokeColor(teal)
        .lineWidth(1.5)
        .stroke();
      doc.moveDown(0.6);
    }
    function h1(text) {
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(14).fillColor(teal).text(text.toUpperCase());
      doc.moveDown(0.3);
    }
    function h2(text) {
      doc.font("Helvetica-Bold").fontSize(11).fillColor(navy).text(text);
      doc.moveDown(0.2);
    }
    function para(text) {
      doc.font("Helvetica").fontSize(10).fillColor(dark).text(text, { align: "left" });
      doc.moveDown(0.35);
    }
    function q(text) {
      doc
        .font("Helvetica-Oblique")
        .fontSize(10.5)
        .fillColor(wood)
        .text(text, { indent: 16 });
      doc.moveDown(0.4);
    }
    function bullet(text) {
      doc.font("Helvetica").fontSize(10).fillColor(dark).text(`•  ${text}`, { indent: 8 });
      doc.moveDown(0.15);
    }
    function numbered(n, text) {
      doc.font("Helvetica").fontSize(10).fillColor(dark).text(`${n}.  ${text}`, { indent: 8 });
      doc.moveDown(0.15);
    }
    function table(headers, rows, colWidths) {
      const startX = 52;
      const rowH = 18;
      const totalW = colWidths.reduce((a, b) => a + b, 0);
      let y = doc.y;
      // header
      doc.rect(startX, y, totalW, rowH).fill(teal);
      let x = startX;
      headers.forEach((h, i) => {
        doc
          .fillColor("#FFFFFF")
          .font("Helvetica-Bold")
          .fontSize(8)
          .text(h, x + 4, y + 5, { width: colWidths[i] - 8, ellipsis: true });
        x += colWidths[i];
      });
      y += rowH;
      rows.forEach((row, ri) => {
        if (y > 760) {
          doc.addPage();
          y = 56;
        }
        const bg = ri % 2 === 0 ? "#FFFFFF" : "#E8F6FC";
        doc.rect(startX, y, totalW, rowH).fill(bg).strokeColor("#D0D0D0").lineWidth(0.4).stroke();
        x = startX;
        row.forEach((cell, i) => {
          doc
            .fillColor(dark)
            .font("Helvetica")
            .fontSize(7.5)
            .text(String(cell), x + 4, y + 5, { width: colWidths[i] - 8, ellipsis: true });
          x += colWidths[i];
        });
        y += rowH;
      });
      doc.y = y + 8;
      doc.fillColor(dark);
    }
    function footer() {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc
          .font("Helvetica")
          .fontSize(7)
          .fillColor(gray)
          .text(
            "Hold the Box  ·  GameJamPlus 2026  ·  Better Together (se juega, no se recita)",
            52,
            810,
            { align: "left", width: 400 }
          );
        doc.text(`${i + 1}`, 500, 810, { align: "right", width: 40 });
      }
    }

    // Portada
    if (fs.existsSync(COVER)) {
      try {
        doc.image(COVER, 95, 80, { width: 400 });
        doc.y = 320;
      } catch {
        doc.y = 100;
      }
    } else {
      doc.y = 100;
    }
    doc.font("Helvetica-Bold").fontSize(28).fillColor(teal).text("HOLD THE BOX", {
      align: "center",
    });
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fontSize(14)
      .fillColor(navy)
      .text("Cómo se hizo el proyecto", { align: "center" });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(gray)
      .text("Contexto · tecnología · arquitectura · roles", { align: "center" });
    doc.moveDown(1);
    q("Ya no jugamos lo mismo. Por eso hicimos un juego donde tienen que ir juntos.");
    doc.moveDown(0.5);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(dark)
      .text("Autor: José Maza", { align: "center" });
    doc.text("Fecha: Noviembre 2026", { align: "center" });
    doc.text("Versión: 1.0 — Documento oficial de onboarding", { align: "center" });
    doc.moveDown(0.3);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(wood)
      .text("Expo universidad · 26 nov · multi PC↔PC + local 2P", { align: "center" });

    // 1
    doc.addPage();
    hr();
    h1("1. Qué es");
    para(
      "Dos jugadores cargan una caja viva. Si uno tira y el otro no, se tuerce. Se inclina, gotea por el huequito, se moja. Coordinarse = estabilidad."
    );
    q("El enemigo no es el mapa: es no botar, no mojar, no soltar.");
    para("Nació en jam (Better Together). Controles: P1 WASD + Espacio · P2 Flechas + Enter.");
    table(
      ["Mecánica", "Qué hace"],
      [
        ["Inclinación", "Desync → tilt → critical → sueltan la caja"],
        ["Huequito", "Inclinada = pierde contenido"],
        ["Mojado", "Agua / lluvia / chorros → más pesada e inestable"],
        ["Sincronía", "Inputs alineados → más velocidad y se endereza"],
      ],
      [120, 370]
    );
    para("Cajas: VIP · gato · bomba.  Mapas: El Muelle · La Bahía · La Aldea · El Campamento.");

    hr();
    h1("2. El equipo");
    para(
      "Núcleo de construcción en marcha + tres sillas creativas abiertas para quienes llegan."
    );
    h2("Núcleo listo");
    table(
      ["Persona", "Rol", "En una frase"],
      [
        ["Jose", "Lead + construcción", "Alcance, Supabase, merge, deploy, onboarding"],
        ["Luis", "Relaciones + apoyo", "Puente de info + UI auth/lobby/mute"],
        ["Danel", "Dev estrella", "Owner apps/: sim, sync, menú, Records, voz"],
      ],
      [70, 130, 290]
    );
    h2("Creativos — slots abiertos");
    para(
      "Alumni: Matias, Zharick, Juanes. Los creativos no tocan apps/; escriben con la voz del juego."
    );
    table(
      ["Slot", "Foco", "Entregables"],
      [
        ["A Claridad", "Pantallas / lectura", "Playtest · Campamento · mapa mundo"],
        ["B Caja", "Sensación de cargar", "Playtest · Aldea · transiciones"],
        ["C Nivel", "Camino / carteles", "Playtest · Muelle+Bahía · boceto"],
      ],
      [90, 140, 260]
    );
    h2("Flujo día a día");
    bullet("Creativos → playtests/briefs → Luis (contexto) → Jose (alcance)");
    bullet("Creativos no tocan apps/ · Danel integra lo que Jose aprueba");
    bullet("Jose cierra sí/no/después · Luis traduce · Danel construye");

    doc.addPage();
    hr();
    h1("3. Tecnología");
    table(
      ["Capa", "Qué usamos"],
      [
        ["Motor", "PlayCanvas 2.x en código (Vite)"],
        ["Simulación", "JS puro apps/src/sim/ — Vitest sin navegador"],
        ["Vista / UI", "view/ + HTML/CSS sobre canvas"],
        ["Backend", "Supabase (auth, salas, ranking)"],
        ["Deploy", "GitHub Pages · itch.io"],
      ],
      [110, 380]
    );
    h2("Arranque local");
    para("git checkout dev && git pull && cd apps && npm install && npm run dev");
    para("→ http://localhost:5173   ·   ?debug / F2 · ?level=muelle|bahia|aldea|campamento");

    hr();
    h1("4. Arquitectura");
    para("Capas a propósito: tunear la caja o el menú sin romper todo.");
    para("teclado → sim/ (reglas) → view/ (PlayCanvas) → ui/ (menú/HUD)");
    q("Regla de oro: lógica en sim/ · vista representa · UI reacciona a game.state.");
    h2("Historia");
    numbered(1, "Bootstrap Vite+PlayCanvas");
    numbered(2, "P1/P2 + caja compartida ← primer Better Together");
    numbered(3, "Huequito + mojado + nivel 1 ← vertical slice");
    numbered(4, "Clima, rieles, NPCs, 4 mapas");
    numbered(5, "Menú, personajes, audio, ranking, Pages");
    numbered(6, "Ahora → Local vs Multi · auth · salas · sync · micro");
    doc.moveDown(0.3);
    h2("Producto expo");
    table(
      ["Modo", "Qué es"],
      [
        ["Local", "Mismo PC, SIN login obligatorio"],
        ["Multijugador", "2 PCs + magic link + salas + sync + micro"],
        ["Móvil", "Coming soon"],
        ["Ranking", "local | multiplayer (play_mode)"],
      ],
      [120, 370]
    );
    para("Issues técnicos #63–#68 · Docs/UX #69–#71");

    doc.addPage();
    hr();
    h1("5. Mapa del repo");
    table(
      ["Carpeta", "Qué es", "Quién"],
      [
        ["apps/", "El juego", "Danel (+ Luis UI)"],
        ["supabase/", "Auth / ranking", "Jose"],
        ["docs/contexto/", "Relato + plantillas", "Todos (lectura)"],
        ["docs/ux · story", "Playtests / briefs", "Creativos A/B/C"],
        ["team/<nombre>/", "Tareas personales", "Cada activo"],
      ],
      [120, 180, 190]
    );
    para("Git: issue/<n>-slug desde dev → PR a dev → Jose a main para deploy.");

    hr();
    h1("6. Si acabas de llegar");
    numbered(1, "Lee este documento completo.");
    numbered(2, "Creativo: voz-y-estilo + tu slot + skeletons en docs/ux o story.");
    numbered(3, "Código: ONBOARDING.md + apps/README.md.");
    numbered(4, "Alcance → Jose · Contexto → Luis · Implementación → Danel.");

    hr();
    h1("Apéndices");
    table(
      ["Doc", "Para qué"],
      [
        ["roles.md", "Issues por persona / slot"],
        ["aportes.md", "Checklist huecos expo"],
        ["templates.json", "Catálogos + skeletons"],
        ["voz-y-estilo.md", "Tono de textos HTB"],
        ["COLLABORATORS.md", "GitHubs e invitaciones"],
      ],
      [160, 330]
    );
    doc.moveDown(0.5);
    doc
      .font("Helvetica-Oblique")
      .fontSize(8)
      .fillColor(gray)
      .text(
        "Fuente: docs/contexto/EL-PROYECTO.md · Generado con docs/contexto/plantilla/ (patrón Min Minas)."
      );

    footer();
    doc.end();
    stream.on("finish", () => {
      console.log("OK pdf  →", PDF_OUT);
      resolve();
    });
    stream.on("error", reject);
  });
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await buildDocx();
  await buildPdf();
  console.log("Listo. Abre out/Hold_the_Box_El_Proyecto.pdf");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
