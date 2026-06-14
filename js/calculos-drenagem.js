// Cálculos de Drenagem Pluvial — NBR 10844

// Coeficientes IDF para cidades brasileiras
// Equação: i = K × TR^a / (tc + b)^c   (i em mm/h, tc em min)
const IDF_CIDADES = {
  'sao-paulo':       { K: 1716.68, a: 0.165, b: 11,  c: 0.889 },
  'rio-de-janeiro':  { K: 2478.60, a: 0.162, b: 16,  c: 0.940 },
  'belo-horizonte':  { K: 1199.48, a: 0.167, b: 8,   c: 0.817 },
  'curitiba':        { K: 1257.61, a: 0.182, b: 10,  c: 0.853 },
  'porto-alegre':    { K: 1598.85, a: 0.190, b: 13,  c: 0.898 },
  'salvador':        { K: 1318.90, a: 0.145, b: 8,   c: 0.831 },
  'recife':          { K: 1759.70, a: 0.155, b: 9,   c: 0.875 },
};

function atualizarCoeficientesIDF() {
  const cidade = document.getElementById('idf-cidade').value;
  const coefs  = IDF_CIDADES[cidade];
  if (!coefs) return;
  document.getElementById('idf-k').textContent = coefs.K;
  document.getElementById('idf-a').textContent = coefs.a;
  document.getElementById('idf-b').textContent = coefs.b;
  document.getElementById('idf-c').textContent = coefs.c;
}

function calcularMetodoRacional() {
  const C = parseFloat(document.getElementById('rc-c').value);
  const i = parseFloat(document.getElementById('rc-i').value);   // mm/h
  const A = parseFloat(document.getElementById('rc-a').value);   // ha

  const el = document.getElementById('resultado-racional');

  if (!C || !i || !A || i <= 0 || A <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores válidos.');
    return;
  }

  // Q = C × i × A / 360    (Q em m³/s, i em mm/h, A em ha)
  const Q     = (C * i * A) / 360;   // m³/s
  const QLs   = Q * 1000;             // L/s

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Método Racional</h4>
    <div class="result-main">
      <div><div class="label">Vazão de projeto Q</div><div class="value">${QLs.toFixed(3)} L/s</div></div>
      <span class="result-badge ok">&#10003; Calculado</span>
    </div>
    <table class="result-table">
      <tr><td>Coeficiente de escoamento C</td><td>${C}</td></tr>
      <tr><td>Intensidade de chuva i</td><td>${i} mm/h</td></tr>
      <tr><td>Área de contribuição A</td><td>${A} ha (${(A * 10000).toFixed(0)} m²)</td></tr>
      <tr><td>Vazão de projeto Q</td><td><strong>${QLs.toFixed(3)} L/s (${Q.toFixed(5)} m³/s)</strong></td></tr>
    </table>
    <p class="status-msg">Fórmula: Q = C × i × A / 360 — Método Racional (válido para A ≤ 2 km²)</p>`;
}

function calcularIntensidadeIDF() {
  const cidade = document.getElementById('idf-cidade').value;
  const TR     = parseFloat(document.getElementById('idf-tr').value);
  const tc     = parseFloat(document.getElementById('idf-tc').value);  // min

  const el = document.getElementById('resultado-idf');
  const coefs = IDF_CIDADES[cidade];

  if (!coefs) { mostrarErro(el, 'Cidade não encontrada.'); return; }
  if (!TR || !tc || tc < 5) {
    mostrarErro(el, 'Tempo de concentração mínimo: 5 minutos (NBR 10844).');
    return;
  }

  // i = K × TR^a / (tc + b)^c
  const i = (coefs.K * Math.pow(TR, coefs.a)) / Math.pow(tc + coefs.b, coefs.c);

  // Nome da cidade
  const nomes = {
    'sao-paulo': 'São Paulo — SP', 'rio-de-janeiro': 'Rio de Janeiro — RJ',
    'belo-horizonte': 'Belo Horizonte — MG', 'curitiba': 'Curitiba — PR',
    'porto-alegre': 'Porto Alegre — RS', 'salvador': 'Salvador — BA', 'recife': 'Recife — PE',
  };

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Intensidade de Chuva IDF</h4>
    <div class="result-main">
      <div><div class="label">Intensidade i</div><div class="value">${i.toFixed(2)} mm/h</div></div>
      <span class="result-badge ok">&#10003; Calculado</span>
    </div>
    <table class="result-table">
      <tr><td>Cidade</td><td>${nomes[cidade]}</td></tr>
      <tr><td>Período de retorno TR</td><td>${TR} anos</td></tr>
      <tr><td>Tempo de concentração tc</td><td>${tc} min</td></tr>
      <tr><td>K</td><td>${coefs.K}</td></tr>
      <tr><td>a</td><td>${coefs.a}</td></tr>
      <tr><td>b</td><td>${coefs.b}</td></tr>
      <tr><td>c</td><td>${coefs.c}</td></tr>
      <tr><td>Intensidade de chuva i</td><td><strong>${i.toFixed(2)} mm/h</strong></td></tr>
    </table>
    <p class="status-msg">Use este valor de intensidade no Método Racional para calcular a vazão de projeto.</p>`;
}

function calcularTubulacaoPluvial() {
  const Q = parseFloat(document.getElementById('tp-vazao').value);        // L/s
  const I = parseFloat(document.getElementById('tp-declividade').value);  // m/m
  const n = parseFloat(document.getElementById('tp-n').value);

  const el = document.getElementById('resultado-tubo-pluvial');

  if (!Q || !I || Q <= 0 || I <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Manning para tubo cheio: D = [ Q·n / (0,3117·I^0,5) ]^(3/8)
  const Qm3s = Q / 1000;
  const D    = Math.pow((Qm3s * n) / (0.3117 * Math.sqrt(I)), 3 / 8);  // m
  const Dmm  = D * 1000;

  // Diâmetros comerciais para drenagem (mm)
  const dnList = [200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1200, 1500];
  const DN = dnList.find(d => d >= Dmm) || dnList[dnList.length - 1];

  // Verificar velocidade no DN adotado (seção cheia)
  const Dn = DN / 1000;
  const V  = (1 / n) * Math.pow(Dn / 4, 2 / 3) * Math.sqrt(I);
  const Vcheio = V;

  // Verificar lâmina real no DN adotado
  const Qcheio = (1 / n) * (Math.PI * Dn * Dn / 4) * Math.pow(Dn / 4, 2 / 3) * Math.sqrt(I);
  const lamRel = (Qm3s / Qcheio);  // Q/Qcheio

  const vOk = V >= 0.75 && V <= 5.0;

  el.className = `resultado resultado-${vOk ? 'ok' : 'aviso'}`;
  el.innerHTML = `
    <h4>Resultados — Tubulação Pluvial</h4>
    <div class="result-main">
      <div><div class="label">Diâmetro nominal adotado</div><div class="value">DN ${DN} mm</div></div>
      <span class="result-badge ${vOk ? 'ok' : 'aviso'}">${vOk ? '&#10003; OK' : '&#9888; Verificar velocidade'}</span>
    </div>
    <table class="result-table">
      <tr><td>Vazão de projeto Q</td><td>${Q} L/s</td></tr>
      <tr><td>Declividade I</td><td>${(I*1000).toFixed(2)} ‰</td></tr>
      <tr><td>Coeficiente n (Manning)</td><td>${n}</td></tr>
      <tr><td>Diâmetro teórico calculado</td><td>${Dmm.toFixed(1)} mm</td></tr>
      <tr><td>Diâmetro nominal adotado</td><td><strong>DN ${DN} mm</strong></td></tr>
      <tr><td>Capacidade máx. (seção cheia)</td><td>${(Qcheio * 1000).toFixed(2)} L/s</td></tr>
      <tr><td>Lâmina relativa Q/Qcheio</td><td>${(lamRel * 100).toFixed(1)} %</td></tr>
      <tr><td>Velocidade (seção cheia)</td><td>${Vcheio.toFixed(3)} m/s ${vOk ? '&#10003;' : '&#9888;'}</td></tr>
    </table>
    <p class="status-msg">NBR 10844: V_min = 0,75 m/s | V_max = 5,0 m/s para escoamento em pressão.</p>`;
}
