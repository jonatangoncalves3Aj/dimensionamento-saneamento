// Cálculos de Água Quente — NBR 7198

/* ── Consumo per capita de água quente por tipo de edificação ── */
const CONSUMO_AGUA_QUENTE = {
  residencial: { label: 'Residência',             q: 45,  obs: 'L/pessoa·dia a 40°C' },
  apartamento: { label: 'Apartamento',            q: 40,  obs: 'L/pessoa·dia a 40°C' },
  hotel:       { label: 'Hotel (hóspede)',         q: 60,  obs: 'L/hóspede·dia a 40°C' },
  hospital:    { label: 'Hospital (leito)',         q: 80,  obs: 'L/leito·dia a 40°C' },
  escola:      { label: 'Escola (aluno)',           q: 5,   obs: 'L/aluno·dia a 40°C' },
  academia:    { label: 'Academia / Vestiário',    q: 30,  obs: 'L/usuário·dia a 40°C' },
  escritorio:  { label: 'Escritório',              q: 5,   obs: 'L/funcionário·dia a 40°C' },
  restaurante: { label: 'Restaurante (refeição)',  q: 6,   obs: 'L/refeição a 40°C' },
};

function atualizarTipoEdificacaoAQ() {
  const tipo = document.getElementById('aq-tipo')?.value;
  const dado = CONSUMO_AGUA_QUENTE[tipo];
  if (!dado) return;
  const el = document.getElementById('aq-qpc');
  if (el) el.value = dado.q;
  const hint = document.getElementById('aq-tipo-hint');
  if (hint) hint.textContent = dado.obs;
}

/* ============================================================
   1. DEMANDA DE ÁGUA QUENTE
   ============================================================ */
function calcularDemandaAguaQuente() {
  const N    = parseFloat(document.getElementById('aq-n').value);
  const q    = parseFloat(document.getElementById('aq-qpc').value);
  const T_aq = parseFloat(document.getElementById('aq-t-uso').value) || 40;   // °C
  const T_fr = parseFloat(document.getElementById('aq-t-fria').value) || 22;  // °C
  const el   = document.getElementById('resultado-aq-demanda');

  if (!N || !q || N <= 0 || q <= 0) {
    mostrarErro(el, 'Preencha N e consumo per capita com valores positivos.');
    return;
  }
  if (T_aq <= T_fr) {
    mostrarErro(el, 'Temperatura de uso deve ser maior que a temperatura da água fria.');
    return;
  }

  const V_aq  = N * q;            // L/dia de água quente a T_aq
  const delta = T_aq - T_fr;      // ΔT (°C)

  // Volume equivalente de água fria misturada para obter T_mistura = 40°C
  // Balanço de energia: V_aq×T_aq + V_fr×T_fr = (V_aq+V_fr)×T_mis (já é T_aq)
  // Mas para chuveiro, o usuário mistura: consumo real = V_aq + V_fr
  // V_fria necessária para mistura a 40°C com água a T_aq e fria a T_fr
  const T_mis = 38;  // temperatura de conforto da mistura (~38°C chuveiro)
  const V_fr_mistura = V_aq * (T_aq - T_mis) / (T_mis - T_fr);
  const V_total_banho = V_aq + V_fr_mistura;

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Demanda de Água Quente</h4>
    <div class="result-main">
      <div><div class="label">Volume de AQ/dia</div><div class="value">${fmt(V_aq)} L/dia</div></div>
      <div><div class="label">ΔT</div><div class="value">${fmt(delta, 1)} °C</div></div>
    </div>
    <table class="result-table">
      <tr><td>Nº de pessoas / usuários (N)</td><td>${N}</td></tr>
      <tr><td>Consumo per capita água quente</td><td>${fmt(q)} L/un·dia a ${T_aq}°C</td></tr>
      <tr><td>Temperatura da água fria (T_fr)</td><td>${T_fr} °C</td></tr>
      <tr><td>Temperatura de uso da AQ (T_aq)</td><td>${T_aq} °C</td></tr>
      <tr><td>Volume diário de AQ necessário</td><td><strong>${fmt(V_aq)} L/dia a ${T_aq}°C</strong></td></tr>
      <tr><td>Volume de AF para mistura (ref. ${T_mis}°C)</td><td>${fmt(V_fr_mistura)} L/dia</td></tr>
      <tr><td>Volume total de mistura</td><td>${fmt(V_total_banho)} L/dia</td></tr>
    </table>
    <p class="status-msg">&#9432; Temperatura de uso recomendada: 38–42°C (banho). Sistema de aquecimento dimensionado para a temperatura de saída do gerador (T_aq).</p>`;
}

/* ============================================================
   2. AQUECEDOR / BOILER
   ============================================================ */
function atualizarTipoAquecedor() {
  const tipo = document.getElementById('aq-tipo-aq').value;
  document.getElementById('aq-bloco-eletrico').style.display = tipo === 'eletrico'    ? '' : 'none';
  document.getElementById('aq-bloco-gas').style.display      = tipo === 'gas'         ? '' : 'none';
  document.getElementById('aq-bloco-solar').style.display    = tipo === 'solar'       ? '' : 'none';
}

function calcularAquecedor() {
  const V_aq   = parseFloat(document.getElementById('aq2-vol').value);       // L/dia
  const T_aq   = parseFloat(document.getElementById('aq2-t-uso').value) || 40;
  const T_fr   = parseFloat(document.getElementById('aq2-t-fria').value) || 22;
  const tipo   = document.getElementById('aq-tipo-aq').value;
  const t_rec  = parseFloat(document.getElementById('aq2-t-rec').value) || 2; // h
  const el     = document.getElementById('resultado-aq-aquecedor');

  if (!V_aq || V_aq <= 0) {
    mostrarErro(el, 'Informe o volume diário de água quente necessário.');
    return;
  }
  if (T_aq <= T_fr) {
    mostrarErro(el, 'Temperatura de uso deve ser maior que a da água fria.');
    return;
  }

  const delta = T_aq - T_fr;  // °C
  // Energia necessária: E = m × c × ΔT    (c_água = 1 kcal/kg·°C = 4,186 kJ/kg·°C)
  const E_kcal = V_aq * 1.0 * delta;                  // kcal/dia (ρ≈1 kg/L)
  const E_kWh  = E_kcal / 860;                         // kWh/dia
  const E_kJ   = E_kcal * 4.186;                       // kJ/dia

  // Potência necessária para aquecer em t_rec horas
  const P_kW    = E_kWh / t_rec;                       // kW
  const P_kcalh = E_kcal / t_rec;                      // kcal/h

  let blocoTipo = '';

  if (tipo === 'eletrico') {
    const eta_el = parseFloat(document.getElementById('aq2-eta-el').value) / 100 || 0.95;
    const P_inst  = P_kW / eta_el;
    const corrente_220 = (P_inst * 1000) / 220;
    const corrente_110 = (P_inst * 1000) / 110;
    blocoTipo = `
      <tr><td colspan="2"><strong>Aquecedor Elétrico</strong></td></tr>
      <tr><td>Rendimento elétrico η</td><td>${(eta_el * 100).toFixed(0)}%</td></tr>
      <tr><td>Potência instalada necessária</td><td><strong>${fmt(P_inst, 2)} kW</strong></td></tr>
      <tr><td>Corrente (220 V)</td><td>${fmt(corrente_220, 1)} A</td></tr>
      <tr><td>Corrente (110 V)</td><td>${fmt(corrente_110, 1)} A</td></tr>`;
  } else if (tipo === 'gas') {
    const pcs_gas  = parseFloat(document.getElementById('aq2-pcs').value) || 8500;  // kcal/m³ GN
    const eta_gas  = parseFloat(document.getElementById('aq2-eta-gas').value) / 100 || 0.85;
    const V_gas    = (E_kcal / (pcs_gas * eta_gas));  // m³ GN/dia
    const Q_gas    = P_kcalh / (pcs_gas * eta_gas);   // m³/h vazão no pico
    blocoTipo = `
      <tr><td colspan="2"><strong>Aquecedor a Gás</strong></td></tr>
      <tr><td>Poder calorífico superior PCS</td><td>${fmt(pcs_gas)} kcal/m³</td></tr>
      <tr><td>Rendimento térmico η</td><td>${(eta_gas * 100).toFixed(0)}%</td></tr>
      <tr><td>Consumo de gás diário</td><td><strong>${fmt(V_gas, 3)} m³/dia</strong></td></tr>
      <tr><td>Vazão máxima de gás (pico)</td><td>${fmt(Q_gas, 3)} m³/h</td></tr>
      <tr><td>Capacidade do aquecedor</td><td>${fmt(P_kcalh / eta_gas)} kcal/h = ${fmt(P_kW / eta_gas, 2)} kW</td></tr>`;
  } else {
    // Solar
    const I_solar = parseFloat(document.getElementById('aq2-irrad').value) || 4.5;   // kWh/m²·dia
    const eta_col = parseFloat(document.getElementById('aq2-eta-col').value) / 100 || 0.60;
    const fs      = parseFloat(document.getElementById('aq2-fs-sol').value) / 100 || 0.70;  // fração solar
    const E_solar = E_kWh * fs;       // kWh/dia cobertura solar
    const A_col   = E_solar / (I_solar * eta_col);  // m²
    const nColMed  = Math.ceil(A_col / 2.0);        // nº de coletores (2 m² cada)
    const E_aux    = E_kWh * (1 - fs);               // kWh/dia backup elétrico/gás
    blocoTipo = `
      <tr><td colspan="2"><strong>Aquecedor Solar</strong></td></tr>
      <tr><td>Irradiação solar média diária (H)</td><td>${fmt(I_solar, 2)} kWh/m²·dia</td></tr>
      <tr><td>Rendimento dos coletores η</td><td>${(eta_col * 100).toFixed(0)}%</td></tr>
      <tr><td>Fração solar adotada (fs)</td><td>${(fs * 100).toFixed(0)}%</td></tr>
      <tr><td>Área de coletores necessária</td><td><strong>${fmt(A_col, 2)} m²</strong></td></tr>
      <tr><td>Nº de coletores (~2 m² cada)</td><td>${nColMed} painel(is)</td></tr>
      <tr><td>Energia de backup necessária</td><td>${fmt(E_aux, 3)} kWh/dia (${(1-fs)*100}% do total)</td></tr>`;
  }

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Sistema de Aquecimento</h4>
    <div class="result-main">
      <div><div class="label">Energia necessária</div><div class="value">${fmt(E_kWh, 3)} kWh/dia</div></div>
      <div><div class="label">Potência de aquecimento</div><div class="value">${fmt(P_kW, 2)} kW</div></div>
    </div>
    <table class="result-table">
      <tr><td>Volume de AQ a aquecer</td><td>${fmt(V_aq)} L/dia</td></tr>
      <tr><td>ΔT = T_uso − T_fria</td><td>${T_aq}°C − ${T_fr}°C = ${fmt(delta, 1)} °C</td></tr>
      <tr><td>Energia térmica necessária</td><td>${fmt(E_kcal)} kcal/dia = ${fmt(E_kWh, 3)} kWh/dia</td></tr>
      <tr><td>Tempo de recuperação adotado</td><td>${t_rec} h</td></tr>
      <tr><td>Potência de aquecimento base</td><td>${fmt(P_kW, 2)} kW = ${fmt(P_kcalh)} kcal/h</td></tr>
      ${blocoTipo}
    </table>
    <p class="status-msg">&#9432; Volume do boiler/reservatório térmico: geralmente 1 a 2× o consumo horário de pico. NBR 7198: temperatura de distribuição ≥ 60°C na saída do gerador para inibir Legionella.</p>`;
}

/* ============================================================
   3. TUBULAÇÃO DE ÁGUA QUENTE
   ============================================================ */
function calcularTubulacaoAguaQuente() {
  const Q   = parseFloat(document.getElementById('aq3-vazao').value);   // L/s
  const V   = parseFloat(document.getElementById('aq3-vel').value) || 1.5;
  const mat = document.getElementById('aq3-material').value;
  const el  = document.getElementById('resultado-aq-tubulacao');

  if (!Q || Q <= 0) {
    mostrarErro(el, 'Informe a vazão de projeto com valor positivo.');
    return;
  }

  const Qm3s = Q / 1000;
  const A    = Qm3s / V;
  const D    = 2 * Math.sqrt(A / Math.PI) * 1000;  // mm

  // DN comerciais por material
  const comerciais = {
    cpvc:  [15, 20, 25, 32, 40, 50, 60, 75],
    cobre: [12, 15, 18, 22, 28, 35, 42, 54, 76, 108],
    pprc:  [20, 25, 32, 40, 50, 63, 75, 90, 110],
  };
  const lista = comerciais[mat] || comerciais.cpvc;
  const DN    = lista.find(d => d >= D) || lista[lista.length - 1];
  const V_real = Qm3s / (Math.PI * (DN / 1000) ** 2 / 4);

  // Dilatação térmica: ΔL = α × L × ΔT   (CPVC α≈65×10⁻⁶; cobre≈17×10⁻⁶; PPR-C≈130×10⁻⁶)
  const alpha = { cpvc: 65e-6, cobre: 17e-6, pprc: 130e-6 };
  const alfa = alpha[mat] || alpha.cpvc;
  const L_ref = 10;       // m de tubulação de referência
  const delta_T = 50;     // ΔT típico
  const deltaL = alfa * L_ref * delta_T * 1000;  // mm por 10 m de tubo

  const matNomes = { cpvc: 'CPVC (para água quente)', cobre: 'Cobre', pprc: 'PPR-C (polipropileno copolímero)' };

  el.className = 'resultado resultado-ok';
  el.innerHTML = `
    <h4>Resultados — Tubulação de Água Quente</h4>
    <div class="result-main">
      <div><div class="label">DN adotado</div><div class="value">DN ${DN} mm</div></div>
      <div><div class="label">Material</div><div class="value">${matNomes[mat]}</div></div>
    </div>
    <table class="result-table">
      <tr><td>Vazão Q</td><td>${fmt(Q, 3)} L/s</td></tr>
      <tr><td>Velocidade adotada V</td><td>${fmt(V, 2)} m/s</td></tr>
      <tr><td>Diâmetro teórico</td><td>${fmt(D, 2)} mm</td></tr>
      <tr><td><strong>DN comercial adotado</strong></td><td><strong>DN ${DN} mm (${matNomes[mat]})</strong></td></tr>
      <tr><td>Velocidade real no DN adotado</td><td>${fmt(V_real, 3)} m/s</td></tr>
      <tr><td colspan="2"><strong>Dilatação térmica (ΔT = ${delta_T}°C)</strong></td></tr>
      <tr><td>Coef. dilatação linear α</td><td>${(alfa * 1e6).toFixed(0)} × 10⁻⁶ m/m·°C</td></tr>
      <tr><td>Expansão por 10 m de tubulação</td><td>${fmt(deltaL, 2)} mm — prever lira ou curva de dilatação</td></tr>
    </table>
    <p class="status-msg">&#9432; NBR 7198: isolamento térmico obrigatório em tubulações ≥ DN 25 mm e em trechos expostos. Temperatura de distribuição ≥ 60°C.</p>
    <p class="status-msg">&#9432; CPVC: máx. 95°C; PPR-C: máx. 95°C (PN 20); Cobre: máx. 110°C.</p>`;
}
