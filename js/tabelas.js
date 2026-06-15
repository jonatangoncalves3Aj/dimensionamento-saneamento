// tabelas.js — Dados normativos estruturados e funções auxiliares
// NBR 8160 (Tabelas 1–8) e NBR 7229/13969 (Tabelas 9–14)

/* ── Tabela 1 — UHC e DN mínimo do ramal de descarga ── */
const TAB_UHC_APARELHO = [
  { nome: 'Bacia sanitária',                         uhc: 6.0, dn: 100, temVaso: true  },
  { nome: 'Banheira de residência',                  uhc: 2.0, dn: 40,  temVaso: false },
  { nome: 'Bebedouro',                               uhc: 0.5, dn: 40,  temVaso: false },
  { nome: 'Bidê',                                    uhc: 1.0, dn: 40,  temVaso: false },
  { nome: 'Chuveiro residencial',                    uhc: 2.0, dn: 40,  temVaso: false },
  { nome: 'Chuveiro coletivo',                       uhc: 4.0, dn: 40,  temVaso: false },
  { nome: 'Lavatório residencial',                   uhc: 1.0, dn: 40,  temVaso: false },
  { nome: 'Lavatório coletivo',                      uhc: 2.0, dn: 40,  temVaso: false },
  { nome: 'Mictório (válvula de descarga)',           uhc: 6.0, dn: 75,  temVaso: true  },
  { nome: 'Mictório (caixa de descarga)',             uhc: 5.0, dn: 50,  temVaso: true  },
  { nome: 'Mictório (descarga automática)',           uhc: 2.0, dn: 40,  temVaso: true  },
  { nome: 'Mictório de calha',                       uhc: 2.0, dn: 50,  temVaso: true  },
  { nome: 'Pia de cozinha residencial',               uhc: 3.0, dn: 50,  temVaso: false },
  { nome: 'Pia de cozinha industrial (preparação)',   uhc: 3.0, dn: 50,  temVaso: false },
  { nome: 'Pia de cozinha industrial (lavagem panelas)', uhc: 4.0, dn: 50, temVaso: false },
  { nome: 'Tanque de lavar roupas',                  uhc: 3.0, dn: 40,  temVaso: false },
  { nome: 'Máquina de lavar louças',                 uhc: 2.0, dn: 50,  temVaso: false },
  { nome: 'Máquina de lavar roupas',                 uhc: 3.0, dn: 50,  temVaso: false },
];

/* ── Tabela 2 — UHC de aparelho não listado (por DN do ramal) ── */
const TAB_UHC_DN = [
  { dn: 40, uhc: 2 },
  { dn: 50, uhc: 3 },
  { dn: 75, uhc: 5 },
  { dn: 100, uhc: 6 },
];

/* ── Tabela 3 — Coletores prediais / sub-coletores (UHC máx por DN × declividade) ── */
const TAB_COLETORES = [
  { dn: 100, decliv: { 0.5: null, 1.0: 180,  2.0: 216,   4.0: 250   } },
  { dn: 150, decliv: { 0.5: null, 1.0: 700,  2.0: 840,   4.0: 1000  } },
  { dn: 200, decliv: { 0.5: 1400, 1.0: 1600, 2.0: 1920,  4.0: 2300  } },
  { dn: 250, decliv: { 0.5: 2500, 1.0: 2900, 2.0: 3500,  4.0: 4200  } },
  { dn: 300, decliv: { 0.5: 3900, 1.0: 4600, 2.0: 5600,  4.0: 6700  } },
  { dn: 400, decliv: { 0.5: 7000, 1.0: 8300, 2.0: 10000, 4.0: 12000 } },
];

/* ── Tabela 4 — Tubos de queda (UHC máx por DN × pavimentos) ── */
const TAB_TUBOS_QUEDA = [
  { dn: 40,  ate3: 4,    mais3: 8    },
  { dn: 50,  ate3: 10,   mais3: 24   },
  { dn: 75,  ate3: 30,   mais3: 70   },
  { dn: 100, ate3: 240,  mais3: 500  },
  { dn: 150, ate3: 960,  mais3: 1900 },
  { dn: 200, ate3: 2200, mais3: 3600 },
  { dn: 250, ate3: 3800, mais3: 5600 },
  { dn: 300, ate3: 6000, mais3: 8400 },
];

/* ── Tabela 5 — Ramais de esgoto (UHC máx por DN) ── */
const TAB_RAMAIS_ESGOTO = [
  { dn: 40,  uhcMax: 3   },
  { dn: 50,  uhcMax: 6   },
  { dn: 75,  uhcMax: 20  },
  { dn: 100, uhcMax: 160 },
];

/* ── Tabela 7 — Distância máx. do desconector ao tubo ventilador ── */
const TAB_DIST_DESCONECTOR = [
  { dn: 40,  distMax: 1.00 },
  { dn: 50,  distMax: 1.20 },
  { dn: 75,  distMax: 1.80 },
  { dn: 100, distMax: 2.40 },
];

/* ── Tabela 8 — Ramais de ventilação ── */
// Sem vaso sanitário: UHC ≤12→DN40; 13–18→DN50; 19–36→DN75
// Com vaso sanitário: UHC ≤17→DN50; 18–60→DN75
const TAB_RAMAIS_VENTILACAO = [
  { comVaso: false, uhcMax: 12, dn: 40 },
  { comVaso: false, uhcMax: 18, dn: 50 },
  { comVaso: false, uhcMax: 36, dn: 75 },
  { comVaso: true,  uhcMax: 17, dn: 50 },
  { comVaso: true,  uhcMax: 60, dn: 75 },
];

/* ── Tabela 9 — Contribuição de esgoto e lodo fresco (NBR 7229) ── */
const TAB_CONTRIBUICAO = [
  { tipo: 'Residência padrão alto',               grupo: 'Permanente',  q: 160, lf: 1.0,  unidade: 'habitante'   },
  { tipo: 'Residência padrão médio',              grupo: 'Permanente',  q: 130, lf: 1.0,  unidade: 'habitante'   },
  { tipo: 'Residência padrão baixo',              grupo: 'Permanente',  q: 100, lf: 1.0,  unidade: 'habitante'   },
  { tipo: 'Hotel (s/ lavanderia)',                grupo: 'Permanente',  q: 100, lf: 1.0,  unidade: 'hóspede'     },
  { tipo: 'Hotel (c/ cozinha + lavanderia)',      grupo: 'Permanente',  q: 240, lf: 1.0,  unidade: 'hóspede'     },
  { tipo: 'Hotel (c/ coz. + lav. + banheiro)',   grupo: 'Permanente',  q: 360, lf: 1.0,  unidade: 'hóspede'     },
  { tipo: 'Alojamento provisório',               grupo: 'Permanente',  q: 80,  lf: 1.0,  unidade: 'habitante'   },
  { tipo: 'Orfanato / Asilo',                    grupo: 'Permanente',  q: 120, lf: 1.0,  unidade: 'habitante'   },
  { tipo: 'Escola (internato)',                  grupo: 'Permanente',  q: 150, lf: 1.0,  unidade: 'aluno'       },
  { tipo: 'Presídio',                            grupo: 'Permanente',  q: 240, lf: 1.0,  unidade: 'interno'     },
  { tipo: 'Quartel',                             grupo: 'Permanente',  q: 120, lf: 1.0,  unidade: 'militar'     },
  { tipo: 'Área rural',                          grupo: 'Permanente',  q: 100, lf: 1.0,  unidade: 'habitante'   },
  { tipo: 'Fábrica geral',                       grupo: 'Temporário',  q: 70,  lf: 0.30, unidade: 'funcionário' },
  { tipo: 'Escritório',                          grupo: 'Temporário',  q: 50,  lf: 0.20, unidade: 'funcionário' },
  { tipo: 'Edifício público / comercial',        grupo: 'Temporário',  q: 50,  lf: 0.20, unidade: 'funcionário' },
  { tipo: 'Escola (meio período)',               grupo: 'Temporário',  q: 50,  lf: 0.20, unidade: 'aluno'       },
  { tipo: 'Escola (período integral)',           grupo: 'Temporário',  q: 100, lf: 0.30, unidade: 'aluno'       },
  { tipo: 'Creche',                              grupo: 'Temporário',  q: 50,  lf: 0.30, unidade: 'criança'     },
  { tipo: 'Bar',                                 grupo: 'Temporário',  q: 6,   lf: 0.10, unidade: 'lugar'       },
  { tipo: 'Restaurante',                         grupo: 'Temporário',  q: 25,  lf: 0.10, unidade: 'lugar'       },
  { tipo: 'Cinema / Teatro / Templo',            grupo: 'Temporário',  q: 2,   lf: 0.02, unidade: 'lugar'       },
  { tipo: 'Ambulatório',                         grupo: 'Temporário',  q: 25,  lf: 0.20, unidade: 'consulta'    },
  { tipo: 'Estação ferro/rodoviária',            grupo: 'Temporário',  q: 25,  lf: 0.20, unidade: 'passageiro'  },
  { tipo: 'Sanitário público',                   grupo: 'Temporário',  q: 480, lf: 4.0,  unidade: 'bacia'       },
];

/* ── Tabela 10 — Tempo de detenção T por contribuição diária total (NBR 7229) ── */
const TAB_DETENCAO = [
  { qMaxDia: 1500,  T: 1.00 },
  { qMaxDia: 3000,  T: 0.92 },
  { qMaxDia: 4500,  T: 0.83 },
  { qMaxDia: 6000,  T: 0.75 },
  { qMaxDia: 7500,  T: 0.67 },
  { qMaxDia: 9000,  T: 0.58 },
  { qMaxDia: 12000, T: 0.50 },
];

/* ── Tabela 11 — Taxa de acumulação de lodo K (dias) por anos × temperatura ── */
const TAB_ACUMULO_LODO = [
  { anos: 1, frio: 94,  medio: 65,  quente: 57  },
  { anos: 2, frio: 134, medio: 105, quente: 97  },
  { anos: 3, frio: 174, medio: 145, quente: 137 },
  { anos: 4, frio: 214, medio: 185, quente: 177 },
  { anos: 5, frio: 254, medio: 225, quente: 217 },
];

/* ── Tabela 12 — Profundidade útil mín/máx por volume útil ── */
const TAB_PROFUNDIDADE = [
  { volMaxM3: 6.0,      hMin: 1.20, hMax: 2.20 },
  { volMaxM3: 10.0,     hMin: 1.50, hMax: 2.50 },
  { volMaxM3: Infinity, hMin: 1.80, hMax: 2.80 },
];

/* ── Tabela 13 — Tempo de detenção hidráulica por vazão × temperatura ── */
const TAB_DETENCAO_TEMP = [
  { qMaxDia: 1500,  frio: 1.17, medio: 1.00, quente: 0.92 },
  { qMaxDia: 3000,  frio: 1.08, medio: 0.92, quente: 0.83 },
  { qMaxDia: 4500,  frio: 1.00, medio: 0.83, quente: 0.75 },
  { qMaxDia: 6000,  frio: 0.92, medio: 0.75, quente: 0.67 },
  { qMaxDia: 7500,  frio: 0.83, medio: 0.67, quente: 0.58 },
  { qMaxDia: 9000,  frio: 0.75, medio: 0.58, quente: 0.50 },
  { qMaxDia: 12000, frio: 0.75, medio: 0.50, quente: 0.50 },
];

/* ── Tabela 14 — Taxa de percolação → taxa de aplicação superficial (sumidouro) ── */
const TAB_PERCOLACAO = [
  { taxaMin: 0,    taxaMax: 40,   aplicacao: 0.200 },
  { taxaMin: 40,   taxaMax: 80,   aplicacao: 0.140 },
  { taxaMin: 80,   taxaMax: 120,  aplicacao: 0.120 },
  { taxaMin: 120,  taxaMax: 160,  aplicacao: 0.100 },
  { taxaMin: 160,  taxaMax: 200,  aplicacao: 0.090 },
  { taxaMin: 200,  taxaMax: 400,  aplicacao: 0.065 },
  { taxaMin: 400,  taxaMax: 600,  aplicacao: 0.053 },
  { taxaMin: 600,  taxaMax: 1200, aplicacao: 0.037 },
  { taxaMin: 1200, taxaMax: 1440, aplicacao: 0.032 },
  { taxaMin: 1440, taxaMax: 2400, aplicacao: 0.024 },
];

/* ============================================================
   FUNÇÕES AUXILIARES
   ============================================================ */

/**
 * Tabela 13 — Retorna T (dias) por vazão diária e faixa de temperatura.
 * faixaTemp: 'frio' (<15°C) | 'medio' (15–25°C) | 'quente' (>25°C)
 */
function buscarDetencaoTemp(qDia, faixaTemp) {
  const faixa = faixaTemp || 'medio';
  for (const row of TAB_DETENCAO_TEMP) {
    if (qDia <= row.qMaxDia) return row[faixa];
  }
  return TAB_DETENCAO_TEMP[TAB_DETENCAO_TEMP.length - 1][faixa];
}

/**
 * Tabela 10 — Retorna T (dias) apenas pela vazão diária.
 */
function buscarDetencao(qDia) {
  for (const row of TAB_DETENCAO) {
    if (qDia <= row.qMaxDia) return row.T;
  }
  return TAB_DETENCAO[TAB_DETENCAO.length - 1].T;
}

/**
 * Tabela 11 — Retorna K (dias) por anos entre limpezas e faixa de temperatura.
 * faixaTemp: 'frio' (≤10°C) | 'medio' (10–20°C) | 'quente' (>20°C)
 */
function buscarAcumuloLodo(anos, faixaTemp) {
  const row = TAB_ACUMULO_LODO.find(r => r.anos === anos);
  if (!row) return TAB_ACUMULO_LODO[TAB_ACUMULO_LODO.length - 1][faixaTemp || 'medio'];
  return row[faixaTemp || 'medio'];
}

/**
 * Tabela 12 — Retorna {hMin, hMax} por volume útil em m³.
 */
function buscarProfundidade(volM3) {
  for (const row of TAB_PROFUNDIDADE) {
    if (volM3 <= row.volMaxM3) return { hMin: row.hMin, hMax: row.hMax };
  }
  return { hMin: 1.80, hMax: 2.80 };
}

/**
 * Tabela 14 — Retorna taxa de aplicação superficial (m³/m²·d) por taxa de percolação (min/m).
 * Interpolação linear entre os pontos.
 */
function buscarTaxaPercolacao(taxaPerc) {
  const pontos = [
    { x: 40,   y: 0.200 },
    { x: 80,   y: 0.140 },
    { x: 120,  y: 0.120 },
    { x: 160,  y: 0.100 },
    { x: 200,  y: 0.090 },
    { x: 400,  y: 0.065 },
    { x: 600,  y: 0.053 },
    { x: 1200, y: 0.037 },
    { x: 1440, y: 0.032 },
    { x: 2400, y: 0.024 },
  ];
  if (taxaPerc <= pontos[0].x) return pontos[0].y;
  if (taxaPerc >= pontos[pontos.length - 1].x) return pontos[pontos.length - 1].y;
  for (let i = 0; i < pontos.length - 1; i++) {
    if (taxaPerc <= pontos[i + 1].x) {
      const t = (taxaPerc - pontos[i].x) / (pontos[i + 1].x - pontos[i].x);
      return pontos[i].y + t * (pontos[i + 1].y - pontos[i].y);
    }
  }
  return pontos[pontos.length - 1].y;
}

/**
 * Tabela 5 — Seleciona DN para ramal de esgoto.
 */
function selecionarDNRamalEsgoto(uhc) {
  for (const row of TAB_RAMAIS_ESGOTO) {
    if (uhc <= row.uhcMax) return row.dn;
  }
  return TAB_RAMAIS_ESGOTO[TAB_RAMAIS_ESGOTO.length - 1].dn;
}

/**
 * Tabela 4 — Seleciona DN para tubo de queda.
 */
function selecionarDNTuboQueda(uhc, pavimentos) {
  const col = pavimentos <= 3 ? 'ate3' : 'mais3';
  for (const row of TAB_TUBOS_QUEDA) {
    if (uhc <= row[col]) return row.dn;
  }
  return TAB_TUBOS_QUEDA[TAB_TUBOS_QUEDA.length - 1].dn;
}

/**
 * Tabela 3 — Seleciona DN para coletor predial.
 * decliv: 0.5 | 1.0 | 2.0 | 4.0
 */
function selecionarDNColetor(uhc, decliv) {
  // Encontrar a coluna de declividade mais próxima disponível
  const cols = [0.5, 1.0, 2.0, 4.0];
  let colKey = cols.reduce((prev, cur) =>
    Math.abs(cur - decliv) < Math.abs(prev - decliv) ? cur : prev
  );
  for (const row of TAB_COLETORES) {
    const val = row.decliv[colKey];
    if (val !== null && val !== undefined && uhc <= val) return row.dn;
  }
  return TAB_COLETORES[TAB_COLETORES.length - 1].dn;
}

/**
 * Tabela 8 — Seleciona DN para ramal de ventilação.
 */
function selecionarDNRamalVentilacao(uhc, comVaso) {
  const rows = TAB_RAMAIS_VENTILACAO.filter(r => r.comVaso === comVaso);
  for (const row of rows) {
    if (uhc <= row.uhcMax) return row.dn;
  }
  return rows[rows.length - 1].dn;
}

/**
 * Tabela 7 — Retorna distância máxima do desconector ao ventilador.
 */
function buscarDistDesconector(dn) {
  const row = TAB_DIST_DESCONECTOR.find(r => r.dn >= dn);
  return row ? row.distMax : 2.40;
}
