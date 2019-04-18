from django.db import models

# Create your models here.


class CollaborativeDocument(object):
    # def __init__(self, **kwargs):
    #     for field in ('html'):
    #         setattr(self, field, kwargs.get(field, None))
    def __init__(self, html, editors, tokens, revisions, conflict_score, rev_id):
        self.html = html
        self.editors = editors
        self.tokens = tokens
        self.revisions = revisions
        self.conflict_score = conflict_score
        self.rev_id = rev_id
