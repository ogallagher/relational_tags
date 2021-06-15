# Owen Gallagher
# 13 June 2021

# imports

from typing import Tuple, List, Any, Dict, Union
import sys
import logging
from getopt import getopt, GetoptError
import random
import json

from util import STR_TO_LOG_LEVEL
from relational_tags import (
    RelationalTag, 
    RelationalTagConnection, 
    RelationalTagError, 
    RelationalEntity
)
import relational_tags as rtags

# types

class TestEntity:
    def __init__(self, age=5, name='entity'):
        self.age = age
        self.name = name
    # end __init__
# end TestEntity

class FalseRelEntity(RelationalEntity):
    def __init__(self,name:str):
        super().__init__()
        
        self.name = name
    # end __init__
    
    def __hash__(self):
        return hash(self.name)
    # end __hash__
    
    def __str__(self) -> str:
        return json.dumps({
            # class name missing
            'name': self.name
        })
    # end __str__
    
    @classmethod
    def load_entity(cls, entity_json:Union[str,Dict]) -> 'FalseRelEntity':
        if isinstance(entity_json,str):
            entity_json = json.loads(entity_json)
        
        return FalseRelEntity(
            name=entity_json['name']
        )
    # end load_entity
# end FalseRelEntity

class TestRelEntity(FalseRelEntity):
    def __init__(self,name:str):
        super().__init__(name)
    # end __init__
    
    def __str__(self) -> str:
        return json.dumps({
            'class': type(self).__name__,
            'name': self.name
        })
    # end __str__
# end TestRelEntity

# module vars

VERSION:str = '0.0.6'

log:logging.Logger

if __name__ == '__main__':
    logging.basicConfig()
    log = logging.getLogger()
else:
    log = logging.getLogger(__name__)

log.setLevel(logging.DEBUG)

# methods

def flat_tags(tag_names:List[str], entities:List[Any]) -> Tuple[str,int,int]:
    """Test flat tags.
    """
    
    name = 'flat-tags'
    passes = 0
    fails = 0
    len_tag_names = len(tag_names)
    
    rtags:List[RelationalTag] = []
    
    # create new tags using constructors
    for tag_name in tag_names:
        rtag = RelationalTag(name=tag_name)
    
    added = len(RelationalTag.all_tags)
    if added == len_tag_names:
        passes += 1
        log.debug('all tags after {}.constructors: {}'.format(
            name,
            ' '.join(RelationalTag.all_tags.keys())
        ))
    else :
        fails += 1
        log.error('found {} tags after creating {} unique tags'.format(added, len_tag_names))
    
    # reset tags
    deleted = RelationalTag.clear()
    if deleted == len_tag_names:
        passes += 1
    else:
        fails += 1
        log.error('found {} tags after clearing {} unique tags'.format(deleted, len_tag_names))
    
    # create new tags using class methods
    for tag_name in tag_names:
        rtag = RelationalTag.new(tag_name)
        
    added = len(RelationalTag.all_tags)
    if added == len_tag_names:
        passes += 1
        log.debug('all tags after {}.class-new: {}'.format(
            name,
            ' '.join(RelationalTag.all_tags.keys())
        ))
    else :
        fails += 1
        log.error('found {} tags after creating {} unique tags'.format(added, len_tag_names))
    
    # delete one tag via class method
    RelationalTag.delete(tag_names[0])
    if len(RelationalTag.all_tags) == len_tag_names - 1:
        passes += 1
    else:
        fails += 1
        log.error('failed to delete {} with class method'.format(tag_names[0]))
    
    # delete another tag via instance method
    rtag = RelationalTag.get(tag_names[1], new_if_missing=False)
    rtag.delete_self()
    if (len(RelationalTag.all_tags) == len_tag_names - 2):
        passes += 1
    else:
        fails += 1
        log.error('failed to delete {} with instance method'.format(rtag))
    
    # load flat tags
    RelationalTag.clear()
    RelationalTag.load(tag_names)
    if (len(RelationalTag.all_tags) == len_tag_names):
        passes += 1
    else:
        fails += 1
        log.error('failed to load flat tags')
    
    # tag-entity connections
    tags_per_entity = 3
    for entity in entities:
        for _ in range(tags_per_entity):
            # tag entities with class method
            RelationalTag.connect(
                tag_or_connection=RelationalTag.get(random.choice(tag_names)),
                target=entity
            )
            
            # tag entities with instance method
            rtag = RelationalTag.get(random.choice(tag_names))
            rtag.connect_to(other=entity)
        # end for _ in tags_per_entity
    # end for entity in entities
    
    tagged_entities = RelationalTag.get_tagged_entities()
    log.debug('all tagged entities:\n{}'.format(
        '\n'.join([
            '{}: {}'.format(
                entity,
                ' '.join([tag.name for tag in connections.keys()])
            )
            for entity, connections in tagged_entities
        ])
    ))
    if (len(tagged_entities) == len(entities)):
        passes += 1
    else:
        fails += 1
        log.error('failed to tag {} entities; found {} tagged entities'.format(
            len(entities), len(tagged_entities)
        ))
    
    # save and load single tag
    rtag_name = random.choice(tag_names)
    rtag_og = RelationalTag.get(rtag_name)
    rtag_str = RelationalTag.save_tag(rtag_name)
    rtag_og.delete_self()
    rtag_load = RelationalTag.load_tag(rtag_str)
    if rtag_og == rtag_load:
        passes += 1
        log.debug('saved and reloaded tag {} as {}'.format(
            rtag_og,
            rtag_load
        ))
    else:
        fails += 1
        log.error('failed to save and reload {} as {}'.format(
            rtag_og,
            rtag_load
        ))
    
    return (name, passes, fails)
# end flat_tags

def hier_tags(hier_tag_names:Dict[str,List[str]], entities:List[Any]) -> Tuple[str,int,int]:
    """Test hierarchical tags.
    """
    
    name = 'hier-tags'
    passes = 0
    fails = 0
    
    unique_tag_names = []
    for ktag,vtags in hier_tag_names.items():
        unique_tag_names.append(ktag)
        unique_tag_names += vtags
    
    unique_tag_names = set(unique_tag_names)
    log.debug('loading {} unique hierarchical tags'.format(len(unique_tag_names)))
    
    # test hierarchical tags load via dict
    rtags:List[RelationalTag] = RelationalTag.load(
        tags=hier_tag_names, 
        tag_tag_type=RelationalTagConnection.TO_TAG_CHILD
    )
    log.debug('\n' + '\n'.join(
        str(rtag)
        for rtag in rtags
    ))
    
    if len(rtags) == len(unique_tag_names):
        passes += 1
    else:
        fails += 1
        log.error('loaded {}/{} hierarchical tags'.format(len(rtags),len(unique_tag_names)))
        log.error('input tags: {}'.format(' '.join(unique_tag_names)))
        log.error('output tags: {}'.format(' '.join([rtag.name for rtag in rtags])))
    
    # save and load single tag
    rtag_og = random.choice(rtags)
    rtag_str = str(rtag_og)
    rtag_og.delete_self()
    rtag_load = RelationalTag.load_tag(rtag_str)
    if rtag_og == rtag_load:
        passes += 1
        log.debug('saved and reloaded tag {} as {}'.format(
            rtag_og,
            rtag_load
        ))
    else:
        fails += 1
        log.error('failed to save and reload {} as {}'.format(
            rtag_og,
            rtag_load
        ))
    
    return (name,passes,fails)
# end rel_tags

def module_funcs(hier_tag_names:Dict[str,List[str]], entities:List[Any]) -> Tuple[str,int,int]:
    name = 'module-funcs'
    passes = 0
    fails = 0
    
    # module.clear
    rtags.clear()
    if len(rtags.all_tags.keys()) == 0:
        passes += 1
    else:
        fails += 1
        log.error('failed to clear tags with module.clear; {} remaining'.format(len(rtags.all_tags.keys())))
    
    # populate tag system
    tags_og = rtags.load(tags=hier_tag_names,tag_tag_type=RelationalTagConnection.TO_TAG_CHILD)
    tags_str = rtags.save_json()
    rtags.clear()
    log.debug('tags json:\n{}\n'.format(tags_str))
    
    tags_load = rtags.load_json(tags_str)
    
    if len(tags_og) == len(tags_load):
        passes += 1
    else:
        fails += 1
        log.error('failed to save and reload relational tag systems of length {} != {}'.format(
            len(tags_og),
            len(tags_load)
        ))
    
    return (name,passes,fails)
# end module_funcs

def rents(tag_names:List[str]) -> Tuple[str,int,int]:
    name = 'rents'
    passes = 0
    fails = 0
    
    log.info('test loading and saving relational entities')
    
    # reset
    rtags.clear()
    
    frent = FalseRelEntity('frent-1')
    trent = TestRelEntity('trent-1')
    
    log.debug(RelationalEntity.classes)
    
    tags = rtags.load(tag_names)
    log.debug('loaded {} tags: {}'.format(len(tags), set(tag_names)))
    
    try:
        for i in range(len(tags) // 2):
            random.choice(tags).connect_to(frent)
            random.choice(tags).connect_to(trent)
        # end for i in len(tags) // 2
        
    except NotImplementedError:
        log.error('error tagging rel entities')
        raise
    
    log.debug('save rel tag system w rel entities')
    rents_orig = rtags.get_tagged_entities()
    log.debug('original tagged entities:\n{}\n'.format('\n'.join(
        [str(rent_orig) for rent_orig,rent_conns_orig in rents_orig]
    )))
    
    rtags_json = rtags.save_json()
    rtags.clear()
    
    log.debug('load rel tag system w rel entities')
    rtags.load_json(rtags_json)
    rents_load = rtags.get_tagged_entities()
    log.debug('loaded tagged entities:\n{}\n'.format('\n'.join(
        [str(rent_load) for rent_load,rent_conns_load in rents_load]
    )))
    
    if len(rents_load) == len(rents_orig) - 1:
        passes += 1
    else:
        fails += 1
        log.error('failed to load ({o}-1)/{o} valid rel entities'.format(
            o=len(rents_orig)
        ))
    
    return (name,passes,fails)
# end load_save_ents

def main():
    log.info('start relational tags python tests v{} for v{}'.format(
        VERSION,
        rtags.VERSION
    ))
    
    test_selection:List['str'] = ['all']
    
    # parse cli options
    if (len(sys.argv) - 1) > 0:
        try:
            opts,args = getopt(
                sys.argv[1:],
                shortopts='l:t:v',
                longopts=[
                    'logging=','tests=','version'
                ]
            )
            
            for opt,arg in opts:
                if opt in ['-l','--logging']:
                    level:int = STR_TO_LOG_LEVEL[arg.lower().strip()]
                    log.setLevel(level)
                    log.info('set logging to level {}={}'.format(arg,level))
                
                elif opt in ['-t','--tests']:
                    if ',' not in arg:
                        test_selection = [arg.lower().strip()]
                        
                    else:
                        test_selection = [
                            test.lower().strip()
                            for test in arg.split(',')
                        ]
                    
                    log.info('set test selection to {}'.format(
                        ','.join(test_selection)
                    ))
                
                elif opt in ['-v','--version']:
                    print('v{}'.format(VERSION))
                    quit()
            # end for opt,arg in opts
        
        except GetoptError as e:
            log.error(str(e))
    # end if cli options
    
    entities = [
        {'name': 'Owen Gallagher', 'github': 'https://github.com/ogallagher'},
        TestEntity(),
        ('tuple-1','tuple-2','tuple-3'),
        ['list-1','list-2','list-3']
    ]
    
    flat_tag_names = [
        'fruit',
        'apple','banana','cinnamon','orange',
        'animal',
        'elephant','fish','giraffe','hyena',
        'color',
        'indigo','red','green','blue','orange'
    ]
    
    hier_tag_names = {
        'fruit': ['apple','banana','cinnamon','donut','orange'],
        'animal': ['elephant','fish','giraffe','hyena'],
        'color': ['red','green','blue','yellow','orange','indigo']
    }
    
    if 'flat-tags' in test_selection or 'all' in test_selection:
        # test tags, flat
        name,passes,fails = flat_tags(flat_tag_names, entities)
        if fails == 0:
            log.info('{}: all {} tests passed'.format(name,passes))
        else:
            log.error('{}: {} passed, {} failed'.format(name,passes,fails))
    
    if 'hier-tags' in test_selection or 'all' in test_selection:
        name,passes,fails = hier_tags(hier_tag_names, entities)
        if fails == 0:
            log.info('{}: all {} tests passed'.format(name,passes))
        else:
            log.error('{}: {} passed, {} failed'.format(name,passes,fails))
    
    if 'module-funcs' in test_selection or 'all' in test_selection:
        name,passes,fails = module_funcs(hier_tag_names, entities)
        if fails == 0:
            log.info('{}: all {} tests passed'.format(name,passes))
        else:
            log.error('{}: {} passed, {} failed'.format(name,passes,fails))
    
    if 'rents' in test_selection or 'all' in test_selection:
        name,passes,fails = rents(flat_tag_names)
        if fails == 0:
            log.info('{}: all {} tests passed'.format(name,passes))
        else:
            log.error('{}: {} passed, {} failed'.format(name,passes,fails))
    
    log.info('end relational tags python tests')
# end main

# main

if __name__ == '__main__':
    main()
# end if main
