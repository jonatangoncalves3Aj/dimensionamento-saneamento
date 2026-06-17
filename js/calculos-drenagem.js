// Cálculos de Drenagem Pluvial — NBR 10844

/* ============================================================
   Coeficientes IDF por cidade
   Equação: i = K × TR^a / (tc + b)^c    [mm/h]
   Fonte: DAEE/IPT, CETESB, literatura técnica brasileira
   ============================================================ */
const COEF_IDF = {
  'sao-paulo':        { K: 1716.68, a: 0.165, b: 11,    c: 0.889 },
  'rio-de-janeiro':   { K: 3278.40, a: 0.179, b: 17,    c: 0.952 },
  'belo-horizonte':   { K: 1955.00, a: 0.197, b: 14,    c: 0.866 },
  'curitiba':         { K: 1595.36, a: 0.160, b: 11.4,  c: 0.854 },
  'porto-alegre':     { K: 1472.00, a: 0.152, b: 10,    c: 0.851 },
  'salvador':         { K: 2706.00, a: 0.164, b: 16,    c: 0.932 },
  'recife':           { K: 3154.00, a: 0.175, b: 15,    c: 0.945 },
  // Santa Catarina — Fonte: EPAGRI/CIRAM, literatura técnica (Genovez & Zuffo, 2000)
  'florianopolis':    { K: 1682.77, a: 0.170, b: 14.40, c: 0.882 },
  'joinville':        { K: 2395.00, a: 0.178, b: 16.0,  c: 0.900 },
  'blumenau':         { K: 2095.00, a: 0.163, b: 14.0,  c: 0.882 },
  'chapeco':          { K: 1330.00, a: 0.161, b: 11.5,  c: 0.845 },
  'criciuma':         { K: 1520.00, a: 0.157, b: 12.5,  c: 0.855 },
  'itajai':           { K: 2200.00, a: 0.170, b: 15.0,  c: 0.890 },
};

function atualizarCoeficientesIDF() {
  const cidade = document.getElementById('idf-cidade').value;
  const coef   = COEF_IDF[cidade];
  if (!coef) return;
  document.getElementById('idf-k').textContent = coef.K;
  document.getElementById('idf-a').textContent = coef.a;
  document.getElementById('idf-b').textContent = coef.b;
  document.getElementById('idf-c').textContent = coef.c;
}

/* ============================================================
   1. MÉTODO RACIONAL — Q = C × i × A / 360
   ============================================================ */
function calcularMetodoRacional() {
  const C = parseFloat(document.getElementById('rc-c').value);
  const i = parseFloat(document.getElementById('rc-i').value);   // mm/h
  const A = parseFloat(document.getElementById('rc-a').value);   // ha

  const el = document.getElementById('resultado-racional');

  if (!C || !i || !A || C <= 0 || i <= 0 || A <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Método Racional: Q = C × i × A / 360  [m³/s com A em ha e i em mm/h]
  // Ou equivalente: Q [L/s] = C × i [mm/h] × A [ha] × 1000 / 3600
  const Q_m3s = C * i * A / 360;         // m³/s
  const Q_ls  = Q_m3s * 1000;            // L/s

  // Área em m²
  const A_m2 = A * 10000;

  // Verificação do coeficiente C
  let msgC = '';
  if (C > 0.95) {
    msgC = '&#9888; Coeficiente C > 0,95: superfície completamente impermeável.';
  } else if (C < 0.2) {
    msgC = '&#9432; Coeficiente C baixo: área permeável (rural ou floresta).';
  } else {
    msgC = '&#10003; Coeficiente C dentro da faixa típica para áreas urbanas.';
  }

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Método Racional</h4>
    <div class="result-main">
      <div><div class="label">Vazão de pico Q</div><div class="value">${fmt(Q_ls)} L/s</div></div>
      <div><div class="label">Q em m³/s</div><div class="value">${Q_m3s.toFixed(4)} m³/s</div></div>
    </div>
    <table class="result-table">
      <tr><td>Coeficiente de escoamento C</td><td>${C}</td></tr>
      <tr><td>Intensidade de chuva i</td><td>${i} mm/h</td></tr>
      <tr><td>Área de contribuição A</td><td>${A} ha (${fmt(A_m2)} m²)</td></tr>
      <tr><td>Fórmula aplicada</td><td>Q = C × i × A / 360</td></tr>
      <tr><td>Vazão de pico Q</td><td><strong>${fmt(Q_m3s, 4)} m³/s = ${fmt(Q_ls)} L/s</strong></td></tr>
    </table>
    <p class="status-msg">${msgC}</p>
    <p class="status-msg">&#9432; Método Racional válido para bacias &lt; 2 km² (NBR 10844 §5.3).</p>`;
}

/* ============================================================
   2. INTENSIDADE DE CHUVA — EQUAÇÃO IDF
   ============================================================ */
function calcularIntensidadeIDF() {
  const cidade = document.getElementById('idf-cidade').value;
  const TR     = parseFloat(document.getElementById('idf-tr').value);  // anos
  const tc     = parseFloat(document.getElementById('idf-tc').value);  // min

  const el = document.getElementById('resultado-idf');

  const coef = COEF_IDF[cidade];
  if (!coef) { mostrarErro(el, 'Cidade não reconhecida.'); return; }
  if (!TR || !tc || TR <= 0 || tc < 5) {
    mostrarErro(el, 'Período de retorno deve ser > 0 e Tc ≥ 5 min (NBR 10844).');
    return;
  }

  const { K, a, b, c } = coef;

  // i = K × TR^a / (tc + b)^c    [mm/h]
  const i = K * Math.pow(TR, a) / Math.pow(tc + b, c);

  // Probabilidade de ocorrência e riscos
  const P   = 1 / TR;            // probabilidade anual
  const risco_n50 = 1 - Math.pow(1 - P, 50);  // risco em 50 anos

  // Classificação do TR
  let msgTR = '';
  if      (TR <= 2)  msgTR = 'Áreas rurais / drenagem menor';
  else if (TR <= 5)  msgTR = 'Áreas residenciais';
  else if (TR <= 10) msgTR = 'Áreas comerciais / centros urbanos';
  else if (TR <= 25) msgTR = 'Áreas industriais / hospitais';
  else if (TR <= 50) msgTR = 'Passagens inferiores / galerias principais';
  else               msgTR = 'Obras especiais / infraestrutura crítica';

  const nomeCidades = {
    'sao-paulo': 'São Paulo — SP', 'rio-de-janeiro': 'Rio de Janeiro — RJ',
    'belo-horizonte': 'Belo Horizonte — MG', 'curitiba': 'Curitiba — PR',
    'porto-alegre': 'Porto Alegre — RS', 'salvador': 'Salvador — BA',
    'recife': 'Recife — PE',
    'florianopolis': 'Florianópolis — SC', 'joinville': 'Joinville — SC',
    'blumenau': 'Blumenau — SC', 'chapeco': 'Chapecó — SC',
    'criciuma': 'Criciúma — SC', 'itajai': 'Itajaí — SC',
  };

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Intensidade de Chuva (IDF)</h4>
    <div class="result-main">
      <div><div class="label">Intensidade de chuva i</div><div class="value">${fmt(i)} mm/h</div></div>
      <span class="result-badge ok">&#10003; IDF</span>
    </div>
    <table class="result-table">
      <tr><td>Cidade</td><td>${nomeCidades[cidade] || cidade}</td></tr>
      <tr><td>Período de retorno TR</td><td>${TR} anos</td></tr>
      <tr><td>Tempo de concentração Tc</td><td>${tc} min</td></tr>
      <tr><td>Coeficientes IDF (K, a, b, c)</td><td>${K} / ${a} / ${b} / ${c}</td></tr>
      <tr><td>Equação IDF aplicada</td><td>i = K × TR^a / (Tc + b)^c</td></tr>
      <tr><td>Intensidade calculada i</td><td><strong>${fmt(i)} mm/h</strong></td></tr>
      <tr><td>Probabilidade anual de ocorrência</td><td>${(P * 100).toFixed(1)}% ao ano</td></tr>
      <tr><td>Risco em 50 anos de uso</td><td>${(risco_n50 * 100).toFixed(1)}%</td></tr>
    </table>
    <p class="status-msg">&#9432; TR = ${TR} anos: ${msgTR}.</p>`;
}

/* ============================================================
   3. DIMENSIONAMENTO DE TUBULAÇÃO PLUVIAL
   ============================================================ */
function calcularTubulacaoPluvial() {
  const Q  = parseFloat(document.getElementById('tp-vazao').value);         // L/s
  const I  = parseFloat(document.getElementById('tp-declividade').value);   // m/m
  const n  = parseFloat(document.getElementById('tp-n').value);

  const el = document.getElementById('resultado-tubo-pluvial');

  if (!Q || !I || !n || Q <= 0 || I <= 0 || n <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Dimensionamento por Manning com seção plena (galerias pluviais projetadas para seção plena)
  // Q = (1/n) × A × R^(2/3) × I^(1/2)
  // Para seção circular: Q = (1/n) × (πD²/4) × (D/4)^(2/3) × I^(1/2)
  //                     Q = (1/n) × (π/4) × D^(8/3) / 4^(2/3) × I^(1/2)
  // D = [Q × n × 4^(2/3) / ((π/4) × I^(1/2))]^(3/8)

  const Qm3s = Q / 1000;

  const D_calc = Math.pow(
    (Qm3s * n * Math.pow(4, 2/3)) / ((Math.PI / 4) * Math.pow(I, 0.5)),
    3 / 8
  );  // m
  const D_mm = D_calc * 1000;

  // Diâmetros comerciais de galerias pluviais
  const diametros = [150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1500];
  const DN = diametros.find(d => d >= D_mm) || Math.ceil(D_mm / 100) * 100;

  // Verificações com DN adotado
  const D_adot = DN / 1000;
  const A_plena = Math.PI * D_adot * D_adot / 4;
  const R_plena = D_adot / 4;
  const Q_plena = (1/n) * A_plena * Math.pow(R_plena, 2/3) * Math.pow(I, 0.5);   // m³/s
  const V_plena = (1/n) * Math.pow(R_plena, 2/3) * Math.pow(I, 0.5);             // m/s

  // Nível d'água relativo no DN adotado
  const Q_rel = Qm3s / Q_plena;  // < 1 significa não está cheio

  // Critérios: V mín = 0,7 m/s (pluvial, NBR 10844); V máx = 5,0 m/s
  let status = 'ok', msgs = [];
  if (V_plena < 0.7) { status = 'aviso'; msgs.push('&#9888; Velocidade ('+V_plena.toFixed(2)+' m/s) abaixo de 0,7 m/s — risco de deposição (NBR 10844).'); }
  if (V_plena > 5.0) { status = 'erro';  msgs.push('&#9888; Velocidade ('+V_plena.toFixed(2)+' m/s) acima de 5,0 m/s — risco de erosão na tubulação.'); }
  if (msgs.length === 0) msgs.push('&#10003; Velocidade dentro dos limites (0,7 – 5,0 m/s).');

  el.className = `resultado resultado-${status}`;
  el.innerHTML = `
    <h4>Resultados — Tubulação Pluvial</h4>
    <div class="result-main">
      <div><div class="label">Diâmetro calculado</div><div class="value">${D_mm.toFixed(1)} mm</div></div>
      <div><div class="label">DN comercial adotado</div><div class="value">DN ${DN} mm</div></div>
    </div>
    <table class="result-table">
      <tr><td>Vazão de projeto Q</td><td>${fmt(Q)} L/s</td></tr>
      <tr><td>Declividade I</td><td>${I} m/m (${(I*1000).toFixed(2)} ‰)</td></tr>
      <tr><td>Coeficiente n (Manning)</td><td>${n}</td></tr>
      <tr><td>Diâmetro calculado (seção plena)</td><td>${D_mm.toFixed(2)} mm</td></tr>
      <tr><td>DN comercial adotado</td><td><strong>DN ${DN} mm</strong></td></tr>
      <tr><td>Capacidade seção plena (Q_cap)</td><td>${fmt(Q_plena * 1000)} L/s</td></tr>
      <tr><td>Grau de enchimento Q/Q_cap</td><td>${(Q_rel * 100).toFixed(1)}%</td></tr>
      <tr><td>Velocidade (seção plena)</td><td>${V_plena.toFixed(3)} m/s</td></tr>
    </table>
    <p class="status-msg">${msgs.join('<br>')}</p>
    <p class="status-msg">&#9432; Galerias pluviais são projetadas para escoamento a seção plena (NBR 10844).</p>`;
}

/* ============================================================
   4. TEMPO DE CONCENTRAÇÃO — KIRPICH
   ============================================================ */
function calcularTempoConcent() {
  const L  = parseFloat(document.getElementById('tc-l').value);   // m
  const H  = parseFloat(document.getElementById('tc-h').value);   // m (desnível)
  const el = document.getElementById('resultado-tc');

  if (!L || !H || L <= 0 || H <= 0) {
    mostrarErro(el, 'Informe o comprimento e desnível do talvegue com valores positivos.');
    return;
  }

  // Kirpich (1940): tc = 57 × (L³/H)^0,385    [min]  — bacia rural
  const tc_kirpich = 57 * Math.pow((L * L * L) / H, 0.385) / 60;  // min  (L em m, H em m)

  // Temez (1978) — versão espanhola, usada no Brasil para bacias urbanas:
  // tc = 0,3 × (L / I^0,25)^0,76   (L em km, I = H/L)
  const Lkm = L / 1000;
  const I_bacia = H / L;
  const tc_temez = 0.3 * Math.pow(Lkm / Math.pow(I_bacia, 0.25), 0.76) * 60;  // min

  const tc_adot = Math.max(tc_kirpich, 5);  // mín 5 min (NBR 10844)

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Tempo de Concentração</h4>
    <div class="result-main">
      <div><div class="label">Tc (Kirpich)</div><div class="value">${fmt(tc_kirpich, 2)} min</div></div>
      <div><div class="label">Tc adotado</div><div class="value">${fmt(tc_adot, 2)} min</div></div>
    </div>
    <table class="result-table">
      <tr><td>Comprimento do talvegue principal (L)</td><td>${fmt(L, 1)} m = ${fmt(Lkm, 3)} km</td></tr>
      <tr><td>Desnível total da bacia (H)</td><td>${fmt(H, 2)} m</td></tr>
      <tr><td>Declividade média (I = H/L)</td><td>${fmt(I_bacia * 100, 3)}%</td></tr>
      <tr><td>Tc — Kirpich (bacia rural/mista)</td><td>${fmt(tc_kirpich, 2)} min</td></tr>
      <tr><td>Tc — Temez (bacia urbana)</td><td>${fmt(tc_temez, 2)} min</td></tr>
      <tr><td><strong>Tc adotado (≥ 5 min — NBR 10844)</strong></td><td><strong>${fmt(tc_adot, 2)} min</strong></td></tr>
    </table>
    <p class="status-msg">&#9432; Use o Tc obtido como entrada no cálculo de Intensidade IDF (Card 2). NBR 10844: Tc mínimo = 5 min para áreas impermeáveis.</p>`;
}

/* ============================================================
   5. ÁREA DE CONTRIBUIÇÃO E VAZÃO (NBR 10844)
   ============================================================ */
// Estado das superfícies adicionadas
let superficiesDrenagem = [];

function adicionarSuperficieDrenagem() {
  const a = parseFloat(document.getElementById('ac-a').value);     // m
  const b = parseFloat(document.getElementById('ac-b').value);     // m
  const h = parseFloat(document.getElementById('ac-h').value) || 0; // m desnível do telhado
  const C = parseFloat(document.getElementById('ac-c').value);
  if (!a || !b || !C || a <= 0 || b <= 0 || C <= 0) {
    alert('Preencha a, b e coeficiente de escoamento C.'); return;
  }
  // Área horizontal projetada + projeção do telhado inclinado: A = (a + h/2) × b
  const A_neta = (a + h / 2) * b;
  superficiesDrenagem.push({ a, b, h, C, A_neta });
  renderizarSuperficiesDrenagem();
}

function removerSuperficieDrenagem(i) {
  superficiesDrenagem.splice(i, 1);
  renderizarSuperficiesDrenagem();
}

function renderizarSuperficiesDrenagem() {
  const tbody = document.getElementById('ac-tbody');
  if (!tbody) return;
  if (superficiesDrenagem.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="predial-empty">Nenhuma superfície adicionada.</td></tr>';
    return;
  }
  tbody.innerHTML = superficiesDrenagem.map((s, i) => `
    <tr>
      <td class="text-center">${fmt(s.a, 1)}</td>
      <td class="text-center">${fmt(s.b, 1)}</td>
      <td class="text-center">${fmt(s.h, 1)}</td>
      <td class="text-center">${fmt(s.C, 2)}</td>
      <td class="text-center"><strong>${fmt(s.A_neta, 2)}</strong></td>
      <td class="text-center"><button class="btn-remove-ap" onclick="removerSuperficieDrenagem(${i})" title="Remover">&#10005;</button></td>
    </tr>`).join('');
}

function calcularAreaContribuicao() {
  const i_chuva = parseFloat(document.getElementById('ac-i').value);  // mm/h
  const el      = document.getElementById('resultado-ac');

  if (superficiesDrenagem.length === 0) {
    mostrarErro(el, 'Adicione ao menos uma superfície.'); return;
  }
  if (!i_chuva || i_chuva <= 0) {
    mostrarErro(el, 'Informe a intensidade de chuva (mm/h).'); return;
  }

  // A × C ponderado
  const sumAC = superficiesDrenagem.reduce((s, x) => s + x.A_neta * x.C, 0);
  const sumA  = superficiesDrenagem.reduce((s, x) => s + x.A_neta, 0);
  const C_med = sumAC / sumA;
  // Q = i × (sumAC) / 60.000   [L/s]    (i em mm/h, A em m²)
  const Q_Ls  = i_chuva * sumAC / 60000;

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Área de Contribuição (NBR 10844)</h4>
    <div class="result-main">
      <div><div class="label">Área total efetiva</div><div class="value">${fmt(sumAC / C_med, 2)} m²</div></div>
      <div><div class="label">Vazão Q</div><div class="value">${fmt(Q_Ls, 4)} L/s</div></div>
    </div>
    <table class="result-table">
      <tr><td>Nº de superfícies</td><td>${superficiesDrenagem.length}</td></tr>
      <tr><td>Área total (soma)</td><td>${fmt(sumA, 2)} m²</td></tr>
      <tr><td>Σ(A × C) ponderado</td><td>${fmt(sumAC, 2)} m²</td></tr>
      <tr><td>C médio ponderado</td><td>${fmt(C_med, 3)}</td></tr>
      <tr><td>Intensidade de chuva (i)</td><td>${fmt(i_chuva)} mm/h</td></tr>
      <tr><td>Fórmula: Q = i × Σ(A×C) / 60.000</td><td><strong>Q = ${fmt(Q_Ls, 5)} L/s</strong></td></tr>
    </table>
    <p class="status-msg">&#9432; NBR 10844: área inclinada = (a + h/2) × b; projeção da cobertura inclui área sobreposta ao beiral.</p>`;
}

/* ============================================================
   6. CALHAS (NBR 10844)
   ============================================================ */
function calcularCalha() {
  const Q   = parseFloat(document.getElementById('cal-q').value);       // L/min
  const sec = document.getElementById('cal-sec').value;                 // 'semi'|'rect'
  const I   = parseFloat(document.getElementById('cal-i').value) / 100; // converte % para m/m
  const n   = 0.011;  // n Manning para calhas de zinco/alumínio/PVC pintado
  const el  = document.getElementById('resultado-calha');

  if (!Q || !I || Q <= 0 || I <= 0) {
    mostrarErro(el, 'Preencha a vazão e a declividade com valores positivos.');
    return;
  }

  const Qm3s = Q / 60000;  // L/min → m³/s

  // Capacidades por DN (NBR 10844 Tabela 1 — calha semicircular horizontal, n=0,011, I=0,5%)
  // Valores de capacidade retirados da Tabela 1 da NBR 10844
  const TAB_CALHA_SEMI = [
    { dn: 100, Q_ref: 3.3 },    // L/min (i=0,5%, n=0,011)
    { dn: 125, Q_ref: 5.8 },
    { dn: 150, Q_ref: 9.1 },
    { dn: 200, Q_ref: 18.4 },
  ];

  // Ajuste de capacidade pela declividade real vs referência (0,5% = 0,005 m/m)
  // Q ∝ I^0,5  →  Q_real = Q_ref × sqrt(I / 0.005)
  const fator_I = Math.sqrt(I / 0.005);

  if (sec === 'semi') {
    const dnAdot = TAB_CALHA_SEMI.find(r => r.Q_ref * fator_I >= Q);
    const dnSel  = dnAdot ? dnAdot.dn : '>200 (usar condutor maior ou dividir área)';
    const capAdot = dnAdot ? fmt(dnAdot.Q_ref * fator_I, 1) : '—';

    el.className = 'resultado resultado-ok';
    el.innerHTML = `
      <h4>Resultados — Calha Semicircular (NBR 10844)</h4>
      <div class="result-main">
        <div><div class="label">DN adotado</div><div class="value">${typeof dnSel === 'number' ? 'DN ' + dnSel + ' mm' : dnSel}</div></div>
        <div><div class="label">Vazão Q</div><div class="value">${fmt(Q)} L/min</div></div>
      </div>
      <table class="result-table">
        <tr><td>Vazão de projeto Q</td><td>${fmt(Q)} L/min</td></tr>
        <tr><td>Declividade adotada</td><td>${fmt(I * 100, 2)}% = ${fmt(I, 4)} m/m</td></tr>
        <tr><td>Fator de ajuste de declividade (√(I/0,5%))</td><td>${fmt(fator_I, 3)}</td></tr>
        ${TAB_CALHA_SEMI.map(r => `<tr><td>DN ${r.dn} — Capacidade na declividade adotada</td><td>${fmt(r.Q_ref * fator_I, 1)} L/min</td></tr>`).join('')}
        <tr><td><strong>DN comercial adotado</strong></td><td><strong>${typeof dnSel === 'number' ? 'DN ' + dnSel + ' mm' : dnSel}</strong> — cap. ${capAdot} L/min</td></tr>
      </table>
      <p class="status-msg">&#9432; Tabela 1 — NBR 10844: calha semicircular, n = 0,011, I de referência = 0,5%. Capacidade escala com √I.</p>`;
  } else {
    // Retangular: dimensionar B e H com H/B = 0,4..0,6
    // Q = (1/n) × A × R^(2/3) × I^0,5; para retângulo: R = (B×H)/(B+2H)
    // Adotar H = 0,5×B: R ≈ (0,5B²)/(B+B) = B/4; A = 0,5B²
    // Q = (1/n) × 0,5B² × (B/4)^(2/3) × I^0,5
    // B = [Q×n / (0,5 × (1/4)^(2/3) × I^0,5)]^(3/8)
    const B = Math.pow(Qm3s * n / (0.5 * Math.pow(0.25, 2/3) * Math.pow(I, 0.5)), 3/8) * 1000; // mm
    const H = 0.5 * B;
    const bAdot = Math.ceil(B / 10) * 10;
    const hAdot = Math.ceil(H / 10) * 10 + 30;  // +30 mm borda livre

    el.className = 'resultado resultado-ok';
    el.innerHTML = `
      <h4>Resultados — Calha Retangular (NBR 10844)</h4>
      <div class="result-main">
        <div><div class="label">Largura B</div><div class="value">${fmt(bAdot)} mm</div></div>
        <div><div class="label">Altura H (c/ borda)</div><div class="value">${fmt(hAdot)} mm</div></div>
      </div>
      <table class="result-table">
        <tr><td>Vazão de projeto Q</td><td>${fmt(Q)} L/min = ${fmt(Qm3s, 7)} m³/s</td></tr>
        <tr><td>Declividade</td><td>${fmt(I * 100, 2)}%</td></tr>
        <tr><td>Largura mínima calculada B</td><td>${fmt(B, 1)} mm</td></tr>
        <tr><td>Altura lâmina (H = 0,5B)</td><td>${fmt(H, 1)} mm</td></tr>
        <tr><td><strong>Dimensões adotadas</strong></td><td><strong>B = ${bAdot} mm × H_total = ${hAdot} mm</strong></td></tr>
      </table>
      <p class="status-msg">&#9432; Borda livre adotada de 30 mm. NBR 10844: declividade mínima da calha = 0,5%.</p>`;
  }
}

/* ============================================================
   7. CONDUTORES VERTICAIS E HORIZONTAIS (NBR 10844)
   ============================================================ */
// Capacidade de condutores verticais por DN (NBR 10844 Tabela 3)
// Capacidade em L/min por coluna, função do diâmetro
const TAB_COND_VERT = [
  { dn: 75,  cap: 86   },
  { dn: 100, cap: 194  },
  { dn: 125, cap: 367  },
  { dn: 150, cap: 617  },
  { dn: 200, cap: 1351 },
];

// Capacidade de condutores horizontais por DN × declividade (NBR 10844 Tabela 4)
const TAB_COND_HORIZ = [
  { dn:  75, i_0_5: 49,  i_1_0: 69,  i_2_0: 98  },
  { dn: 100, i_0_5: 109, i_1_0: 154, i_2_0: 218 },
  { dn: 125, i_0_5: 207, i_1_0: 293, i_2_0: 414 },
  { dn: 150, i_0_5: 348, i_1_0: 492, i_2_0: 696 },
  { dn: 200, i_0_5: 762, i_1_0:1078, i_2_0:1524 },
];

function calcularCondutores() {
  const Q    = parseFloat(document.getElementById('cv-q').value);   // L/min
  const tipo = document.getElementById('cv-tipo').value;            // 'vertical'|'horizontal'
  const declStr = document.getElementById('cv-decl')?.value || '1.0';
  const el   = document.getElementById('resultado-condutores');

  if (!Q || Q <= 0) {
    mostrarErro(el, 'Informe a vazão de projeto Q em L/min.');
    return;
  }

  if (tipo === 'vertical') {
    const row = TAB_COND_VERT.find(r => r.cap >= Q);
    const dn  = row ? row.dn : '>200 mm (dividir em mais de um condutor)';
    const cap = row ? row.cap : '—';

    el.className = 'resultado resultado-ok';
    el.innerHTML = `
      <h4>Resultados — Condutor Vertical (NBR 10844)</h4>
      <div class="result-main">
        <div><div class="label">DN adotado</div><div class="value">${typeof dn === 'number' ? 'DN ' + dn + ' mm' : dn}</div></div>
      </div>
      <table class="result-table">
        <tr><td>Vazão de projeto Q</td><td>${fmt(Q)} L/min</td></tr>
        ${TAB_COND_VERT.map(r => `<tr><td>DN ${r.dn} mm — Capacidade</td><td>${r.cap} L/min</td></tr>`).join('')}
        <tr><td><strong>DN adotado</strong></td><td><strong>${typeof dn === 'number' ? 'DN ' + dn + ' mm' : dn}</strong> — cap. ${cap} L/min</td></tr>
      </table>
      <p class="status-msg">&#9432; Tabela 3 — NBR 10844: capacidade calculada com lâmina = 7/24 × D (regime de saída livre). Prever câmara de inspeção na base.</p>`;
  } else {
    const decliv = parseFloat(declStr);
    const colI   = decliv <= 0.75 ? 'i_0_5' : decliv <= 1.5 ? 'i_1_0' : 'i_2_0';
    const row    = TAB_COND_HORIZ.find(r => r[colI] >= Q);
    const dn     = row ? row.dn : '>200 mm';
    const cap    = row ? row[colI] : '—';
    const declLabel = { i_0_5: '0,5%', i_1_0: '1,0%', i_2_0: '2,0%' };

    el.className = 'resultado resultado-ok';
    el.innerHTML = `
      <h4>Resultados — Condutor Horizontal (NBR 10844)</h4>
      <div class="result-main">
        <div><div class="label">DN adotado</div><div class="value">${typeof dn === 'number' ? 'DN ' + dn + ' mm' : dn}</div></div>
        <div><div class="label">Declividade usada</div><div class="value">${declLabel[colI]}</div></div>
      </div>
      <table class="result-table">
        <tr><td>Vazão de projeto Q</td><td>${fmt(Q)} L/min</td></tr>
        <tr><td>Declividade adotada</td><td>${decliv}% → coluna ${declLabel[colI]}</td></tr>
        ${TAB_COND_HORIZ.map(r => `<tr><td>DN ${r.dn} mm — Cap. (${declLabel[colI]})</td><td>${r[colI]} L/min</td></tr>`).join('')}
        <tr><td><strong>DN adotado</strong></td><td><strong>${typeof dn === 'number' ? 'DN ' + dn + ' mm' : dn}</strong> — cap. ${cap} L/min</td></tr>
      </table>
      <p class="status-msg">&#9432; Tabela 4 — NBR 10844. Declividade mínima do condutor horizontal = 0,5%. Coeficiente n = 0,011.</p>`;
  }
}
