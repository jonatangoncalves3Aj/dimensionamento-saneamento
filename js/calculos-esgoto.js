// Cálculos de Esgotamento Sanitário — NBR 9649

function calcularVazaoEsgoto() {
  const hab    = parseFloat(document.getElementById('esg-habitantes').value);
  const qpc    = parseFloat(document.getElementById('esg-consumo').value);
  const c1     = parseFloat(document.getElementById('esg-coef-retorno').value) / 100;
  const k1     = parseFloat(document.getElementById('esg-k1').value);
  const k2     = parseFloat(document.getElementById('esg-k2').value);

  const el = document.getElementById('resultado-vazao-esgoto');

  if (!hab || !qpc || hab <= 0 || qpc <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores válidos.');
    return;
  }

  // Q médio = hab × qpc × C1 / 86400  (L/s)
  const qMedio = (hab * qpc * c1) / 86400;
  // Q máximo = Q_med × K1 × K2
  const qMax   = qMedio * k1 * k2;
  // Q mínimo = Q_med × K1 / K2  (aproximação NBR 9649)
  const qMin   = qMedio * k1 / k2;

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Vazão de Esgoto</h4>
    <div class="result-main">
      <div><div class="label">Vazão máxima de projeto</div><div class="value">${qMax.toFixed(4)} L/s</div></div>
      <span class="result-badge ok">&#10003; Calculado</span>
    </div>
    <table class="result-table">
      <tr><td>Habitantes</td><td>${hab} hab</td></tr>
      <tr><td>Contribuição per capita de água</td><td>${qpc} L/hab·dia</td></tr>
      <tr><td>Coeficiente de retorno C1</td><td>${(c1*100).toFixed(0)} %</td></tr>
      <tr><td>K1 (variação diária)</td><td>${k1}</td></tr>
      <tr><td>K2 (variação horária)</td><td>${k2}</td></tr>
      <tr><td>Vazão média de esgoto Q_med</td><td>${qMedio.toFixed(5)} L/s</td></tr>
      <tr><td>Vazão mínima Q_min</td><td>${qMin.toFixed(5)} L/s</td></tr>
      <tr><td>Vazão máxima de projeto Q_max</td><td><strong>${qMax.toFixed(5)} L/s</strong></td></tr>
    </table>`;
}

function calcularManning() {
  const Q    = parseFloat(document.getElementById('mn-vazao').value);         // L/s
  const I    = parseFloat(document.getElementById('mn-declividade').value);   // m/m
  const n    = parseFloat(document.getElementById('mn-n').value);
  const lam  = parseFloat(document.getElementById('mn-lam-max').value);       // fração de D

  const el = document.getElementById('resultado-manning');

  if (!Q || !I || Q <= 0 || I <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Manning para tubo circular cheio: Q = (1/n) × A × R^(2/3) × I^(1/2)
  // Tubo cheio: A = π·D²/4, R = D/4
  // Q = (1/n) × (π·D²/4) × (D/4)^(2/3) × I^(1/2)
  // Isolando D:
  // D = [ Q × n / (0,3117 × I^0.5) ]^(3/8)    (Q em m³/s, D em m)
  const Qm3s = Q / 1000;
  // Correção para lâmina < 1 (lam < 100% D): aumenta D pelo fator empírico
  // Solução iterativa simples: calcular D para tubo cheio e depois verificar
  const Dcheio = Math.pow((Qm3s * n) / (0.3117 * Math.sqrt(I)), 3 / 8);

  // Para lâmina parcial, usar fator de correção iterativo
  // Usar a relação: Q_parcial / Q_cheio = f(y/D)
  // Aproximação: Q @ lam·D ≈ Q_cheio × phi(lam)
  // phi(0.75) ≈ 0.919, phi(0.80) ≈ 0.952, phi(0.50) ≈ 0.500
  const phi = calcularPhiManning(lam);
  // D necessário para que Q_cheio × phi = Q_projeto
  const Qcheio = Qm3s / phi;
  const D = Math.pow((Qcheio * n) / (0.3117 * Math.sqrt(I)), 3 / 8);
  const Dmm = D * 1000;

  // Diâmetros nominais de esgoto (mm)
  const dnList = [100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
  const DN = dnList.find(d => d >= Dmm) || dnList[dnList.length - 1];

  // Calcular velocidade no tubo escolhido (lâmina máx)
  const Dn = DN / 1000;
  const Qcheio_dn = (1 / n) * (Math.PI * Dn * Dn / 4) * Math.pow(Dn / 4, 2 / 3) * Math.sqrt(I);
  const lamY = (Qm3s / Qcheio_dn);   // razão Q/Qcheio
  const V_lam = calcularVelocidadeManning(lamY, n, Dn, I);

  const vOk = V_lam >= 0.6 && V_lam <= 5.0;

  el.className = `resultado resultado-${vOk ? 'ok' : 'aviso'}`;
  el.innerHTML = `
    <h4>Resultados — Manning (Esgoto)</h4>
    <div class="result-main">
      <div><div class="label">Diâmetro nominal adotado</div><div class="value">DN ${DN} mm</div></div>
      <span class="result-badge ${vOk ? 'ok' : 'aviso'}">${vOk ? '&#10003; OK' : '&#9888; Verificar velocidade'}</span>
    </div>
    <table class="result-table">
      <tr><td>Vazão de projeto Q</td><td>${Q} L/s</td></tr>
      <tr><td>Declividade I</td><td>${(I*1000).toFixed(2)} ‰ (${I} m/m)</td></tr>
      <tr><td>Coef. rugosidade n (Manning)</td><td>${n}</td></tr>
      <tr><td>Lâmina máxima admitida</td><td>${(lam*100).toFixed(0)} %·D</td></tr>
      <tr><td>Diâmetro teórico necessário</td><td>${Dmm.toFixed(1)} mm</td></tr>
      <tr><td>Diâmetro nominal adotado</td><td><strong>DN ${DN} mm</strong></td></tr>
      <tr><td>Velocidade estimada na lâmina máx</td><td>${V_lam.toFixed(3)} m/s ${vOk ? '' : '⚠ fora do limite'}</td></tr>
    </table>
    <p class="status-msg">NBR 9649: V_min = 0,6 m/s | V_max = 5,0 m/s | Lâmina máx = 75 % D</p>`;
}

function calcularPhiManning(lam) {
  // Razão Q_parcial / Q_cheio para seção circular usando equação de Manning
  // phi = (A_p/A_c) × (R_p/R_c)^(2/3)
  const theta = 2 * Math.acos(1 - 2 * lam);     // ângulo central (rad)
  const Ap_Ac = (theta - Math.sin(theta)) / (2 * Math.PI);
  const Rp_Rc = (1 - Math.sin(theta) / theta);
  return Ap_Ac * Math.pow(Rp_Rc, 2 / 3);
}

function calcularVelocidadeManning(qRatio, n, D, I) {
  // Velocidade para seção parcialmente cheia
  // V = (1/n) × R^(2/3) × I^(1/2) onde R = A/P
  // Usando qRatio = Q/Q_cheio → obter theta pela bisseção
  const theta = biseccaoTheta(qRatio);
  const A = (D * D / 8) * (theta - Math.sin(theta));
  const P = D * theta / 2;
  const R = A / P;
  return (1 / n) * Math.pow(R, 2 / 3) * Math.sqrt(I);
}

function biseccaoTheta(qRatio) {
  let lo = 0.01, hi = 2 * Math.PI - 0.01;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const f = (mid - Math.sin(mid)) / (2 * Math.PI);
    if (f < qRatio) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function calcularDeclividade() {
  const DN    = parseFloat(document.getElementById('dc-diametro').value);  // mm
  const n     = parseFloat(document.getElementById('dc-n').value);
  const Q     = parseFloat(document.getElementById('dc-vazao').value);     // L/s

  const el = document.getElementById('resultado-declividade');

  if (!DN || !n || !Q || DN <= 0 || n <= 0 || Q <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  const D = DN / 1000;  // m
  const Qm3s = Q / 1000;

  // Declividade mínima NBR 9649: Imin = 0.0055 × Qmin^(-0.47)  (Qmin em L/s, com Q mín ≈ 1,5 L/s se Q > 1,5)
  // Fórmula direta NBR 9649: Imin (‰) = 0,55 / D^(5/3) × Q^(-0,47) — usando D em m, Q em L/s
  // Simplificação comum: Imin (m/m) = 0,0055 × Q^-0,47   para Q em L/s
  const Qmin_ref = Math.max(Q, 1.5);
  const Imin = 0.0055 * Math.pow(Qmin_ref, -0.47);

  // Verificar velocidade a 50% D (Manning — lâmina 50%)
  const lam50 = 0.50;
  const phi50 = calcularPhiManning(lam50);
  const Qcheio = Qm3s / phi50;
  const I_necessaria = Math.pow(Qcheio * n / (0.3117 * Math.pow(D, 8/3)), 2);

  // Verificar velocidade mínima @ lâmina máx 75%
  const Vcrit = (1 / n) * Math.pow(D / 4, 2 / 3) * Math.sqrt(Imin);  // velocidade à seção cheia com Imin
  const Vtube = (1 / n) * Math.pow(D / 4, 2 / 3) * Math.sqrt(I_necessaria);

  const IminPorMil = (Imin * 1000).toFixed(3);
  const vOk = Vcrit >= 0.6;

  el.className = `resultado resultado-${vOk ? 'ok' : 'aviso'}`;
  el.innerHTML = `
    <h4>Resultados — Declividade e Velocidades</h4>
    <div class="result-main">
      <div><div class="label">Declividade mínima NBR 9649</div><div class="value">${IminPorMil} ‰</div></div>
      <span class="result-badge ${vOk ? 'ok' : 'aviso'}">${vOk ? '&#10003; V_min OK' : '&#9888; Verificar V_min'}</span>
    </div>
    <table class="result-table">
      <tr><td>Diâmetro nominal DN</td><td>${DN} mm</td></tr>
      <tr><td>Coeficiente n (Manning)</td><td>${n}</td></tr>
      <tr><td>Vazão de projeto</td><td>${Q} L/s</td></tr>
      <tr><td>Declividade mínima (NBR 9649)</td><td><strong>${Imin.toFixed(6)} m/m (${IminPorMil} ‰)</strong></td></tr>
      <tr><td>Declividade necessária (Q = 50% D)</td><td>${(I_necessaria * 1000).toFixed(3)} ‰</td></tr>
      <tr><td>Velocidade crítica (seção cheia, Imin)</td><td>${Vcrit.toFixed(3)} m/s ${vOk ? '&#10003;' : '&#9888;'}</td></tr>
      <tr><td>Velocidade (decl. necessária)</td><td>${Vtube.toFixed(3)} m/s</td></tr>
    </table>
    <p class="status-msg">NBR 9649: declividade mínima garante V ≥ 0,6 m/s para autolimpeza.</p>`;
}
