// Cálculos de Drenagem Pluvial — NBR 10844

/* ============================================================
   Coeficientes IDF por cidade
   Equação: i = K × TR^a / (tc + b)^c    [mm/h]
   Fonte: DAEE/IPT, CETESB, literatura técnica brasileira
   ============================================================ */
const COEF_IDF = {
  'sao-paulo':      { K: 1716.68, a: 0.165, b: 11,   c: 0.889 },
  'rio-de-janeiro': { K: 3278.40, a: 0.179, b: 17,   c: 0.952 },
  'belo-horizonte': { K: 1955.00, a: 0.197, b: 14,   c: 0.866 },
  'curitiba':       { K: 1595.36, a: 0.160, b: 11.4, c: 0.854 },
  'porto-alegre':   { K: 1472.00, a: 0.152, b: 10,   c: 0.851 },
  'salvador':       { K: 2706.00, a: 0.164, b: 16,   c: 0.932 },
  'recife':         { K: 3154.00, a: 0.175, b: 15,   c: 0.945 },
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
    'recife': 'Recife — PE'
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
