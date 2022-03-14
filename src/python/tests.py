# Owen Gallagher
# 13 June 2021

# imports

from typing import *
import sys
import logging
from getopt import getopt, GetoptError
from unittest import TestCase
import random
import json
import traceback
import re

from relational_tags import (
    RelationalTag, 
    RelationalTagConnection, 
    RelationalTagError, 
    RelationalEntity
)
import relational_tags as rt

# types

class TestEntity:
    def __init__(self, age=5, name='entity'):
        self.age = age
        self.name = name
    # end __init__
# end TestEntity

class FalseRelEntity(RelationalEntity):
    def __init__(self, name:str):
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

VERSION:str = '0.0.9'

log:logging.Logger = logging.getLogger('tests')
log.setLevel(logging.DEBUG)

handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter(fmt='{name}.{levelname}.{lineno}: {msg}', style='{')
handler.setFormatter(formatter)
log.addHandler(handler)

# tests

class TestRelationalTags(TestCase):
    """Relational tags package general unit tests and base class.
    """
    
    log:logging.Logger
    
    @classmethod 
    def setUpClass(cls):
        cls.log = log.getChild(cls.__name__)
        cls.log.setLevel(logging.DEBUG)
        
        cls.log.info(f'begin relational tags {cls.__name__} tests')
    # end setUpClass
    
    @classmethod
    def tearDownClass(cls):
        cls.log.info(f'end relational tags {cls.__name__} tests')
    # end tearDownClass
    
    def setUp(self):
        cls = type(self)
        
        cls.log.debug('begin test')
    # end setUp
    
    def tearDown(self):
        cls = type(self)
        
        cls.log.debug('end test')
    # end tearDown
    
    def test_pkg_version(self):
        cls = type(self)
        setup_cfg_path:str = 'setup.cfg'
        
        with open(setup_cfg_path, mode='r') as f:
            setup_cfg:List[str] = f.read().split('\n')
            setup_cfg_version:Optional[str] = None
            for line in setup_cfg:
                parts = re.split(r'\s*=\s*', line, maxsplit=1)
                
                if len(parts) == 2 and parts[0].lower().strip() == 'version':
                    setup_cfg_version = parts[1]
            # end for line
            
            if setup_cfg_version is None:
                cls.log.warning(f'unable to parse version from {setup_cfg_path}')
            
            self.assertEqual(rt.VERSION, setup_cfg_version)
        # end with file
    # end test_pkg_version
# end TestRelationalTags

class TestFlatTags(TestRelationalTags):
    """General flat relational tags tests.
    """
    
    tag_names: List[str]
    
    raw_entities: List[Any]
    
    @classmethod
    def setUpClass(cls):
        """Reset initial flat tags.
        """
        
        super().setUpClass()
        
        cls.tag_names = [
            'fruit',
            'apple', 'banana', 'cinnamon', 'orange',
            'animal',
            'elephant', 'fish', 'giraffe', 'hyena',
            'color',
            'indigo', 'red', 'green', 'blue', 'orange'
        ]
        
        cls.raw_entities = [
            {'name': 'Owen Gallagher', 'github': 'https://github.com/ogallagher'},
            TestEntity(),
            ('tuple-1','tuple-2','tuple-3'),
            ['list-1','list-2','list-3']
        ]
    # end setUpClass
    
    def setUp(self):
        super().setUp()
        cls = type(self)
        
        cls.log.info('reset tags')
        rt.clear()
    # end setUp
    
    def test_new(self):
        cls = type(self)
        
        num_tags:int = len(set(cls.tag_names))
        cls.log.debug(f'create {num_tags} unconnected tags via module, class, and constructor methods')
        
        for i in range(len(cls.tag_names)):
            choice:int = i % 3
            tag_name:str = cls.tag_names[i]
            choice_name:str
            rtag:RelationalTag
            
            if choice == 0:
                choice_name = 'constructor'
                
                try:
                    rtag = RelationalTag(name=tag_name)
            
                except RelationalTagError as e:
                    if e.type == RelationalTagError.TYPE_COLLISION:
                        log.info(e)
                    else:
                        raise e
            
            elif choice == 1:
                choice_name = 'class'
                rtag = RelationalTag.new(name=tag_name)
                
            else:
                choice_name = 'module'
                rtag = rt.new(name=tag_name)
            
            self.assertTrue(rtag.name in rt.all_tags, f'{rtag} not found after {choice_name} create')
        # end for i in names
        
        self.assertEqual(len(RelationalTag.all_tags), num_tags)
    # end test_RelationalTag_constructor
    
    def test_rt_load(self):
        cls = type(self)
        
        num_tags:int = len(set(cls.tag_names))
        cls.log.debug(f'create {num_tags} unconnected tags via names list load')
        rt.load(cls.tag_names, tag_tag_type=RelationalTagConnection.TO_TAG_UNDIRECTED)
        
        self.assertEqual(num_tags, len(rt.all_tags))
        
        cls.log.debug('all tags after rt.load: {}'.format(
            ' '.join(RelationalTag.all_tags.keys())
        ))
    # end test_rt_load
    
    def test_delete(self):
        cls = type(self)
        
        rt.load(cls.tag_names)
        
        tag_name:str = cls.tag_names[0]
        cls.log.debug(f'delete {tag_name} via module, class, and instance methods')
        
        rt.delete(tag_name)
        self.assertTrue(tag_name not in rt.all_tags, f'{tag_name} found after module delete')
        
        rt.new(tag_name)
        RelationalTag.delete(tag_name)
        self.assertTrue(tag_name not in rt.all_tags, f'{tag_name} found after class delete')
        
        rt.new(tag_name)
        RelationalTag.delete(tag_name)
        self.assertTrue(tag_name not in rt.all_tags, f'{tag_name} found after class delete')
    # end test_delete
    
    def test_get(self):
        cls = type(self)
        
        rt.load(cls.tag_names)
        
        for i in [0, -1]:
            with self.subTest(i=i):
                tag_name:str = cls.tag_names[i]
                self.assertEqual(rt.get(tag_name).name, tag_name, f'failed to get tags[{i}]={tag_name}')
        # end for i
        
        # fail if not exists
        with self.assertRaises(RelationalTagError):
            rt.get('zamboni', new_if_missing=False)
    # end test_get
    
    def test_connect(self):
        cls = type(self)
        
        # tag-entity connections
        tags_per_entity = 3
        for entity in cls.raw_entities:
            for i in range(tags_per_entity):
                tag:RelationalTag = rt.get(random.choice(cls.tag_names))
                
                with self.subTest(entity=entity, tag=tag):
                    hashable_entity = RelationalTag._entity_to_hashable(entity)
                    
                    # tag entities with class method
                    conn:RelationalTagConnection
                    if i % 2 == 0:
                        conn = RelationalTag.connect(
                            tag_or_connection=tag,
                            target=entity
                        )
                    else:
                        conn = tag.connect_to(other=entity)
                    
                    self.assertEqual(conn.source, tag)
                    self.assertEqual(conn.target, entity)
                    self.assertEqual(
                        tag.connections[hashable_entity],
                        conn,
                        f'{tag.connections[hashable_entity]} != {conn}'
                    )
                    self.assertEqual(
                        RelationalTag._tagged_entities[hashable_entity][tag],
                        conn.inverse(),
                        f'{RelationalTag._tagged_entities[hashable_entity][tag]} != {conn}'
                    )
                # end with subTest
            # end for _ in tags_per_entity
        # end for entity in entities
        
        self.assertEqual(
            len(RelationalTag._tagged_entities), 
            len(cls.raw_entities), 
            'not all entities are tagged'
        )
    # end test_connect
    
    def test_save_load_tag(self):
        cls = type(self)
        
        rt.load(cls.tag_names)
        
        # create connections
        min_conns_per_tag:int = 3
        for tag in set(cls.tag_names):
            for _ in range(min_conns_per_tag):
                rt.connect(rt.get(tag), rt.get(random.choice(cls.tag_names)))
        
        num_conns:int = len(rt.get(cls.tag_names[0]).connections)
        self.assertTrue(
            num_conns >= min_conns_per_tag,
            f'tag found with connection count {num_conns} < {min_conns_per_tag}'
        )
        
        # save and load all tags
        for tag_name in cls.tag_names:
            tag_og = RelationalTag.get(tag_name, new_if_missing=True)
            tag_str = RelationalTag.save_tag(tag_name)
            tag_og.delete_self()
            
            with self.subTest(tag_og=tag_og, tag_str=tag_str):
                try:
                    tag_load = RelationalTag.load_tag(tag_str)
                    
                    self.assertEqual(
                        tag_og, 
                        tag_load,
                        f'failed to save and reload {tag_og} as {tag_load} using string {tag_str}'
                    )
                
                except RelationalTagError:
                    cls.log.error(traceback.format_exc())
                    self.assertTrue(False, 'failed to save and reload {tag_og} using string {tag_str}')
            # end with subTest
        # end for tag_name in tag_names
    # end test_save_load_tag
# end TestFlatTags

class TestHierTags(TestRelationalTags):
    """General hierarchical relational tags tests.
    """
    
    hier_tag_names: Dict[str, Union[List[str],str]]
    
    @classmethod
    def setUpClass(cls):
        """Init test class.
        """
        
        super().setUpClass()
        
        cls.hier_tag_names = {
            'fruit': ['apple','banana','cinnamon','donut','orange'],
            'animal': ['elephant','fish','giraffe','hyena'],
            'color': ['red','green','blue','yellow','orange','indigo']
        }
        cls.log.info(cls.hier_tag_names)
    # end setUpClass
    
    def setUp(self):
        super().setUp()
        cls = type(self)
        
        cls.log.info('rebuild tags hierarchy')
        rt.clear()
        rt.load(tags=cls.hier_tag_names, tag_tag_type=RelationalTagConnection.TO_TAG_CHILD)
    # end setUp
    
    def test_load(self):
        cls = type(self)
        
        all_tag_names:List[str] = list(cls.hier_tag_names.keys())
        for vtags in cls.hier_tag_names.values():
            all_tag_names.extend(vtags)
        
        self.assertEqual(len(rt.all_tags), len(set(all_tag_names)))
        
        for name in cls.hier_tag_names.keys():
            with self.subTest(name=name):
                self.assertEqual(rt.get(name, new_if_missing=False).name, name)
            
            for target in cls.hier_tag_names[name]:
                with self.subTest(source=name, target=target):
                    self.assertTrue(
                        rt.get(target) in rt.get(name, new_if_missing=False).connections
                    )
            # end for target
        # end for name
    # end test_load
    
    def test_save_load_tag(self):
        # save and load every tag
        tags = list(rt.all_tags.values())
        for tag in tags:
            with self.subTest(tag=tag):
                tag_str = str(tag)
                tag.delete_self()
                tag_load = RelationalTag.load_tag(tag_str)
                
                self.assertEqual(
                    tag, 
                    tag_load,
                    f'failed to save and reload {tag} with string {tag_str}'
                )
            # end with subTest
        # end for rtag in rtags
    # end test_save_load_tag
# end TestHierTags

class TestRelationalEntities(TestRelationalTags):
    """Test usage of relational entities that subclass `RelationalEntity`.
    """
    
    entities: List[Any]
    frent: FalseRelEntity
    trent: TestRelEntity
    
    root: RelationalTag
    leaf: RelationalTag
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        
        cls.frent = FalseRelEntity('frent-1')
        cls.trent = TestRelEntity('trent-1')
        cls.entities = [
            cls.frent,
            cls.trent
        ]
    # end setUpClass
    
    def setUp(self):
        cls = type(self)
        
        # reset tags
        rt.clear()
        
        # construct a particular graph
        cls.root = rt.new('root')
        cls.leaf = rt.new('leaf')
        
        cls.root.connect_to(cls.leaf)
        for entity in cls.entities:
            cls.leaf.connect_to(entity)
    # end setUp
    
    def test_save_load(self):
        cls = type(self)
        
        rents_orig = rt.get_tagged_entities()
        log.debug('original tagged entities:\n{}\n'.format('\n'.join(
            [str(rent_orig) for rent_orig,rent_conns_orig in rents_orig]
        )))
        
        log.debug('save rel tag system w rel entities')
        rt_json = rt.save_json()
        log.debug('rt.save_json => {}:{}'.format(type(rt_json), rt_json))
        
        # clear relational tags system for reload
        rt.clear()
        
        log.debug('load rel tag system w rel entities')
        rt.load_json(rt_json, get_if_exists=True, skip_bad_conns=True)
        rents_load = rt.get_tagged_entities()
        log.debug('loaded tagged entities:\n{}\n'.format('\n'.join(
            [str(rent_load) for rent_load,rent_conns_load in rents_load]
        )))
        
        self.assertFalse(
            cls.frent in RelationalTag._tagged_entities,
            f'false relational entity {cls.frent} somehow loaded'
        )
        self.assertTrue(
            cls.trent in RelationalTag._tagged_entities,
            f'true relational entity {cls.trent} not loaded'
        )
        self.assertTrue(
            rt.get('leaf') in RelationalTag._tagged_entities[cls.trent],
            f'failed to find tag leaf in connections for entity {RelationalTag._tagged_entities[cls.trent]}'
        )
    # end test_save_load
# end TestRelationalEntities

if __name__ == '__main__':
    log.info('start relational tags python tests v{} for v{}'.format(
        VERSION,
        rt.VERSION
    ))
    
    unittest.main()
