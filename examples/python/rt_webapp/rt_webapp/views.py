from django.http import HttpResponseRedirect
from django.shortcuts import render

from .models import RtTagModel, RtEntityModel

import relational_tags as rt

# module vars

tag_models = []

# views

def index(request):
    """relational tags webapp index page.
    """
    
    # get tag connections
    connections = {}
    for conn_type in rt.RelationalTagConnection._TAG_TAG_TYPES:
        connections[conn_type] = rt.RelationalTagConnection.type_to_str(conn_type)
    # end for conn_type
    
    # pass data to template gui via context
    context = {
        'tags': [tag for tag in rt.all_tags.values()],
        'tags_json': rt.save_json(),
        'connections': connections
    }
    
    # render template
    return render(request, 'rt_webapp/index.html', context)
# end index

def new_tag(request):
    """relational tags webapp new_tag form handler
    """
    
    # create new tag
    new_tag = request.POST['tag_name']
    # convert new tag to RelationalTag
    try:
        # get existing tag
        new_tag = rt.get(name=new_tag, new_if_missing=False)
        
    except rt.RelationalTagError:
        # add new tag to database
        new_tag = rt.new(name=new_tag)
        
        new_tag_model = RtTagModel.create(tag=new_tag)
        new_tag_model.save()
    
    tag_target = request.POST['tag_target']
    tag_connection = request.POST['tag_connection']
    if (tag_target != '' and tag_connection != ''):
        # convert tag target to RelationalTag
        try:
            # get existing target tag
            tag_target = rt.get(name=tag_target, new_if_missing=False)
            
        except rt.RelationalTagError:
            # save new target tag to database
            tag_target = rt.new(name=tag_target)
            RtTagModel.create(tag=tag_target).save()
        
        # connect tag to target
        connection = rt.connect(
            tag_or_connection=new_tag, 
            target=tag_target, 
            connection_type=int(tag_connection)
        )
        print(connection)
        
        # save new connectionto db
        new_tag_model = RtTagModel.objects.get(tag_name=new_tag.name)
        new_tag_model.tag_json = str(new_tag)
        new_tag_model.save()
        
        tag_target_model = RtTagModel.objects.get(tag_name=tag_target.name)
        tag_target_model.tag_json = str(tag_target)
        new_tag_model.save()
    # end if tag_target and tag_connection
    
    # direct back to index page
    return HttpResponseRedirect('/')
# end new_tag

# main

def main():
    rt.config(is_case_sensitive=False)
    
    # load relational tags from db
    tag_models = RtTagModel.objects.all()
    
    for tag_model in tag_models:
        rt.load_tag(str(tag_model))
    # end for tag_model in tag_models
# end main

main()
