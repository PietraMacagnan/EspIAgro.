# apps/monitoramento/services/clima_service.py

import requests
from datetime import datetime


class ClimaService:
    BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def obter_clima(self, latitude: float, longitude: float) -> dict:
        """
        Consulta clima em tempo real via OpenWeather.

        Retorno padronizado:
        {
            "sucesso": bool,
            "dados": {...},
            "erro": str | None
        }
        """

        if latitude is None or longitude is None:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "Monitoramento sem coordenadas.",
            }

        if not self.api_key:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "API key não configurada.",
            }

        try:
            params = {
                "lat": latitude,
                "lon": longitude,
                "appid": self.api_key,
                "units": "metric",
                "lang": "pt_br",
            }

            response = requests.get(
                self.BASE_URL,
                params=params,
                timeout=10,
            )

            if response.status_code != 200:
                return {
                    "sucesso": False,
                    "dados": None,
                    "erro": f"Erro externo ({response.status_code}) ao consultar clima.",
                }

            data = response.json()

            # Segurança contra campos ausentes
            main = data.get("main", {})
            weather = data.get("weather", [{}])
            wind = data.get("wind", {})
            rain = data.get("rain", {})
            sys = data.get("sys", {})

            return {
                "sucesso": True,
                "erro": None,
                "dados": {
                    "temperatura": main.get("temp"),
                    "sensacao_termica": main.get("feels_like"),
                    "temperatura_min": main.get("temp_min"),
                    "temperatura_max": main.get("temp_max"),
                    "umidade": main.get("humidity"),
                    "pressao": main.get("pressure"),
                    "descricao": weather[0].get("description") if weather else None,
                    "icone": weather[0].get("icon") if weather else None,
                    "vento_velocidade": wind.get("speed"),
                    "chuva_mm": rain.get("1h") if rain else 0,
                    "cidade": data.get("name"),
                    "pais": sys.get("country"),
                    "timestamp": datetime.utcnow().isoformat(),
                },
            }

        except requests.exceptions.Timeout:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "Timeout ao consultar serviço de clima.",
            }

        except requests.exceptions.ConnectionError:
            return {
                "sucesso": False,
                "dados": None,
                "erro": "Erro de conexão com serviço de clima.",
            }

        except Exception as exc:
            return {
                "sucesso": False,
                "dados": None,
                "erro": f"Erro interno ao processar clima: {str(exc)}",
            }