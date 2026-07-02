import json

from django.contrib.gis.geos import GEOSGeometry
from rest_framework import serializers

from .models import Talhao


class TalhaoSerializer(serializers.ModelSerializer):
    propriedade_nome = serializers.CharField(source="propriedade.nome", read_only=True)

    poligono = serializers.JSONField(required=False, allow_null=True)
    centroide = serializers.SerializerMethodField()
    centroide_latitude = serializers.SerializerMethodField()
    centroide_longitude = serializers.SerializerMethodField()
    bbox = serializers.SerializerMethodField()

    class Meta:
        model = Talhao
        fields = [
            "id",
            "usuario",
            "propriedade",
            "propriedade_nome",
            "nome",
            "cultivar",
            "sistema_cultivo",
            "data_plantio",
            "area_ha",
            "poligono",
            "centroide",
            "centroide_latitude",
            "centroide_longitude",
            "bbox",
            "observacoes",
            "ativa",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "usuario",
            "propriedade_nome",
            "centroide",
            "centroide_latitude",
            "centroide_longitude",
            "bbox",
            "created_at",
            "updated_at",
        ]

    def get_centroide(self, obj):
        if not obj.poligono:
            return None

        centroide = obj.centroide
        if not centroide:
            return None

        return {
            "type": "Point",
            "coordinates": [centroide.x, centroide.y],
        }

    def get_centroide_latitude(self, obj):
        if not obj.poligono:
            return None

        centroide = obj.centroide
        if not centroide:
            return None

        return centroide.y

    def get_centroide_longitude(self, obj):
        if not obj.poligono:
            return None

        centroide = obj.centroide
        if not centroide:
            return None

        return centroide.x

    def get_bbox(self, obj):
        if not obj.poligono:
            return None

        try:
            xmin, ymin, xmax, ymax = obj.poligono.extent
            return {
                "xmin": xmin,
                "ymin": ymin,
                "xmax": xmax,
                "ymax": ymax,
            }
        except Exception:
            return None

    def to_representation(self, instance):
        data = super().to_representation(instance)

        if instance.poligono:
            data["poligono"] = json.loads(instance.poligono.geojson)
        else:
            data["poligono"] = None

        return data

    def validate_poligono(self, value):
        if value in (None, "", {}):
            return None

        if isinstance(value, dict):
            value = json.dumps(value)

        if not isinstance(value, str):
            raise serializers.ValidationError(
                "O campo poligono deve ser enviado como GeoJSON válido."
            )

        try:
            geom = GEOSGeometry(value, srid=4326)
        except Exception as exc:
            raise serializers.ValidationError(
                f"GeoJSON inválido para polígono: {exc}"
            ) from exc

        if geom.geom_type != "Polygon":
            raise serializers.ValidationError(
                "O campo poligono deve ser um Polygon válido."
            )

        geom.srid = 4326
        return geom