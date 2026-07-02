from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date

from apps.propriedades.models import Propriedade
from apps.talhoes.models import Talhao
from .models import Monitoramento


User = get_user_model()


class MonitoramentoModelTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="teste",
            password="123456"
        )

        self.propriedade = Propriedade.objects.create(
            usuario=self.user,
            nome="Fazenda Teste"
        )

        self.talhao = Talhao.objects.create(
            usuario=self.user,
            propriedade=self.propriedade,
            nome="Talhão 1"
        )

    def test_criar_monitoramento(self):
        monitoramento = Monitoramento.objects.create(
            usuario=self.user,
            talhao=self.talhao,
            data_observacao=date.today(),
            estadio_fenologico="V4",
            cultura="Milho"
        )

        self.assertEqual(monitoramento.estadio_fenologico, "V4")
        self.assertEqual(monitoramento.talhao.nome, "Talhão 1")