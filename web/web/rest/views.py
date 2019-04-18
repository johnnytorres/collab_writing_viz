from django.shortcuts import render

# Create your views here.

from django.contrib.auth.models import User, Group
from rest_framework import viewsets, status

from web.rest.models import CollaborativeDocument
from web.rest.serializers import UserSerializer, GroupSerializer,DocumentSerializer

from rest_framework.response import Response
import json
import jsonpickle
import os



class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer


class GroupViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows groups to be viewed or edited.
    """
    queryset = Group.objects.all()
    serializer_class = GroupSerializer


class DocumentViewSet(viewsets.ViewSet):
    # html = cwservice.process_document()
    # doc = CollaborativeDocument(html=html)
    # queryset = doc
    serializer_class = DocumentSerializer

    def list(self, request):
        #html, tokens, editors, revisions, score, rev_id = cwservice.process_document()

        print(os.getcwd())

        with open('web/rest/html.txt', 'r') as f:
            html = json.load(f)

        with open('web/rest/tokens.txt', 'r') as f:
            tokens = json.load(f)

        with open('web/rest/editors.txt','r') as f:
            editors = json.load(f)

        with open('web/rest/revisions.json', 'r') as f:
            revisions = f.read()

        #TODO: the sunburst visualization should read the file from here

        revisions = jsonpickle.decode(revisions)

        tokens
        rev_id=11819
        score = 0


        doc = CollaborativeDocument(html=html, tokens=tokens, editors=editors, revisions=revisions, conflict_score=score, rev_id=rev_id)
        serializer = DocumentSerializer(instance=doc, many=False)
        return Response(serializer.data)

    # def create(self, request):
    #     serializer = DocumentSerializer(data=request.data)
    #     if serializer.is_valid():
    #         html = cwservice.process_document()
    #         doc = CollaborativeDocument(html=html)
    #         serializer = DocumentSerializer(doc)
    #
    #         return Response(serializer.data, status=status.HTTP_201_CREATED)
    #     return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    #
    def retrieve(self, request, pk=None):
        try:
            html = cwservice.process_document()
            doc = CollaborativeDocument(html=html)
        except KeyError:
            return Response(status=status.HTTP_404_NOT_FOUND)
        except ValueError:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        serializer = DocumentSerializer(doc)
        return Response(serializer.data)