import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

from agente import linkedin, rascunhos


class TestRascunhos(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.pasta = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_fluxo_e_agendamento(self):
        r = rascunhos.criar("tema", "texto", ["saneamento"], "dica", self.pasta)
        self.assertEqual(rascunhos.listar(rascunhos.PENDENTE, self.pasta)[0]["id"], r["id"])
        r["status"] = rascunhos.APROVADO
        r["agendado_para"] = (datetime.now() - timedelta(minutes=1)).isoformat()
        rascunhos.salvar(r, self.pasta)
        self.assertEqual(len(rascunhos.prontos_para_publicar(pasta=self.pasta)), 1)
        r["agendado_para"] = (datetime.now() + timedelta(days=1)).isoformat()
        rascunhos.salvar(r, self.pasta)
        self.assertEqual(rascunhos.prontos_para_publicar(pasta=self.pasta), [])

    def test_validacao(self):
        self.assertEqual(rascunhos.validar({"texto": "ok", "hashtags": ["a"]}), [])
        self.assertTrue(rascunhos.validar({"texto": "x" * 3100, "hashtags": []}))
        self.assertTrue(rascunhos.validar({"texto": "ok", "hashtags": list("abcdef")}))
        self.assertTrue(rascunhos.validar({"texto": "  ", "hashtags": []}))


class TestLinkedin(unittest.TestCase):
    def test_escape_preserva_hashtag(self):
        self.assertEqual(linkedin.escapar_texto("NBR (9649) #esgoto @x"), r"NBR \(9649\) #esgoto \@x")

    def test_montar_texto(self):
        self.assertEqual(linkedin.montar_texto("Olá", ["#agua", "meio ambiente"]), "Olá\n\n#agua #meioambiente")


if __name__ == "__main__":
    unittest.main()
