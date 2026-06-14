// Cálculos de Abastecimento de Água — NBR 5626

function calcularDemandaAgua() {
  const habitantes = parseFloat(document.getElementById('num-habitantes').value);
  const perCapita  = parseFloat(document.getElementById('consumo-per-capita').value);
  const incendio   = parseFloat(document.getElementById('reserva-incendio').value) || 0;

  const el = document.getElementById('resultado-demanda-agua');

  if (!habitantes || !perCapita || habitantes <= 0 || perCapita <= 0) {
    mostrarErro(el, 'Preencha todos os campos obrigatórios com valores válidos.');
    return;
  }

  const consumoDiario     = habitantes * perCapita;          // L/dia
  const consumoMensal     = consumoDiario * 30;              // L/mês
  const reservatorioMin   = consumoDiario * 1.5;             // volume reservatório (1,5 dias)
  const reservatorioTotal = reservatorioMin + incendio;      // L
  const vazaoMedia        = consumoDiario / 86400;           // L/s (Q médio diário)
  const vazaoMax          = vazaoMedia * 1.20 * 1.50;        // Q máx horário (K1=1,2; K2=1,5)

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Demanda de Água</h4>
    <div class="result-main">
      <div><div class="label">Consumo diário total</div><div class="value">${fmt(consumoDiario)} L/dia</div></div>
      <span class="result-badge ok">&#10003; Calculado</span>
    </div>
    <table class="result-table">
      <tr><td>Habitantes</td><td>${habitantes} hab</td></tr>
      <tr><td>Consumo per capita</td><td>${perCapita} L/hab·dia</td></tr>
      <tr><td>Consumo mensal estimado</td><td>${fmt(consumoMensal)} L/mês</td></tr>
      <tr><td>Volume mínimo do reservatório (1,5 dias)</td><td>${fmt(reservatorioMin)} L</td></tr>
      ${incendio > 0 ? `<tr><td>Reserva de incêndio</td><td>${fmt(incendio)} L</td></tr>` : ''}
      <tr><td>Volume total do reservatório</td><td><strong>${fmt(reservatorioTotal)} L (${(reservatorioTotal/1000).toFixed(2)} m³)</strong></td></tr>
      <tr><td>Vazão média diária</td><td>${vazaoMedia.toFixed(4)} L/s</td></tr>
      <tr><td>Vazão máx. horária (K1·K2)</td><td>${vazaoMax.toFixed(4)} L/s</td></tr>
    </table>`;
}

function calcularDiametroAgua() {
  const Q = parseFloat(document.getElementById('vazao-agua').value);       // L/s
  const V = parseFloat(document.getElementById('velocidade-agua').value);  // m/s

  const el = document.getElementById('resultado-diametro-agua');

  if (!Q || !V || Q <= 0 || V <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Q = V × A  →  A = Q/V  →  D = 2√(A/π)
  const Qm3s = Q / 1000;          // m³/s
  const A    = Qm3s / V;          // m²
  const D    = 2 * Math.sqrt(A / Math.PI);  // m
  const Dmm  = D * 1000;          // mm

  // Verificar velocidade
  const vMin = 0.6, vMax = 3.0;
  let status = 'ok', statusMsg = '';
  if (V < vMin) { status = 'aviso'; statusMsg = `Velocidade abaixo do mínimo recomendado (${vMin} m/s). Risco de sedimentação.`; }
  else if (V > vMax) { status = 'erro'; statusMsg = `Velocidade acima do máximo permitido (${vMax} m/s). Risco de ruídos e golpe de aríete.`; }
  else { statusMsg = 'Velocidade dentro dos limites NBR 5626 (0,6 a 3,0 m/s).'; }

  // Diâmetros comerciais PVC (mm)
  const comerciais = [20, 25, 32, 40, 50, 60, 75, 85, 100, 110, 125, 150, 200];
  const Dnom = comerciais.find(d => d >= Dmm) || comerciais[comerciais.length - 1];

  el.className = `resultado resultado-${status}`;
  el.innerHTML = `
    <h4>Resultados — Diâmetro da Tubulação</h4>
    <div class="result-main">
      <div><div class="label">Diâmetro calculado</div><div class="value">${Dmm.toFixed(1)} mm</div></div>
      <span class="result-badge ${status}">${status === 'ok' ? '&#10003; OK' : status === 'aviso' ? '&#9888; Atenção' : '&#10007; Erro'}</span>
    </div>
    <table class="result-table">
      <tr><td>Vazão de projeto Q</td><td>${Q} L/s (${Qm3s.toFixed(5)} m³/s)</td></tr>
      <tr><td>Velocidade V</td><td>${V} m/s</td></tr>
      <tr><td>Área da seção transversal A</td><td>${(A * 10000).toFixed(4)} cm²</td></tr>
      <tr><td>Diâmetro teórico</td><td>${Dmm.toFixed(2)} mm</td></tr>
      <tr><td>Diâmetro nominal comercial recomendado</td><td><strong>DN ${Dnom} mm</strong></td></tr>
    </table>
    <p class="status-msg">${statusMsg}</p>`;
}

function calcularHazenWilliams() {
  const Q = parseFloat(document.getElementById('hw-vazao').value);       // L/s
  const D = parseFloat(document.getElementById('hw-diametro').value);    // mm
  const L = parseFloat(document.getElementById('hw-comprimento').value); // m
  const C = parseFloat(document.getElementById('hw-c').value);

  const el = document.getElementById('resultado-hazen');

  if (!Q || !D || !L || Q <= 0 || D <= 0 || L <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Hazen-Williams: V = 0,8492 × C × R^0,63 × J^0,54  (SI)
  // Para tubo cheio circular: R = D/4 (m)
  // Reorganizando: J = (Q / (0,2785 × C × D^2.63))^(1/0.54)  onde Q em m³/s, D em m
  const Qm3s = Q / 1000;
  const Dm   = D / 1000;

  const J = Math.pow(Qm3s / (0.2785 * C * Math.pow(Dm, 2.63)), 1 / 0.54); // m/m
  const hf = J * L;          // m.c.a
  const V  = Qm3s / (Math.PI * Dm * Dm / 4);  // m/s

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Perda de Carga (Hazen-Williams)</h4>
    <div class="result-main">
      <div><div class="label">Perda de carga total</div><div class="value">${hf.toFixed(3)} m.c.a</div></div>
      <span class="result-badge ok">&#10003; Calculado</span>
    </div>
    <table class="result-table">
      <tr><td>Vazão Q</td><td>${Q} L/s</td></tr>
      <tr><td>Diâmetro interno D</td><td>${D} mm</td></tr>
      <tr><td>Comprimento L</td><td>${L} m</td></tr>
      <tr><td>Coeficiente C (H-W)</td><td>${C}</td></tr>
      <tr><td>Velocidade de escoamento</td><td>${V.toFixed(3)} m/s</td></tr>
      <tr><td>Gradiente hidráulico J</td><td>${(J * 1000).toFixed(4)} ‰ (${J.toFixed(6)} m/m)</td></tr>
      <tr><td>Perda de carga distribuída hf</td><td><strong>${hf.toFixed(3)} m.c.a</strong></td></tr>
    </table>`;
}
