# Owen Gallagher
# 2021-09-03
# rt webapp url config

from django.urls import path

from . import views

app_name='rt_webapp'

urlpatterns = [
    # root --> index
    path(route='', view=views.index, name='index'),
    
    # new_tag form handler
    path(route='new_tag', view=views.new_tag, name='new_tag')
]
