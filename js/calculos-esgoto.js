// Cálculos de Esgotamento Sanitário — NBR 9649

function calcularVazaoEsgoto() {
  const habitantes  = parseFloat(document.getElementById('esg-habitantes').value);
  const consumo     = parseFloat(document.getElementById('esg-consumo').value);
  const retorno     = parseFloat(document.getElementById('esg-coef-retorno').value) / 100;
  const K1          = parseFloat(document.getElementById('esg-k1').value);
  const K2          = parseFloat(document.getElementById('esg-k2').value);

  const el = document.getElementById('resultado-vazao-esgoto');

  if (!habitantes || !consumo || !retorno || !K1 || !K2 ||
      habitantes <= 0 || consumo <= 0 || retorno <= 0 || K1 <= 0 || K2 <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Vazão média de esgoto (L/s)
  // Qmed = (habitantes × consumo_per_capita × C1) / 86400
  const Qmed = (habitantes * consumo * retorno) / 86400;  // L/s

  // Vazão de contribuição de infiltração (NBR 9649: 0,05 L/s por km de rede por mm de DN)
  // Adota-se valor típico de 0,0001 L/s por habitante para estimativa simplificada
  const Qinf = habitantes * 0.0001;  // L/s (estimativa)

  // Vazão máxima de projeto
  const Qmax = Qmed * K1 * K2 + Qinf;  // L/s

  // Vazão mínima (NBR 9649: 1,5 L/s mínimo para ramais prediais)
  const Qmin = Math.max(Qmax * 0.2, 1.5);  // L/s

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Vazão de Esgoto</h4>
    <div class="result-main">
      <div><div class="label">Vazão máxima de projeto</div><div class="value">${fmt(Qmax)} L/s</div></div>
      <span class="result-badge ok">&#10003; NBR 9649</span>
    </div>
    <table class="result-table">
      <tr><td>Número de habitantes</td><td>${habitantes} hab</td></tr>
      <tr><td>Consumo per capita de água</td><td>${consumo} L/hab·dia</td></tr>
      <tr><td>Coeficiente de retorno C1</td><td>${(retorno * 100).toFixed(0)}%</td></tr>
      <tr><td>Coef. variação diária K1</td><td>${K1}</td></tr>
      <tr><td>Coef. variação horária K2</td><td>${K2}</td></tr>
      <tr><td>Vazão média de esgoto</td><td>${Qmed.toFixed(4)} L/s</td></tr>
      <tr><td>Vazão de infiltração estimada</td><td>${Qinf.toFixed(4)} L/s</td></tr>
      <tr><td>Vazão máxima (K1 × K2 + Qinf)</td><td><strong>${fmt(Qmax)} L/s</strong></td></tr>
      <tr><td>Vazão mínima adotada</td><td>${fmt(Qmin)} L/s</td></tr>
    </table>
    <p class="status-msg">&#9432; Vazão de projeto = Qméd × K1 × K2 + Qinf (NBR 9649 §6.3).</p>`;
}

function calcularManning() {
  const Q  = parseFloat(document.getElementById('mn-vazao').value);         // L/s
  const I  = parseFloat(document.getElementById('mn-declividade').value);   // m/m
  const n  = parseFloat(document.getElementById('mn-n').value);
  const yl = parseFloat(document.getElementById('mn-lam-max').value);        // fração de D

  const el = document.getElementById('resultado-manning');

  if (!Q || !I || !n || Q <= 0 || I <= 0 || n <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Fórmula de Manning para seção circular em regime de lâmina parcial
  // Para seção plena: Q = (1/n) × A × R^(2/3) × I^(1/2)
  // Para seção circular plena: A = π×D²/4, R = D/4
  // Q_plena = (1/n) × (π×D²/4) × (D/4)^(2/3) × I^(1/2)
  //
  // A NBR 9649 admite lâmina máxima de 0,75D.
  // Para y/D = 0,75: Q_lam / Q_plena ≈ 0,967 (tabela hidráulica)
  // Portanto: Q_proj = Q_lam = Q, e Q_plena = Q / 0,967
  //
  // Resolvendo para D (seção plena):
  // Q_plena = (1/n) × (π/4) × D^(8/3) / 4^(2/3) × I^(1/2)
  // D^(8/3) = Q_plena × n × 4^(2/3) / ((π/4) × I^(1/2))
  // D = [Q_plena × n × 4^(2/3) / ((π/4) × I^(1/2))]^(3/8)

  // Relação Q_lam/Q_plena para y/D (tabela hidráulica aproximada por interpolação)
  const ratioQ = relacaoQManning(yl);

  const Qm3s       = Q / 1000;             // m³/s
  const Q_plena    = Qm3s / ratioQ;        // m³/s (seção plena equivalente)

  const D_calc = Math.pow(
    (Q_plena * n * Math.pow(4, 2/3)) / ((Math.PI / 4) * Math.pow(I, 0.5)),
    3 / 8
  );  // m
  const D_mm = D_calc * 1000;

  // Diâmetros comerciais de esgoto (NBR — PVC/concreto)
  const diametros = [100, 150, 200, 250, 300, 350, 400, 500, 600, 700, 800];
  const DN = diametros.find(d => d >= D_mm) || diametros[diametros.length - 1];

  // Verificação da velocidade com DN adotado (seção plena)
  const D_adot = DN / 1000;
  const A_plena = Math.PI * D_adot * D_adot / 4;
  const R_plena = D_adot / 4;
  const V_plena = (1 / n) * Math.pow(R_plena, 2/3) * Math.pow(I, 0.5);  // m/s

  // Velocidade na lâmina máxima (aproximação: V_lam ≈ V_plena × 1.08 para y/D=0,75)
  const ratioV  = relacaoVManning(yl);
  const V_lam   = V_plena * ratioV;

  // Critérios NBR 9649: Vmin = 0,6 m/s; Vmax = 5,0 m/s
  let status = 'ok', msgs = [];
  if (V_lam < 0.6) { status = 'aviso'; msgs.push('&#9888; Velocidade na lâmina ('+V_lam.toFixed(2)+' m/s) abaixo de 0,6 m/s — risco de deposição (NBR 9649 §5.2).'); }
  if (V_lam > 5.0) { status = 'erro';  msgs.push('&#9888; Velocidade na lâmina ('+V_lam.toFixed(2)+' m/s) acima de 5,0 m/s — risco de erosão (NBR 9649 §5.2).'); }
  if (msgs.length === 0) msgs.push('&#10003; Velocidade dentro dos limites NBR 9649 (0,6 – 5,0 m/s).');

  el.className = `resultado resultado-${status}`;
  el.innerHTML = `
    <h4>Resultados — Manning (NBR 9649)</h4>
    <div class="result-main">
      <div><div class="label">Diâmetro calculado</div><div class="value">${D_mm.toFixed(1)} mm</div></div>
      <div><div class="label">DN comercial adotado</div><div class="value">DN ${DN} mm</div></div>
    </div>
    <table class="result-table">
      <tr><td>Vazão de projeto Q</td><td>${Q} L/s</td></tr>
      <tr><td>Declividade I</td><td>${I} m/m (${(I*1000).toFixed(2)} ‰)</td></tr>
      <tr><td>Coeficiente n (Manning)</td><td>${n}</td></tr>
      <tr><td>Lâmina máxima adotada</td><td>${(yl*100).toFixed(0)}% de D</td></tr>
      <tr><td>Relação Q_lam / Q_plena</td><td>${ratioQ.toFixed(3)}</td></tr>
      <tr><td>Diâmetro mínimo calculado</td><td>${D_mm.toFixed(2)} mm</td></tr>
      <tr><td>DN comercial adotado</td><td><strong>DN ${DN} mm</strong></td></tr>
      <tr><td>Velocidade a seção plena</td><td>${V_plena.toFixed(3)} m/s</td></tr>
      <tr><td>Velocidade na lâmina (${(yl*100).toFixed(0)}%D)</td><td><strong>${V_lam.toFixed(3)} m/s</strong></td></tr>
    </table>
    <p class="status-msg">${msgs.join('<br>')}</p>`;
}

function calcularDeclividade() {
  const DN    = parseFloat(document.getElementById('dc-diametro').value);   // mm
  const n     = parseFloat(document.getElementById('dc-n').value);
  const Q     = parseFloat(document.getElementById('dc-vazao').value);       // L/s

  const el = document.getElementById('resultado-declividade');

  if (!DN || !n || !Q || DN <= 0 || n <= 0 || Q <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  const D = DN / 1000;  // m

  // NBR 9649 — Declividade mínima: Imin = 0,0055 × D^(-0,467) (m/m)
  const Imin_formula = 0.0055 * Math.pow(D, -0.467);  // m/m

  // Alternativa: declividade mínima que garante V >= 0,6 m/s (seção plena)
  // V = (1/n) × R^(2/3) × I^(1/2) → I = (V × n / R^(2/3))^2
  const R = D / 4;
  const Imin_v06 = Math.pow((0.6 * n) / Math.pow(R, 2/3), 2);  // m/m

  const Imin = Math.max(Imin_formula, Imin_v06);

  // Velocidade a seção plena com declividade mínima adotada
  const A_plena = Math.PI * D * D / 4;
  const V_plena_min = (1 / n) * Math.pow(R, 2/3) * Math.pow(Imin, 0.5);

  // Velocidade de projeto (lâmina 75%D, relação aprox. 1,08)
  const yl_75 = 0.75;
  const ratioV_75 = relacaoVManning(yl_75);
  const V_lam_min  = V_plena_min * ratioV_75;

  // Velocidade com Q de projeto (verificação)
  const Qm3s = Q / 1000;
  const Q_plena_proj = Qm3s / relacaoQManning(yl_75);

  // Verifica se Q cabe no tubo com a declividade mínima
  const Q_plena_cap = A_plena * (1/n) * Math.pow(R, 2/3) * Math.pow(Imin, 0.5);
  const Q_75_cap    = Q_plena_cap * relacaoQManning(yl_75);

  let statusCap = 'ok', msgCap = '';
  if (Q > Q_75_cap * 1000) {
    statusCap = 'erro';
    msgCap = `&#9888; Tubulação DN ${DN} mm com declividade mínima não comporta a vazão de projeto (capacidade = ${fmt(Q_75_cap * 1000)} L/s). Aumente o DN ou a declividade.`;
  } else {
    msgCap = `&#10003; DN ${DN} mm comporta até ${fmt(Q_75_cap * 1000)} L/s — capacidade suficiente para Q = ${fmt(Q)} L/s.`;
  }

  el.className = `resultado resultado-${statusCap}`;
  el.innerHTML = `
    <h4>Resultados — Declividade Mínima e Velocidades</h4>
    <div class="result-main">
      <div><div class="label">Declividade mínima</div><div class="value">${(Imin*1000).toFixed(2)} ‰</div></div>
      <span class="result-badge ${statusCap === 'ok' ? 'ok' : 'erro'}">${statusCap === 'ok' ? '&#10003; OK' : '&#10007; Insuficiente'}</span>
    </div>
    <table class="result-table">
      <tr><td>Diâmetro nominal DN</td><td>${DN} mm</td></tr>
      <tr><td>Coeficiente n (Manning)</td><td>${n}</td></tr>
      <tr><td>Raio hidráulico (seção plena)</td><td>${(R*1000).toFixed(2)} mm</td></tr>
      <tr><td>Declividade mínima — fórmula NBR 9649</td><td>${(Imin_formula*1000).toFixed(3)} ‰</td></tr>
      <tr><td>Declividade mínima — V ≥ 0,6 m/s</td><td>${(Imin_v06*1000).toFixed(3)} ‰</td></tr>
      <tr><td>Declividade mínima adotada</td><td><strong>${(Imin*1000).toFixed(3)} ‰ (${Imin.toFixed(6)} m/m)</strong></td></tr>
      <tr><td>Velocidade seção plena (Imin)</td><td>${V_plena_min.toFixed(3)} m/s</td></tr>
      <tr><td>Velocidade na lâmina 75%D</td><td>${V_lam_min.toFixed(3)} m/s</td></tr>
      <tr><td>Capacidade máxima (lâmina 75%D)</td><td>${fmt(Q_75_cap * 1000)} L/s</td></tr>
      <tr><td>Vazão de projeto</td><td>${fmt(Q)} L/s</td></tr>
    </table>
    <p class="status-msg">${msgCap}</p>
    <p class="status-msg">Critérios NBR 9649: V<sub>min</sub> = 0,6 m/s; V<sub>máx</sub> = 5,0 m/s; lâmina máxima = 0,75D.</p>`;
}

/* ============================================================
   Funções auxiliares — relações hidráulicas para seção circular

/**
 * Relação Q_parcial / Q_plena em função de y/D para seção circular.
 * Usa equações analíticas da geometria circular.
 * @param {number} yl - lâmina relativa y/D (0 a 1)
 * @returns {number}
 */
function relacaoQManning(yl) {
  if (yl <= 0) return 0;
  if (yl >= 1) return 1;
  // Ângulo θ (radianos) correspondente à lâmina y = yl × D
  // cos(θ/2) = 1 - 2×y/D  →  θ = 2 × acos(1 - 2×yl)
  const theta = 2 * Math.acos(1 - 2 * yl);
  // Área parcial: A = (D²/8)(θ - sinθ)
  // Raio hidráulico: R = D/4 × (1 - sinθ/θ)
  // Q_parc / Q_plena = (A_parc/A_plena) × (R_parc/R_plena)^(2/3)
  const A_rel = (theta - Math.sin(theta)) / Math.PI;
  const R_parc_rel = (1 - Math.sin(theta) / theta) / (1 / 1); // R_parc / (D/4)
  // R_plena = D/4, R_parc = (D/4)(1 - sin(θ)/θ)
  // R_parc/R_plena = 1 - sin(θ)/θ
  const R_rel = 1 - Math.sin(theta) / theta;
  return A_rel * Math.pow(R_rel, 2/3);
}

/**
 * Relação V_parcial / V_plena em função de y/D para seção circular.
 * @param {number} yl
 * @returns {number}
 */
function relacaoVManning(yl) {
  if (yl <= 0) return 0;
  if (yl >= 1) return 1;
  const theta = 2 * Math.acos(1 - 2 * yl);
  // V_parc/V_plena = (R_parc/R_plena)^(2/3)
  const R_rel = 1 - Math.sin(theta) / theta;
  return Math.pow(R_rel, 2/3);
}

/* ============================================================
   4. TENSÃO TRATIVA — NBR 9649:2024
   ============================================================ */
function calcularTensaoTraiva() {
  const DN    = parseFloat(document.getElementById('tt-dn').value);
  const n_man = parseFloat(document.getElementById('tt-n').value);
  const Q     = parseFloat(document.getElementById('tt-q').value);
  const I     = parseFloat(document.getElementById('tt-i').value);
  const el    = document.getElementById('resultado-tensao-trativa');

  if (!DN || !n_man || !Q || !I || DN <= 0 || I <= 0 || Q <= 0) {
    mostrarErro(el, 'Preencha DN, n, Q e declividade com valores positivos.');
    return;
  }

  const D   = DN / 1000;         // m
  const Qm3 = Q / 1000;          // m³/s

  // Determinar lâmina normal y/D por iteração (bisseção)
  // Q = relacaoQ(yl) × Q_plena
  const Q_plena = (1 / n_man) * (Math.PI * D * D / 4) * Math.pow(D / 4, 2/3) * Math.pow(I, 0.5);

  let yl_norm = 0;
  if (Qm3 >= Q_plena) {
    yl_norm = 1.0;
  } else {
    // Bisseção para encontrar yl tal que relacaoQManning(yl) = Qm3/Q_plena
    const ratio_target = Qm3 / Q_plena;
    let lo = 0, hi = 1;
    for (let iter = 0; iter < 60; iter++) {
      const mid = (lo + hi) / 2;
      if (relacaoQManning(mid) < ratio_target) lo = mid; else hi = mid;
    }
    yl_norm = (lo + hi) / 2;
  }

  // Raio hidráulico parcial
  const theta   = 2 * Math.acos(1 - 2 * yl_norm);
  const R_parc  = (D / 4) * (1 - Math.sin(theta) / theta);   // m

  // Tensão trativa: τ = γ_água × R_h × I   [Pa]  (γ = 9810 N/m³)
  const tau = 9810 * R_parc * I;   // Pa

  const tau_min = 1.0;   // Pa — NBR 9649:2024
  const status  = tau >= tau_min ? 'ok' : 'aviso';

  // Velocidade parcial
  const V_plena = (1 / n_man) * Math.pow(D / 4, 2/3) * Math.pow(I, 0.5);
  const V_parc  = V_plena * relacaoVManning(yl_norm);

  el.className = `resultado resultado-${status}`;
  el.innerHTML = `
    <h4>Resultados — Tensão Trativa (NBR 9649)</h4>
    <div class="result-main">
      <div><div class="label">Tensão trativa τ</div><div class="value">${fmt(tau, 3)} Pa</div></div>
      <span class="result-badge ${status}">${status === 'ok' ? '&#10003; Autolimpeza OK' : '&#9888; Abaixo do mínimo'}</span>
    </div>
    <table class="result-table">
      <tr><td>Diâmetro nominal DN</td><td>${DN} mm</td></tr>
      <tr><td>Coef. n (Manning)</td><td>${n_man}</td></tr>
      <tr><td>Declividade I</td><td>${fmt(I * 1000, 3)} ‰ (${I} m/m)</td></tr>
      <tr><td>Vazão de projeto Q</td><td>${fmt(Q, 4)} L/s</td></tr>
      <tr><td>Vazão a seção plena Q_plena</td><td>${fmt(Q_plena * 1000, 4)} L/s</td></tr>
      <tr><td>Lâmina normal y/D</td><td>${fmt(yl_norm * 100, 1)}% de D = ${fmt(yl_norm * DN, 2)} mm</td></tr>
      <tr><td>Raio hidráulico parcial R_h</td><td>${fmt(R_parc * 1000, 3)} mm = ${fmt(R_parc, 5)} m</td></tr>
      <tr><td>Fórmula: τ = γ × R_h × I</td><td>${fmt(9810)} × ${fmt(R_parc, 5)} × ${I} = <strong>${fmt(tau, 3)} Pa</strong></td></tr>
      <tr><td>Tensão trativa mínima (NBR 9649)</td><td>1,0 Pa</td></tr>
      <tr><td>Velocidade na lâmina normal</td><td>${fmt(V_parc, 3)} m/s</td></tr>
    </table>
    <p class="status-msg">${tau >= tau_min
      ? `&#10003; Tensão trativa (${fmt(tau, 3)} Pa) ≥ 1,0 Pa — critério de autolimpeza atendido (NBR 9649).`
      : `&#9888; Tensão trativa (${fmt(tau, 3)} Pa) < 1,0 Pa — risco de deposição de sedimentos. Aumente a declividade ou reduza o DN.`}</p>`;
}

/* ============================================================
   5. INFILTRAÇÃO NA REDE
   ============================================================ */
function calcularInfiltracao() {
  const taxa  = parseFloat(document.getElementById('inf-taxa').value);   // L/s por km de rede
  const L     = parseFloat(document.getElementById('inf-l').value);      // km
  const QContr= parseFloat(document.getElementById('inf-qcontr').value) || 0;  // L/s (singular)
  const el    = document.getElementById('resultado-infiltracao');

  if (!taxa || !L || taxa <= 0 || L <= 0) {
    mostrarErro(el, 'Informe a taxa de infiltração e o comprimento da rede.');
    return;
  }

  const Q_inf  = taxa * L;         // L/s
  const Q_tot  = Q_inf + QContr;   // L/s

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Infiltração na Rede de Esgoto</h4>
    <div class="result-main">
      <div><div class="label">Q infiltração</div><div class="value">${fmt(Q_inf, 4)} L/s</div></div>
      <div><div class="label">Q total</div><div class="value">${fmt(Q_tot, 4)} L/s</div></div>
    </div>
    <table class="result-table">
      <tr><td>Taxa de infiltração</td><td>${fmt(taxa, 4)} L/s por km de rede</td></tr>
      <tr><td>Extensão da rede</td><td>${fmt(L, 3)} km</td></tr>
      <tr><td>Vazão de infiltração distribuída</td><td>${fmt(Q_inf, 5)} L/s</td></tr>
      <tr><td>Contribuição singular (ligações, etc.)</td><td>${fmt(QContr, 5)} L/s</td></tr>
      <tr><td><strong>Vazão de infiltração total</strong></td><td><strong>${fmt(Q_tot, 5)} L/s</strong></td></tr>
    </table>
    <p class="status-msg">&#9432; NBR 9649: taxa típica de infiltração = 0,05 a 0,5 L/s·km para redes novas; até 1,0 L/s·km para redes antigas. Soma-se à vazão máxima de projeto.</p>`;
}

/* ============================================================
   6. POÇOS DE VISITA E RECOBRIMENTO
   ============================================================ */
function calcularPocoVisita() {
  const DN       = parseFloat(document.getElementById('pv-dn').value);
  const H_coletor= parseFloat(document.getElementById('pv-h').value);     // m profundidade da geratriz
  const local    = document.getElementById('pv-local').value;             // 'via'|'passeio'|'quintal'
  const el       = document.getElementById('resultado-poco-visita');

  if (!DN || !H_coletor) {
    mostrarErro(el, 'Informe o DN e a profundidade da geratriz do coletor.');
    return;
  }

  // Espaçamento máximo entre PVs (NBR 9649 §7.2)
  let espMax = 0;
  if      (DN <= 150) espMax = 100;
  else if (DN <= 250) espMax = 150;
  else if (DN <= 400) espMax = 200;
  else                espMax = 250;

  // Recobrimento mínimo (NBR 9649 §5.6)
  const recMin = { via: 0.90, passeio: 0.65, quintal: 0.60 };
  const recLabel = { via: 'Via (leito carroçável)', passeio: 'Passeio / calçada', quintal: 'Quintal / jardim' };
  const rc_min = recMin[local] || 0.90;

  const H_geratriz = H_coletor + DN / 1000;   // profundidade geratriz inferior = geratriz sup + DN
  const rec_atual  = H_coletor;               // recobrimento = profundidade da geratriz superior
  const status     = rec_atual >= rc_min ? 'ok' : 'erro';

  el.className = `resultado resultado-${status}`;
  el.innerHTML = `
    <h4>Resultados — Poços de Visita (NBR 9649)</h4>
    <div class="result-main">
      <div><div class="label">Espaçamento máximo entre PVs</div><div class="value">${espMax} m</div></div>
      <span class="result-badge ${status}">${status === 'ok' ? '&#10003; Recobrimento OK' : '&#9888; Recobrimento insuficiente'}</span>
    </div>
    <table class="result-table">
      <tr><td>Diâmetro nominal DN</td><td>${DN} mm</td></tr>
      <tr><td>Profundidade da geratriz superior</td><td>${fmt(H_coletor, 2)} m</td></tr>
      <tr><td>Profundidade da geratriz inferior</td><td>${fmt(H_geratriz, 2)} m</td></tr>
      <tr><td>Local de instalação</td><td>${recLabel[local]}</td></tr>
      <tr><td>Recobrimento mínimo (NBR 9649)</td><td>${fmt(rc_min, 2)} m</td></tr>
      <tr><td>Recobrimento atual</td><td>${fmt(rec_atual, 2)} m</td></tr>
      <tr><td>Espaçamento máximo entre PVs</td><td>${espMax} m</td></tr>
    </table>
    <p class="status-msg">${status === 'ok'
      ? `&#10003; Recobrimento de ${fmt(rec_atual, 2)} m ≥ mínimo de ${rc_min} m para ${recLabel[local]}.`
      : `&#9888; Recobrimento insuficiente (${fmt(rec_atual, 2)} m < ${rc_min} m). Aprofundar o coletor ou usar tubo com revestimento especial.`}</p>
    <p class="status-msg">&#9432; PVs devem ser instalados em: mudança de direção, mudança de DN, junção de coletores, início de coletor, e a cada ${espMax} m em alinhamento reto (DN ${DN} mm).</p>`;
}
