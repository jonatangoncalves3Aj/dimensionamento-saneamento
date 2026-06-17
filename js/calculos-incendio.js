// Cálculos de Combate a Incêndio — NBR 13714 / IT-22

/* ── Parâmetros normativos por tipo de sistema (NBR 13714) ── */
const PARAM_INCENDIO = {
  tipo1: {
    label:         'Tipo 1 — Mangotinho (≤ 700 m² ou H ≤ 6 m)',
    vazaoPonto:    100,     // L/min por ponto
    pressaoMin:    10,      // m.c.a no bocal
    pressaoMax:    60,      // m.c.a no bocal
    pontosSimult:  2,
    dnColuna:      50,      // mm
    dnMangueira:   25,      // mm
    compMangueira: 15,      // m
    tempoMin:      30,      // min
  },
  tipo2: {
    label:         'Tipo 2 — Hidrante simples (700–2500 m² ou H 6–23 m)',
    vazaoPonto:    300,
    pressaoMin:    10,
    pressaoMax:    60,
    pontosSimult:  2,
    dnColuna:      65,
    dnMangueira:   40,
    compMangueira: 30,
    tempoMin:      60,
  },
  tipo3: {
    label:         'Tipo 3 — Hidrante duplo (2500–6000 m² ou H 23–30 m)',
    vazaoPonto:    300,
    pressaoMin:    10,
    pressaoMax:    60,
    pontosSimult:  2,
    dnColuna:      65,
    dnMangueira:   40,
    compMangueira: 30,
    tempoMin:      60,
  },
  tipo4: {
    label:         'Tipo 4 — Hidrante / chuveiro (H > 30 m ou área especial)',
    vazaoPonto:    900,
    pressaoMin:    10,
    pressaoMax:    100,
    pontosSimult:  3,
    dnColuna:      100,
    dnMangueira:   65,
    compMangueira: 30,
    tempoMin:      60,
  },
};

function atualizarSistemaIncendio() {
  const tipo = document.getElementById('inc-tipo').value;
  const p    = PARAM_INCENDIO[tipo];
  if (!p) return;
  const hint = document.getElementById('inc-tipo-hint');
  if (hint) hint.textContent = `${p.pontosSimult} pontos simultâneos | ${p.vazaoPonto} L/min/ponto | t_min = ${p.tempoMin} min | DN coluna ≥ ${p.dnColuna} mm | mangueira DN ${p.dnMangueira}`;
}

/* ============================================================
   1. RESERVA TÉCNICA DE INCÊNDIO (RTI)
   ============================================================ */
function calcularRTI() {
  const tipo    = document.getElementById('inc-tipo').value;
  const nPontos = parseInt(document.getElementById('inc-n-pontos').value) || 0;
  const tempo   = parseFloat(document.getElementById('inc-tempo').value);
  const el      = document.getElementById('resultado-rti');

  const p = PARAM_INCENDIO[tipo];
  if (!p) { mostrarErro(el, 'Selecione o tipo de sistema.'); return; }
  if (!tempo || tempo <= 0) { mostrarErro(el, 'Informe o tempo de funcionamento.'); return; }
  if (nPontos < 1) { mostrarErro(el, 'Informe o número de pontos de hidrante/mangotinho.'); return; }

  const pontosOper  = Math.min(nPontos, p.pontosSimult);  // operam simultaneamente
  const Q_sistema   = pontosOper * p.vazaoPonto;           // L/min
  const Q_Ls        = Q_sistema / 60;                       // L/s
  const RTI_L       = Q_sistema * tempo;                    // L
  const RTI_m3      = RTI_L / 1000;

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Reserva Técnica de Incêndio (RTI)</h4>
    <div class="result-main">
      <div><div class="label">RTI necessária</div><div class="value">${fmt(RTI_m3, 2)} m³</div></div>
      <div><div class="label">Vazão sistema</div><div class="value">${fmt(Q_Ls, 2)} L/s</div></div>
    </div>
    <table class="result-table">
      <tr><td>Sistema adotado</td><td>${p.label}</td></tr>
      <tr><td>Nº de pontos instalados</td><td>${nPontos}</td></tr>
      <tr><td>Pontos simultâneos (norma)</td><td>${pontosOper}</td></tr>
      <tr><td>Vazão por ponto</td><td>${p.vazaoPonto} L/min</td></tr>
      <tr><td>Vazão total do sistema</td><td>${fmt(Q_sistema)} L/min = ${fmt(Q_Ls, 2)} L/s</td></tr>
      <tr><td>Tempo de funcionamento</td><td>${tempo} min (mín. ${p.tempoMin} min)</td></tr>
      <tr><td><strong>RTI = Q × t</strong></td><td><strong>${fmt(RTI_L)} L = ${fmt(RTI_m3, 3)} m³</strong></td></tr>
      <tr><td>DN mínimo da coluna/prumada</td><td>DN ${p.dnColuna} mm</td></tr>
      <tr><td>DN mangueira</td><td>DN ${p.dnMangueira} mm × ${p.compMangueira} m</td></tr>
      <tr><td>Pressão no bocal</td><td>${p.pressaoMin} – ${p.pressaoMax} m.c.a (NBR 13714)</td></tr>
    </table>
    <p class="status-msg">&#9432; A RTI deve ser armazenada em reservatório exclusivo ou compartimento separado do reservatório de consumo (IT-22 / NBR 13714 §5.4).</p>
    <p class="status-msg">&#9432; Tempo mínimo NBR 13714: ${p.tempoMin} min. O tempo adotado (${tempo} min) ${tempo >= p.tempoMin ? '&#10003; atende' : '&#9888; não atende'} a norma.</p>`;
}

/* ============================================================
   2. BOMBA DE INCÊNDIO
   ============================================================ */
function calcularBombaIncendio() {
  const tipo     = document.getElementById('bi-tipo').value;
  const Hg       = parseFloat(document.getElementById('bi-hg').value);
  const hf       = parseFloat(document.getElementById('bi-hf').value) || 0;
  const el       = document.getElementById('resultado-bomba-incendio');

  const p = PARAM_INCENDIO[tipo];
  if (!p) { mostrarErro(el, 'Selecione o tipo de sistema.'); return; }
  if (!Hg || Hg <= 0) { mostrarErro(el, 'Informe a altura geométrica.'); return; }

  const Q_Ls   = (p.pontosSimult * p.vazaoPonto) / 60;  // L/s
  const Q_m3s  = Q_Ls / 1000;
  const Q_m3h  = Q_m3s * 3600;

  // Hm = Hg + hf + pressão mínima no bocal + perdas locais (15%)
  const hf_local = (Hg + hf) * 0.15;
  const Hm       = Hg + hf + hf_local + p.pressaoMin;

  // Potência
  const rho      = 1000;
  const g        = 9.81;
  const eta_tot  = 0.65;   // rendimento típico de bomba de incêndio
  const P_calc   = (rho * g * Q_m3s * Hm) / eta_tot;  // W
  const P_kW     = P_calc / 1000;
  const P_CV     = P_kW / 0.7355;
  const P_fs     = P_CV * 1.25;  // fator segurança 1,25

  const motores  = [0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 7.5, 10.0, 15.0, 20.0, 25.0, 30.0];
  const motorAd  = motores.find(m => m >= P_fs) || motores[motores.length - 1];

  // Pressão no hidrante mais desfavorável (verificação)
  const P_hid = Hm - (Hg + hf + hf_local);

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Bomba de Incêndio</h4>
    <div class="result-main">
      <div><div class="label">Q bomba</div><div class="value">${fmt(Q_Ls, 2)} L/s</div></div>
      <div><div class="label">Hm</div><div class="value">${fmt(Hm, 2)} m.c.a</div></div>
      <div><div class="label">Motor adotado</div><div class="value">${motorAd} CV</div></div>
    </div>
    <table class="result-table">
      <tr><td>Sistema</td><td>${p.label}</td></tr>
      <tr><td>Vazão da bomba (${p.pontosSimult} pontos simult.)</td><td>${fmt(Q_Ls, 3)} L/s = ${fmt(Q_m3h, 2)} m³/h</td></tr>
      <tr><td>Altura geométrica Hg</td><td>${fmt(Hg, 2)} m</td></tr>
      <tr><td>Perdas na tubulação hf</td><td>${fmt(hf, 2)} m.c.a</td></tr>
      <tr><td>Perdas locais estimadas (~15%)</td><td>${fmt(hf_local, 2)} m.c.a</td></tr>
      <tr><td>Pressão mín. no bocal (NBR 13714)</td><td>${p.pressaoMin} m.c.a</td></tr>
      <tr><td><strong>Altura manométrica total Hm</strong></td><td><strong>${fmt(Hm, 3)} m.c.a</strong></td></tr>
      <tr><td>Potência calculada (η = ${(eta_tot*100).toFixed(0)}%)</td><td>${fmt(P_kW, 3)} kW = ${fmt(P_CV, 3)} CV</td></tr>
      <tr><td>Potência com fs = 1,25</td><td>${fmt(P_fs, 3)} CV</td></tr>
      <tr><td><strong>Motor comercial adotado</strong></td><td><strong>${motorAd} CV = ${fmt(motorAd * 0.7355, 2)} kW</strong></td></tr>
      <tr><td>Pressão no hidrante mais desfavorável</td><td>${fmt(P_hid, 2)} m.c.a</td></tr>
    </table>
    <p class="status-msg">${P_hid >= p.pressaoMin ? '&#10003;' : '&#9888;'} Pressão no ponto mais desfavorável (${fmt(P_hid, 2)} m.c.a) ${P_hid >= p.pressaoMin ? 'atende' : 'NÃO atende'} o mínimo de ${p.pressaoMin} m.c.a (NBR 13714).</p>
    <p class="status-msg">&#9432; NBR 13714 §7: prever bomba reserva (jockey) automática para pressurização e bomba principal (elétrica) + bomba de reserva (diesel para H > 3 pav.).</p>`;
}

/* ============================================================
   3. TUBULAÇÃO E PERDA DE CARGA — INCÊNDIO
   ============================================================ */
function calcularTubulacaoIncendio() {
  const Q    = parseFloat(document.getElementById('ti-vazao').value);    // L/s
  const DN   = parseFloat(document.getElementById('ti-dn').value);       // mm
  const L    = parseFloat(document.getElementById('ti-L').value);        // m
  const el   = document.getElementById('resultado-tubulacao-incendio');

  if (!Q || !DN || !L || Q <= 0 || DN <= 0 || L <= 0) {
    mostrarErro(el, 'Preencha todos os campos com valores positivos.');
    return;
  }

  // Hazen-Williams com C=120 (ferro galvanizado / aço carbono — NBR 13714)
  const C    = 120;
  const Qm3s = Q / 1000;
  const Dm   = DN / 1000;
  const J    = Math.pow(Qm3s / (0.2785 * C * Math.pow(Dm, 2.63)), 1 / 0.54);
  const hf   = J * L;
  const V    = Qm3s / (Math.PI * Dm * Dm / 4);
  const hf_local = hf * 0.20;   // 20% para conexões/válvulas de incêndio

  let msgV = '';
  if (V > 5.0)     msgV = `&#9888; Velocidade (${fmt(V, 2)} m/s) > 5,0 m/s — verificar golpe de aríete.`;
  else if (V < 0.5) msgV = `&#9432; Velocidade baixa (${fmt(V, 2)} m/s) — verificar sedimentação.`;
  else              msgV = `&#10003; Velocidade adequada (${fmt(V, 2)} m/s).`;

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Tubulação de Incêndio</h4>
    <div class="result-main">
      <div><div class="label">hf total</div><div class="value">${fmt(hf + hf_local, 3)} m.c.a</div></div>
      <div><div class="label">Velocidade</div><div class="value">${fmt(V, 3)} m/s</div></div>
    </div>
    <table class="result-table">
      <tr><td>Vazão Q</td><td>${fmt(Q, 3)} L/s</td></tr>
      <tr><td>DN adotado</td><td>DN ${DN} mm</td></tr>
      <tr><td>Comprimento L</td><td>${fmt(L, 1)} m</td></tr>
      <tr><td>Coeficiente C (H-W, aço / ferro galv.)</td><td>${C}</td></tr>
      <tr><td>Velocidade de escoamento</td><td>${fmt(V, 3)} m/s</td></tr>
      <tr><td>Gradiente hidráulico J</td><td>${fmt(J * 1000, 3)} m/km</td></tr>
      <tr><td>Perda de carga distribuída hf</td><td>${fmt(hf, 4)} m.c.a</td></tr>
      <tr><td>Perdas locais (~20% — válvulas/conexões)</td><td>${fmt(hf_local, 4)} m.c.a</td></tr>
      <tr><td><strong>Perda de carga total</strong></td><td><strong>${fmt(hf + hf_local, 4)} m.c.a</strong></td></tr>
    </table>
    <p class="status-msg">${msgV}</p>
    <p class="status-msg">&#9432; Tubulação de incêndio: aço carbono SCH 40, ferro galvanizado ou CPVC (apenas ramais). C = 120 (conservador, NBR 13714).</p>`;
}
