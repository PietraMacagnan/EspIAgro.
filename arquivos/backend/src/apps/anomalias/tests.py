from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.monitoramento.models import Monitoramento
from apps.propriedades.models import Propriedade
from apps.talhoes.models import Talhao
from .models import Anomalia

User = get_user_model()


class AnomaliaModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="teste_anomalia",
            password="12345678",
        )

        self.propriedade = Propriedade.objects.create(
            usuario=self.user,
            nome="Fazenda Teste",
            municipio="Rondonópolis",
            uf="MT",
        )

        self.talhao = Talhao.objects.create(
            usuario=self.user,
            propriedade=self.propriedade,
            nome="Talhão A",
        )

        self.monitoramento = Monitoramento.objects.create(
            usuario=self.user,
            talhao=self.talhao,
            data_observacao=date.today(),
            estadio_fenologico="V4",
            cultura="Milho",
        )

    def test_criar_anomalia(self):
        anomalia = Anomalia.objects.create(
            monitoramento=self.monitoramento,
            tipo=Anomalia.TipoAnomalia.PRAGA,
            nome="Lagarta-do-cartucho",
            severidade=Anomalia.Severidade.MEDIA,
            percentual_plantas_afetadas=12.5,
            exige_atencao=True,
        )

        self.assertEqual(anomalia.nome, "Lagarta-do-cartucho")
        self.assertEqual(anomalia.tipo, Anomalia.TipoAnomalia.PRAGA)
        self.assertEqual(anomalia.monitoramento.talhao.nome, "Talhão A")