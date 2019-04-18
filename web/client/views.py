from django.shortcuts import render

# Create your views here.

from django.http import HttpResponse


def index(request):
    return HttpResponse("Hello, world. You're at the polls index.")


#from django.views.generic.simple import direct_to_template
#from django.template import Context, loader
from django.shortcuts import render_to_response


def detail(request):
    #return HttpResponse("Hello, WTF.")
    #return render(request, '/client/detail.html')
    #return direct_to_template(request, 'detail.html')
    #template = loader.get_template("client/detail.html")
    #return HttpResponse(template.render())
    return render_to_response('client/detail.html')

def sunburst(request):
    #return HttpResponse("Hello, WTF.")
    #return render(request, '/client/detail.html')
    #return direct_to_template(request, 'detail.html')
    #template = loader.get_template("client/detail.html")
    #return HttpResponse(template.render())
    return render_to_response('client/sunburst.html')

