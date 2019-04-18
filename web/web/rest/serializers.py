from django.contrib.auth.models import User, Group
from rest_framework import serializers

import sys
import os

from web.rest.models import CollaborativeDocument

sys.path.append('/Users/john/onedrive/research/cw/cwvizdetail/source')


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ('url', 'username', 'email', 'groups')


class GroupSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Group
        fields = ('url', 'name')


class DocumentSerializer(serializers.Serializer):
    html = serializers.CharField()
    editors = serializers.ListField()
    tokens = serializers.ListField()
    revisions = serializers.ListField()
    conflict_score = serializers.IntegerField()
    rev_id = serializers.IntegerField()

    def create(self, validated_data):
        return CollaborativeDocument(**validated_data)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        return instance
