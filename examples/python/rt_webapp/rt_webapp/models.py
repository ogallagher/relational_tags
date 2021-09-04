# Owen Gallagher
# 2021-09-03
# rt webapp persistent rel-db compatible classes

from random import random
from django.db import models

import relational_tags as rt

# Create your models here.

class RtEntityModel(models.Model):
    """Encapsulate rt.RelationalEntity as a db model.
    """
    
    entity_json:str = models.TextField(
        blank=False,
        unique=True,
        help_text='Relational entity json string.'
    )
    
    @classmethod
    def create(cls, entity:rt.RelationalEntity) -> 'RtEntityModel':
        """Create RtEntityModel instance.
        """
        
        return cls(entity_json=str(entity))
    # end create
    
    def __str__(self):
        return self.entity_json
    # end __str__
# end RtEntityModel

class RtTagModel(models.Model):
    """Encapsulate rt.RelationalTag as a db model.
    
    Note that it would make much more sense to use the actual fields in a RelationalTag for creating
    relationships between tags and entities in the database.
    """
    
    tag_json:str = models.CharField(
        max_length=256,
        blank=False,
        unique=True,
        help_text='Relational tag json string.'
    )
    tag_name:str = models.CharField(
        max_length=128,
        blank=False,
        unique=True,
        help_text='Relational tag name.',
        default=str(random())
    )
    
    @classmethod
    def create(cls, tag:rt.RelationalTag) -> 'RtTagModel':
        """Create RtTagModel instance.
        """
        
        return cls(tag_json=str(tag),tag_name=tag.name)
    # end create
    
    def __str__(self):
        return self.tag_json
    # end __str__
# end RtTagModel
