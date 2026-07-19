// Estado do levantamento + persistência (localStorage p/ dados, IndexedDB p/ PDFs)

export const state = {
  projeto: null,
  pranchaAtualId: null,
  ambienteSelId: null,
  zoom: 1,
  mostrarNomes: true,
  view: 'planta',
  tool: null,          // 'calibrar' | 'lado' | 'perimetro' | 'linear' | 'contagem' | 'ambiente'
  desenho: null,       // pontos em curso da ferramenta ativa
};

const CHAVE = 'levantamento:projeto';

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function novoProjeto() {
  return { id: uid(), nome: 'Levantamento', criadoEm: new Date().toISOString(), pranchas: [] };
}

export function novaPrancha(arquivoNome, pagina, pavimento, disciplina) {
  return {
    id: uid(), arquivoNome, pagina, pavimento, disciplina,
    escala: null,                 // { pxPorMetro (unid. base pt/m), origem: 'cota'|'carimbo' }
    ambientes: [], medicoes: [],  // medições avulsas: linear / contagem
  };
}

export function novoAmbiente(nome, x, y) {
  return {
    id: uid(), nome, pin: { x, y },
    area: null, areaOrigem: null,   // 'planta' | 'medida' | 'manual'
    lado: '', perimetro: null,
    pdOsso: null, pdAcab: null,
    vaos: [], qtd: 1,
  };
}

export function pranchaAtual() {
  if (!state.projeto || !state.pranchaAtualId) return null;
  return state.projeto.pranchas.find(p => p.id === state.pranchaAtualId) || null;
}

export function ambienteSel() {
  const p = pranchaAtual();
  if (!p || !state.ambienteSelId) return null;
  return p.ambientes.find(a => a.id === state.ambienteSelId) || null;
}

export function salvar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(state.projeto)); }
  catch (e) { console.warn('Falha ao salvar projeto', e); }
}

export function carregarProjeto() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return JSON.parse(bruto);
  } catch (e) { console.warn('Falha ao carregar projeto', e); }
  return null;
}

/* ---------- IndexedDB: bytes dos PDFs (chave = prancha.id) ---------- */

function abrirDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open('levantamento', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('pdfs');
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function opPdf(modo, fn) {
  const db = await abrirDB();
  try {
    return await new Promise((res, rej) => {
      const tx = db.transaction('pdfs', modo);
      const req = fn(tx.objectStore('pdfs'));
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  } finally { db.close(); }
}

export const salvarPdf = (id, buf) => opPdf('readwrite', s => s.put(buf, id));
export const lerPdf = (id) => opPdf('readonly', s => s.get(id));
export const apagarPdf = (id) => opPdf('readwrite', s => s.delete(id));
