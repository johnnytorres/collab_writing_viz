from django.conf.urls import url
from django.views.generic.base import TemplateView
from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^detail/$', views.detail, name='detail'),
    url(r'^sunburst/$', views.sunburst, name='sunburst'),
    #url(r'^detail/$', TemplateView.as_view(template_name='detail.html'), name='detail'),
]