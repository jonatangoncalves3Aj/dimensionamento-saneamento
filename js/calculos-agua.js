// Cálculos de Abastecimento de Água — NBR 5626

/* ── Per capita padrão por tipo de edificação (NBR 5626 / ABNT) ── */
const CONSUMO_PER_CAPITA = {
  residencial:  { label: 'Residência unifamiliar',     q: 200 },
  apartamento:  { label: 'Apartamento',                q: 150 },
  hotel:        { label: 'Hotel (por hóspede)',         q: 180 },
  escola:       { label: 'Escola (aluno/turno)',        q: 50  },
  escritorio:   { label: 'Escritório (funcionário)',    q: 50  },
  hospital:     { label: 'Hospital (leito)',             q: 500 },
  comercio:     { label: 'Comércio / shopping (m²)',    q: 5   },
  restaurante:  { label: 'Restaurante (refeição)',      q: 25  },
  industria:    { label: 'Indústria (funcionário)',     q: 70  },
  quartel:      { label: 'Quartel / alojamento',        q: 120 },
};

function atualizarTipoEdificacaoAgua() {
  const tipo = document.getElementById('agua-tipo')?.value;
  const dado = CONSUMO_PER_CAPITA[tipo];
  if (!dado) return;
  const el = document.getElementById('consumo-per-capita');
  if (el) el.value = dado.q;
}

/* ============================================================
   1. DEMANDA DE ÁGUA
   ============================================================ */
function calcularDemandaAgua() {
  const N         = parseFloat(document.getElementById('num-habitantes').value);
  const q         = parseFloat(document.getElementById('consumo-per-capita').value);
  const incendio  = parseFloat(document.getElementById('reserva-incendio').value) || 0;
  const K1        = parseFloat(document.getElementById('agua-k1').value) || 1.20;
  const K2        = parseFloat(document.getElementById('agua-k2').value) || 1.50;
  const autonomia = parseFloat(document.getElementById('agua-autonomia').value) || 1;
  const el        = document.getElementById('resultado-demanda-agua');

  if (!N || !q || N <= 0 || q <= 0) {
    mostrarErro(el, 'Preencha N e consumo per capita com valores positivos.');
    return;
  }

  const consumoDiario  = N * q;                          // L/dia
  const consumoMensal  = consumoDiario * 30;             // L/mês
  const qMedio         = consumoDiario / 86400;          // L/s
  const qMaxDiario     = qMedio * K1;                    // L/s
  const qMaxHorario    = qMedio * K1 * K2;               // L/s

  const vTotal    = consumoDiario * autonomia;           // L — volume total sistema
  const vInferior = vTotal * 0.60 + incendio;            // L — cisterna (60% + incêndio)
  const vSuperior = vTotal * 0.40;                       // L — caixa d'água (40%)
  const vMinRS    = Math.max(vSuperior, 500);            // NBR 5626: RI ≥ 500 L (residencial)

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Demanda de Água</h4>
    <div class="result-main">
      <div><div class="label">Consumo diário</div><div class="value">${fmt(consumoDiario)} L/dia</div></div>
      <div><div class="label">Q máx. horário</div><div class="value">${fmt(qMaxHorario, 4)} L/s</div></div>
    </div>
    <table class="result-table">
      <tr><td>Número de habitantes / usuários (N)</td><td>${N}</td></tr>
      <tr><td>Consumo per capita (q)</td><td>${fmt(q)} L/un·dia</td></tr>
      <tr><td>Consumo diário total</td><td>${fmt(consumoDiario)} L/dia</td></tr>
      <tr><td>Consumo mensal estimado</td><td>${fmt(consumoMensal)} L/mês</td></tr>
      <tr><td>Dias de autonomia adotados</td><td>${autonomia} dia(s)</td></tr>
      <tr><td colspan="2"><strong>Vazões de projeto</strong></td></tr>
      <tr><td>Q médio diário (Qmd)</td><td>${fmt(qMedio, 5)} L/s</td></tr>
      <tr><td>Q máximo diário — K1 = ${fmt(K1, 2)}</td><td>${fmt(qMaxDiario, 5)} L/s</td></tr>
      <tr><td>Q máximo horário — K1×K2 = ${fmt(K1 * K2, 2)}</td><td><strong>${fmt(qMaxHorario, 5)} L/s</strong></td></tr>
      <tr><td colspan="2"><strong>Volumes do sistema (referência)</strong></td></tr>
      <tr><td>Volume total do sistema</td><td>${fmt(vTotal)} L = ${fmt(vTotal / 1000, 3)} m³</td></tr>
      <tr><td>Reservatório inferior (cisterna) — 60% + incêndio</td><td>${fmt(vInferior)} L = ${fmt(vInferior / 1000, 3)} m³</td></tr>
      <tr><td>Reservatório superior (caixa d'água) — 40%</td><td>${fmt(Math.max(vSuperior, vMinRS))} L = ${fmt(Math.max(vSuperior, vMinRS) / 1000, 3)} m³</td></tr>
      ${incendio > 0 ? `<tr><td>Reserva de incêndio incluída</td><td>${fmt(incendio)} L</td></tr>` : ''}
    </table>
    <p class="status-msg">&#9432; NBR 5626: K1 = 1,20 (coef. variação diária) | K2 = 1,50 (coef. variação horária). Volumes são referências — ajuste conforme projeto.</p>`;
}

/* ============================================================
   2. DIÂMETRO DA TUBULAÇÃO (Q = V × A)
   ============================================================ */
function calcularDiametroAgua() {
  const Q = parseFloat(document.getElementById('vazao-agua').value);
  const V = parseFloat(document.getElementById('velocidade-agua').value);
  const el = document.getElementById('resultado-diametro-agua');

  if (!Q || !V || Q <= 0 || V <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  const Qm3s = Q / 1000;
  const A    = Qm3s / V;
  const D    = 2 * Math.sqrt(A / Math.PI);
  const Dmm  = D * 1000;

  const vMin = 0.6, vMax = 3.0;
  let status = 'ok', statusMsg = '';
  if (V < vMin) { status = 'aviso'; statusMsg = `Velocidade abaixo do mínimo recomendado (${vMin} m/s). Risco de sedimentação.`; }
  else if (V > vMax) { status = 'erro'; statusMsg = `Velocidade acima do máximo (${vMax} m/s). Risco de ruídos e golpe de aríete.`; }
  else { statusMsg = `&#10003; Velocidade dentro dos limites NBR 5626 (0,6 a 3,0 m/s).`; }

  const comerciais = [20, 25, 32, 40, 50, 60, 75, 85, 100, 110, 125, 150, 200];
  const Dnom = comerciais.find(d => d >= Dmm) || comerciais[comerciais.length - 1];
  const V_real = Qm3s / (Math.PI * (Dnom / 1000) ** 2 / 4);

  el.className = `resultado resultado-${status}`;
  el.innerHTML = `
    <h4>Resultados — Diâmetro da Tubulação</h4>
    <div class="result-main">
      <div><div class="label">DN adotado</div><div class="value">DN ${Dnom} mm</div></div>
      <span class="result-badge ${status}">${status === 'ok' ? '&#10003; OK' : status === 'aviso' ? '&#9888; Atenção' : '&#10007; Verificar'}</span>
    </div>
    <table class="result-table">
      <tr><td>Vazão Q</td><td>${fmt(Q, 3)} L/s (${fmt(Qm3s, 6)} m³/s)</td></tr>
      <tr><td>Velocidade adotada V</td><td>${fmt(V, 2)} m/s</td></tr>
      <tr><td>Área da seção A</td><td>${fmt(A * 10000, 4)} cm²</td></tr>
      <tr><td>Diâmetro teórico</td><td>${fmt(Dmm, 2)} mm</td></tr>
      <tr><td><strong>DN comercial adotado (PVC)</strong></td><td><strong>DN ${Dnom} mm</strong></td></tr>
      <tr><td>Velocidade real (DN adotado)</td><td>${fmt(V_real, 3)} m/s</td></tr>
    </table>
    <p class="status-msg">${statusMsg}</p>`;
}

/* ============================================================
   3. PERDA DE CARGA — HAZEN-WILLIAMS
   ============================================================ */
function calcularHazenWilliams() {
  const Q = parseFloat(document.getElementById('hw-vazao').value);
  const D = parseFloat(document.getElementById('hw-diametro').value);
  const L = parseFloat(document.getElementById('hw-comprimento').value);
  const C = parseFloat(document.getElementById('hw-c').value);
  const el = document.getElementById('resultado-hazen');

  if (!Q || !D || !L || Q <= 0 || D <= 0 || L <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  const Qm3s = Q / 1000;
  const Dm   = D / 1000;
  const J    = Math.pow(Qm3s / (0.2785 * C * Math.pow(Dm, 2.63)), 1 / 0.54);
  const hf   = J * L;
  const V    = Qm3s / (Math.PI * Dm * Dm / 4);

  // Perdas locais estimadas (10% do comprimento equivalente)
  const hfLocal  = hf * 0.10;
  const hfTotal  = hf + hfLocal;

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Perda de Carga (Hazen-Williams)</h4>
    <div class="result-main">
      <div><div class="label">hf distribuída</div><div class="value">${fmt(hf, 3)} m.c.a</div></div>
      <div><div class="label">hf total (+ locais)</div><div class="value">${fmt(hfTotal, 3)} m.c.a</div></div>
    </div>
    <table class="result-table">
      <tr><td>Vazão Q</td><td>${fmt(Q, 3)} L/s</td></tr>
      <tr><td>Diâmetro interno D</td><td>${fmt(D, 1)} mm</td></tr>
      <tr><td>Comprimento L</td><td>${fmt(L, 1)} m</td></tr>
      <tr><td>Coeficiente C (Hazen-Williams)</td><td>${C}</td></tr>
      <tr><td>Velocidade de escoamento</td><td>${fmt(V, 3)} m/s</td></tr>
      <tr><td>Gradiente hidráulico J</td><td>${fmt(J * 1000, 4)} m/km (${fmt(J, 7)} m/m)</td></tr>
      <tr><td>Perda de carga distribuída hf</td><td>${fmt(hf, 4)} m.c.a</td></tr>
      <tr><td>Perdas locais estimadas (~10%)</td><td>${fmt(hfLocal, 4)} m.c.a</td></tr>
      <tr><td><strong>Perda de carga total</strong></td><td><strong>${fmt(hfTotal, 4)} m.c.a</strong></td></tr>
    </table>
    <p class="status-msg">&#9432; Perdas locais estimadas em 10% da perda distribuída. Para precisão, use método do comprimento equivalente.</p>`;
}

/* ============================================================
   4. RESERVATÓRIO INFERIOR (CISTERNA)
   ============================================================ */
function calcularReservatorioInferior() {
  const consumo   = parseFloat(document.getElementById('ri-consumo').value);
  const autonomia = parseFloat(document.getElementById('ri-autonomia').value) || 1;
  const incendio  = parseFloat(document.getElementById('ri-incendio').value) || 0;
  const percRI    = parseFloat(document.getElementById('ri-perc').value) || 60;
  const H         = parseFloat(document.getElementById('ri-h').value);
  const formato   = document.getElementById('ri-formato').value;
  const el        = document.getElementById('resultado-reservatorio-inferior');

  if (!consumo || !H || consumo <= 0 || H < 0.5) {
    mostrarErro(el, 'Preencha consumo diário e altura útil (mín. 0,5 m).');
    return;
  }

  const V_L   = consumo * autonomia * (percRI / 100) + incendio;   // L
  const V_m3  = V_L / 1000;

  let dimHTML = '';
  if (formato === 'circular') {
    const D = Math.sqrt(4 * V_m3 / (Math.PI * H));
    dimHTML = `
      <tr><td>Formato</td><td>Cilíndrico</td></tr>
      <tr><td>Diâmetro interno (D)</td><td>${fmt(D, 2)} m</td></tr>
      <tr><td>Altura útil (H)</td><td>${fmt(H, 2)} m</td></tr>
      <tr><td>Altura total (+ 0,30 m folga)</td><td>${fmt(H + 0.30, 2)} m</td></tr>`;
  } else {
    const B = Math.sqrt(V_m3 / (2 * H));
    const L = 2 * B;
    dimHTML = `
      <tr><td>Formato</td><td>Retangular (L = 2B)</td></tr>
      <tr><td>Comprimento L</td><td>${fmt(L, 2)} m</td></tr>
      <tr><td>Largura B</td><td>${fmt(B, 2)} m</td></tr>
      <tr><td>Altura útil (H)</td><td>${fmt(H, 2)} m</td></tr>
      <tr><td>Altura total (+ 0,30 m folga)</td><td>${fmt(H + 0.30, 2)} m</td></tr>`;
  }

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Reservatório Inferior (Cisterna)</h4>
    <div class="result-main">
      <div><div class="label">Volume necessário</div><div class="value">${fmt(V_m3, 3)} m³</div></div>
      <div><div class="label">${fmt(V_L)} L</div></div>
    </div>
    <table class="result-table">
      <tr><td>Consumo diário total</td><td>${fmt(consumo)} L/dia</td></tr>
      <tr><td>Dias de autonomia</td><td>${autonomia} dia(s)</td></tr>
      <tr><td>Parcela destinada ao RI</td><td>${percRI}% do volume total</td></tr>
      <tr><td>Volume de consumo no RI</td><td>${fmt(consumo * autonomia * percRI / 100)} L</td></tr>
      ${incendio > 0 ? `<tr><td>Reserva de incêndio</td><td>${fmt(incendio)} L</td></tr>` : ''}
      <tr><td><strong>Volume total do RI</strong></td><td><strong>${fmt(V_L)} L = ${fmt(V_m3, 3)} m³</strong></td></tr>
      ${dimHTML}
    </table>
    <p class="status-msg">&#9432; Instalar em local protegido de contaminação. Manutenção a cada 6 meses (ABNT NBR 5626). Tampa com selo hermético.</p>`;
}

/* ============================================================
   5. RESERVATÓRIO SUPERIOR (CAIXA D'ÁGUA)
   ============================================================ */
function calcularReservatorioSuperior() {
  const consumo   = parseFloat(document.getElementById('rs-consumo').value);
  const autonomia = parseFloat(document.getElementById('rs-autonomia').value) || 1;
  const percRS    = parseFloat(document.getElementById('rs-perc').value) || 40;
  const H         = parseFloat(document.getElementById('rs-h').value);
  const formato   = document.getElementById('rs-formato').value;
  const hfDistr   = parseFloat(document.getElementById('rs-hf').value) || 0;
  const cotaCrit  = parseFloat(document.getElementById('rs-cota-critica').value) || 0;
  const pMin      = parseFloat(document.getElementById('rs-pmin').value) || 5;
  const el        = document.getElementById('resultado-reservatorio-superior');

  if (!consumo || !H || consumo <= 0 || H < 0.3) {
    mostrarErro(el, 'Preencha consumo diário e altura útil (mín. 0,3 m).');
    return;
  }

  const V_L   = Math.max(consumo * autonomia * (percRS / 100), 500);  // mín 500 L
  const V_m3  = V_L / 1000;

  // Altura mínima de instalação do fundo da caixa (para garantir pressão mínima)
  const H_inst_min = cotaCrit + pMin + hfDistr;

  let dimHTML = '';
  if (formato === 'circular') {
    const D = Math.sqrt(4 * V_m3 / (Math.PI * H));
    dimHTML = `
      <tr><td>Formato</td><td>Cilíndrico</td></tr>
      <tr><td>Diâmetro (D)</td><td>${fmt(D, 2)} m</td></tr>
      <tr><td>Altura útil (H)</td><td>${fmt(H, 2)} m</td></tr>`;
  } else {
    const B = Math.sqrt(V_m3 / (2 * H));
    const L = 2 * B;
    dimHTML = `
      <tr><td>Formato</td><td>Retangular (L = 2B)</td></tr>
      <tr><td>Comprimento L</td><td>${fmt(L, 2)} m</td></tr>
      <tr><td>Largura B</td><td>${fmt(B, 2)} m</td></tr>
      <tr><td>Altura útil (H)</td><td>${fmt(H, 2)} m</td></tr>`;
  }

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Reservatório Superior (Caixa d'Água)</h4>
    <div class="result-main">
      <div><div class="label">Volume necessário</div><div class="value">${fmt(V_m3, 3)} m³</div></div>
      <div><div class="label">${fmt(V_L)} L</div></div>
    </div>
    <table class="result-table">
      <tr><td>Consumo diário total</td><td>${fmt(consumo)} L/dia</td></tr>
      <tr><td>Parcela destinada ao RS</td><td>${percRS}% do volume total</td></tr>
      <tr><td><strong>Volume adotado do RS</strong></td><td><strong>${fmt(V_L)} L = ${fmt(V_m3, 3)} m³</strong> (mín. 500 L)</td></tr>
      ${dimHTML}
      <tr><td colspan="2"><strong>Altura mínima de instalação</strong></td></tr>
      <tr><td>Cota do ponto crítico mais desfavorável</td><td>${fmt(cotaCrit, 2)} m</td></tr>
      <tr><td>Pressão mínima requerida</td><td>${fmt(pMin, 1)} m.c.a (NBR 5626)</td></tr>
      <tr><td>Perda de carga na distribuição (hf)</td><td>${fmt(hfDistr, 2)} m.c.a</td></tr>
      <tr><td><strong>Elevação mínima do fundo da caixa</strong></td><td><strong>${fmt(H_inst_min, 2)} m</strong> acima do ponto de referência</td></tr>
    </table>
    <p class="status-msg">&#9432; NBR 5626: pressão mínima de 5 m.c.a nas torneiras e 10 m.c.a nos chuveiros (ponto mais desfavorável).</p>
    <p class="status-msg">&#9432; Caixa deve estar a pelo menos 0,60 m acima do telhado e afastada de fontes de contaminação.</p>`;
}

/* ============================================================
   6. BOMBA DE RECALQUE
   ============================================================ */
function calcularBomba() {
  const V_L    = parseFloat(document.getElementById('bom-vol').value);    // L/dia a recalcar
  const T_op   = parseFloat(document.getElementById('bom-top').value);    // h/dia operação
  const Hg     = parseFloat(document.getElementById('bom-hg').value);     // m (altura geométrica)
  const hf_rec = parseFloat(document.getElementById('bom-hf').value);     // m.c.a perdas linha recalque
  const eta_b  = parseFloat(document.getElementById('bom-eta-b').value) / 100 || 0.70;
  const eta_m  = parseFloat(document.getElementById('bom-eta-m').value) / 100 || 0.90;
  const fs     = parseFloat(document.getElementById('bom-fs').value) || 1.20;
  const hz_suc = parseFloat(document.getElementById('bom-hz-suc').value) || 0;  // m (altura sucção)
  const el     = document.getElementById('resultado-bomba');

  if (!V_L || !T_op || !Hg || V_L <= 0 || T_op <= 0 || T_op > 20 || Hg <= 0) {
    mostrarErro(el, 'Preencha volume diário, tempo de operação (máx 20 h) e altura geométrica.');
    return;
  }

  // Q da bomba
  const Q_m3s = (V_L / 1000) / (T_op * 3600);    // m³/s
  const Q_Ls  = Q_m3s * 1000;                      // L/s
  const Q_m3h = Q_m3s * 3600;                      // m³/h

  // Altura manométrica total
  const hf_local = (Hg + hf_rec) * 0.10;           // 10% estimativa perdas locais
  const Hm       = Hg + hf_rec + hf_local;          // m.c.a

  // Potência
  const rho     = 1000;   // kg/m³
  const g       = 9.81;   // m/s²
  const P_hid   = rho * g * Q_m3s * Hm;             // W (potência hidráulica)
  const eta_tot = eta_b * eta_m;
  const P_motor = P_hid / eta_tot;                   // W (potência no eixo do motor)
  const P_adot  = P_motor * fs;                      // W (com fator de segurança)
  const P_CV    = P_adot / 735.5;
  const P_kW    = P_adot / 1000;

  // Motor comercial (próximo superior em CV)
  const motores = [0.33, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 7.5, 10.0, 15.0, 20.0];
  const motorAdot = motores.find(m => m >= P_CV) || motores[motores.length - 1];

  // NPSH disponível (simplificado)
  const Pa_m  = 10.33;     // pressão atmosférica (m.c.a) ao nível do mar
  const Pv_m  = 0.24;      // pressão de vapor da água a 20°C (m.c.a)
  const hf_suc = hf_rec * 0.15;  // estimativa perda na sucção (15% do total)
  const NPSHd = Pa_m - Pv_m - hz_suc - hf_suc;
  const alertaNPSH = NPSHd < 3.0
    ? `&#9888; NPSH disponível (${fmt(NPSHd, 2)} m) abaixo de 3,0 m — risco de cavitação. Reduza a altura de sucção ou verifique com fabricante.`
    : `&#10003; NPSH disponível estimado (${fmt(NPSHd, 2)} m) — verificar NPSH requerido da bomba selecionada.`;

  const eta_b_pct = (eta_b * 100).toFixed(0);
  const eta_m_pct = (eta_m * 100).toFixed(0);

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Bomba de Recalque</h4>
    <div class="result-main">
      <div><div class="label">Q bomba</div><div class="value">${fmt(Q_Ls, 3)} L/s</div></div>
      <div><div class="label">Hm</div><div class="value">${fmt(Hm, 2)} m.c.a</div></div>
      <div><div class="label">Motor adotado</div><div class="value">${motorAdot} CV</div></div>
    </div>
    <table class="result-table">
      <tr><td colspan="2"><strong>Dados de entrada</strong></td></tr>
      <tr><td>Volume a recalcar por dia</td><td>${fmt(V_L)} L/dia</td></tr>
      <tr><td>Tempo de operação diária</td><td>${fmt(T_op, 1)} h/dia</td></tr>
      <tr><td>Altura geométrica (Hg)</td><td>${fmt(Hg, 2)} m</td></tr>
      <tr><td>Perda de carga na linha (hf)</td><td>${fmt(hf_rec, 2)} m.c.a</td></tr>
      <tr><td>Perdas locais estimadas (~10%)</td><td>${fmt(hf_local, 2)} m.c.a</td></tr>
      <tr><td colspan="2"><strong>Resultado do dimensionamento</strong></td></tr>
      <tr><td>Vazão da bomba (Q)</td><td>${fmt(Q_Ls, 4)} L/s = ${fmt(Q_m3h, 3)} m³/h</td></tr>
      <tr><td>Altura manométrica total (Hm)</td><td>${fmt(Hm, 3)} m.c.a</td></tr>
      <tr><td>Potência hidráulica útil</td><td>${fmt(P_hid, 1)} W = ${fmt(P_hid / 735.5, 3)} CV</td></tr>
      <tr><td>Rendimento da bomba (η_b)</td><td>${eta_b_pct}%</td></tr>
      <tr><td>Rendimento do motor (η_m)</td><td>${eta_m_pct}%</td></tr>
      <tr><td>Rendimento total (η_total)</td><td>${fmt(eta_tot * 100, 1)}%</td></tr>
      <tr><td>Potência do motor calculada</td><td>${fmt(P_motor / 1000, 3)} kW = ${fmt(P_motor / 735.5, 3)} CV</td></tr>
      <tr><td>Fator de segurança (fs)</td><td>${fs}</td></tr>
      <tr><td>Potência com fator de segurança</td><td>${fmt(P_kW, 3)} kW = ${fmt(P_CV, 3)} CV</td></tr>
      <tr><td><strong>Motor comercial adotado</strong></td><td><strong>${motorAdot} CV = ${fmt(motorAdot * 0.7355, 2)} kW</strong></td></tr>
    </table>
    <p class="status-msg">${alertaNPSH}</p>
    <p class="status-msg">&#9432; Verificar curva da bomba: Q × Hm deve estar na faixa de melhor rendimento. Instalar válvula de pé com crivo na sucção e válvula de retenção na recalque.</p>`;
}

/* ============================================================
   7. PRESSÃO NO PONTO CRÍTICO
   ============================================================ */
function calcularPressaoCritica() {
  const H_caixa   = parseFloat(document.getElementById('pc-h-caixa').value);
  const cotaCrit  = parseFloat(document.getElementById('pc-cota-critica').value);
  const hf        = parseFloat(document.getElementById('pc-hf').value) || 0;
  const el        = document.getElementById('resultado-pressao-critica');

  if (isNaN(H_caixa) || isNaN(cotaCrit)) {
    mostrarErro(el, 'Preencha a elevação do fundo da caixa e a cota do ponto crítico.');
    return;
  }

  const P_disp = H_caixa - cotaCrit - hf;   // m.c.a

  let status = 'ok', alertas = [];
  if (P_disp < 5.0) {
    status = 'erro';
    alertas.push(`&#10007; Pressão insuficiente (${fmt(P_disp, 2)} m.c.a < 5,0 m.c.a mínimo NBR 5626). Elevar a caixa d'água ou aumentar diâmetro da tubulação.`);
  } else if (P_disp < 10.0) {
    status = 'aviso';
    alertas.push(`&#9888; Pressão de ${fmt(P_disp, 2)} m.c.a adequada para torneiras (≥ 5 m.c.a), mas insuficiente para chuveiros (recomendado ≥ 10 m.c.a).`);
  } else {
    alertas.push(`&#10003; Pressão de ${fmt(P_disp, 2)} m.c.a adequada para todos os aparelhos (torneiras: ≥ 5 m.c.a; chuveiros: ≥ 10 m.c.a).`);
  }

  if (P_disp > 40.0) {
    status = 'aviso';
    alertas.push(`&#9888; Pressão (${fmt(P_disp, 2)} m.c.a) excede 40 m.c.a — NBR 5626 exige válvula redutora de pressão.`);
  }
  if (P_disp > 20.0 && status === 'ok') {
    alertas.push(`&#9432; Pressão > 20 m.c.a: verificar se unidades autônomas possuem reservatório próprio (NBR 5626 §5.4).`);
  }

  el.className = `resultado resultado-${status}`;
  el.innerHTML = `
    <h4>Resultados — Pressão no Ponto Crítico</h4>
    <div class="result-main">
      <div><div class="label">Pressão disponível</div><div class="value">${fmt(P_disp, 2)} m.c.a</div></div>
      <span class="result-badge ${status}">${status === 'ok' ? '&#10003; Adequada' : status === 'aviso' ? '&#9888; Atenção' : '&#10007; Insuficiente'}</span>
    </div>
    <table class="result-table">
      <tr><td>Fórmula</td><td>P = H_caixa − cota_crítica − hf</td></tr>
      <tr><td>Elevação do fundo da caixa d'água (H_caixa)</td><td>${fmt(H_caixa, 2)} m</td></tr>
      <tr><td>Cota do ponto crítico (mais desfavorável)</td><td>${fmt(cotaCrit, 2)} m</td></tr>
      <tr><td>Perda de carga total na distribuição (hf)</td><td>${fmt(hf, 2)} m.c.a</td></tr>
      <tr><td><strong>Pressão disponível no ponto crítico</strong></td><td><strong>${fmt(P_disp, 2)} m.c.a</strong></td></tr>
      <tr><td>Pressão mínima (torneiras) — NBR 5626</td><td>5,0 m.c.a</td></tr>
      <tr><td>Pressão mínima (chuveiros) — NBR 5626</td><td>10,0 m.c.a</td></tr>
      <tr><td>Pressão máxima — NBR 5626</td><td>40,0 m.c.a</td></tr>
    </table>
    ${alertas.map(a => `<p class="status-msg">${a}</p>`).join('')}`;
}
