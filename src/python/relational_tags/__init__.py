# Owen Gallagher
# 13 June 2021

"""Relational tagging package.
"""

# imports

from typing import List, Dict, Union, Any, Tuple, Type
import sys
import traceback
import logging
from logging import Logger
import json

# module vars

VERSION:str = '0.0.9'
"""Package version.
"""

log:logging.Logger = logging.getLogger('rt')
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter(fmt='{levelname}\t{name}.{lineno}: {msg}', style='{')
handler.setFormatter(formatter)
log.addHandler(handler)

# types

class HashableEntity:
    """If an entity is not hashable, it is wrapped automatically with this class.
    
    You should not need to use this class yourself.
    
    If you want to create entities that have full support for relational tagging, 
    including being saved to a relational tags file and loaded from one, see
    `RelationalEntity`.
    """
    
    def __init__(self, entity:Any):
        try:
            self.hash = hash('{}@{}'.format(type(entity),id(entity)))
            """Hash value, using the type and memory address of the entity.
            """
        
            self.entity = entity
            """Entity value."""
            
        except:
            raise RelationalTagError(
                'unable to create relational entity from {}'.format(entity),
                RelationalTagError.TYPE_HASH_FAIL
            )
    # end __init__
    
    def __eq__(self, other:Any) -> bool:
        if isinstance(other,HashableEntity):
            return self.hash == other.hash
        
        if '__hash__' not in dir(other) or other.__hash__ is None:
            return self.hash == HashableEntity(other).hash
        
        else:
            return False
    # end __eq__
    
    def __hash__(self):
        return self.hash
    # end __hash__
# end HashableEntity

class RelationalEntity:
    """Relational entity abstract class.
    
    Subclass this abstract class and implement the required methods in order to 
    define an entity that is fully compatible with relational tagging.
    
    Note it is not necessary to use RelationalEntity subclasses in order to 
    use relational tagging; anything can be an entity and can be tagged. However, 
    subclasses if `RelationalEntity` are required in order to include them in the
    built-in persistence methods provided: `save_json`, `load_json`.
    """
    
    _ATTR_CLASS:str = 'class'
    
    classes:Dict[str,Type['RelationalEntity']] = {}
    """Maintains a name-class dictionary for identifying serialized subclass instances.
    
    Sublasses of `RelationalEntity` are automatically added to this dictionary with
    `RelationalEntity.__init__`.
    """
    
    @classmethod
    def load_entity(cls, entity_json:Union[str,Dict]) -> 'RelationalEntity':
        """A relational entity must be able to deserialize itself.
        
        Note this method will be used to deserialize an entity from its json string
        representation, or equivalent python dict.
        
        ## Args
        
        **entity_json** Either a json representation of the entity (created from 
        `RelaionalEntity.__str__`, or an equivalent python dict)
        """
        
        raise NotImplementedError(
            'RelationalEntity is an abstract class; subclass implements load_entity'
        )
    # end load_entity
    
    def __init__(self):
        """## RelationalEntity constructor.
        
        A subclass with its own constructor should call this superconstructor with:
        
        ```
        super().__init__()
        ```
        
        or implement equivalent code in its own constructor.
        """
        
        cls_name = RelationalEntity.__name__
        if cls_name not in RelationalEntity.classes:
            RelationalEntity.classes[cls_name] = RelationalEntity
        
        subcls = type(self)
        RelationalEntity.classes[subcls.__name__] = subcls
    # end __init__
    
    def __hash__(self):
        """A relational entity must be hashable.
        
        This method will be used to check equivalence between different entities and
        to use them as dictionary keys for quick access.
        """
        
        raise NotImplementedError(
            'RelationalEntity is an abstract class; subclass implements __hash__'
        )
    # end __hash__
    
    def __eq__(self, other) -> bool:
        """Default implementation of equality.
        
        You should not need to override this method unless you want more strict equality
        checking.
        """
        
        return hash(self) == hash(other)
    # end __eq__
    
    def __str__(self) -> str:
        """A relational entity must be able to serialize itself.
        
        Note this method will be used to serialize this instance so that it can be included
        in a relational tags json save file.
        
        ## Requirements
        
        Compatible with overridden `RelationalEntity.load_entity`.
        
        The resultant string is valid json.
        
        The json string represents a dictionary with the following initial structure:
        
        ```
        {
            "class": "<class-name>"  # <class-name> = type(self).__name__
        }
        ```
        """
        
        raise NotImplementedError(
            'RelationalEntity is an abstract class; subclass implements __str__'
        )
    # end __str__
# end RelationalEntity

class RelationalTag:
    """Relational tag class.
    
    A relational tag can be connected to an entity to categorize it, and also be connected to other
    relational tags.
    """
    
    log:Logger = log.getChild('RelationalTag')
    
    _is_case_sensitive:bool = False
    """Whether tag uniqueness is case-sensitive.
    
    **default** `False`
    """
    
    all_tags:Dict[str, 'RelationalTag'] = {}
    """All relational tags."""
    
    _tagged_entities:Dict[Any, Dict['RelationalTag','RelationalTagConnection']] = {}
    """All entities that have been assigned tags.
    
    Connections dict key per entity is equal to the connection's `target`.
    """
    
    @classmethod
    def config(cls, is_case_sensitive:bool=False):
        """Initial configuration.
        
        ## Configured variables
        
        `RelationalTag._is_case_sensitive`
        """
        
        cls._is_case_sensitive = is_case_sensitive
    # end config
    
    @classmethod
    def new(cls, name:str, get_if_exists:bool=True) -> 'RelationalTag':
        if not cls._is_case_sensitive:
            name = name.lower()
        
        try:
            rtag = RelationalTag(name=name)
            return rtag
        
        except RelationalTagError as e:
            cls.log.warning(str(e))
            
            if e.type == RelationalTagError.TYPE_COLLISION and get_if_exists:
                return cls.all_tags[name]
            else:
                raise e
        # end except
    # end new
    
    @classmethod
    def get(cls, name:str, new_if_missing:bool=True) -> 'RelationalTag':
        if not cls._is_case_sensitive:
            name = name.lower()
        
        try:
            rtag = cls.all_tags[name]
            return rtag
            
        except KeyError as e:
            cls.log.warning('relational tag {} not found'.format(name))
            
            if new_if_missing:
                rtag = RelationalTag(name=name)
                return rtag
            else:
                raise RelationalTagError(
                    'tag {} missing'.format(name), 
                    RelationalTagError.TYPE_MISSING
                )
        # end except
    # end get
    
    @classmethod
    def delete(cls, tag:Union[str,'RelationalTag']):
        try:
            # convert tag name to RelationalTag
            if isinstance(tag,str):
                if not cls._is_case_sensitive:
                    tag = tag.lower()
                
                tag = cls.all_tags[tag]
            # end if not RelationalTag
            
            cls.log.debug('deleting tag {}'.format(tag))
            
            # delete references from others
            for connection in list(tag.connections.values()):
                other = connection.target
                
                if isinstance(other, RelationalTag):
                    # disconnect from other tag
                    del other.connections[tag]
                
                else:
                    # disconnect from entity
                    del cls._tagged_entities[cls._entity_to_hashable(other)][tag]
            # end for connection in connections
            
            # delete tag
            del cls.all_tags[tag.name]
        
        except KeyError as e:
            cls.log.warning('cannot delete missing tag {}'.format(name))
    # end delete
    
    @classmethod
    def clear(cls) -> int:
        num_tags = len(cls.all_tags)
        
        cls.all_tags.clear()
        cls._tagged_entities.clear()
        
        return num_tags
    # end clear
    
    # TODO finish RelationalTag.load?
    @classmethod
    def load(cls, tags:Union[List[Union[str,'RelationalTag']],Dict[str,Union[str,List[str]]]], tag_tag_type:int='RelationalTagConnection.TO_TAG_CHILD') -> List['RelationalTag']:
        """Load a set of tags, including optional connection info for each.
        
        There are multiple ways to define a relational tags system:
        
        ## From Save
        
        Pass a list of `RelationalTag` instances as the `tags` arg.
        
        ## Flat
        
        Pass a list of tag name strings. Tags will not have any relationships with each other.
        Repeated tag names are allowed.
        
        Example:
        
        ```
        ['apple','banana','cinnamon','donut']
        ```
        
        ## Hierarchy
        
        Pass a dict, where each key is a tag name string, and each value is either a single
        tag name, or a list of tag names. Repeated tag names are allowed in both keys and values.
        
        Example:
        
        ```
        {
            'fruit': ['apple','banana','orange'],
            'food': ['fruit','vegetable'],
            'color': ['red','blue','green','orange'],
            'sport': 'football'
        }
        ```
        
        ## Args
        
        **tags** Relational tags, either as a list or dict. Entities not supported.
        
        **tag_tag_type** Specify what a key-value relationship in a dictionary means. Default
        of `RelationalTagConnection.TO_TAG_CHILD` means the key is the parent of the value. See 
        `RelationalTagConnection._TAG_TAG_TYPES` for possible values.
        """
        
        if isinstance(tags, List):
            for tag in tags:
                if isinstance(tag,RelationalTag):
                    if tag in all_tags:
                        log.warning('duplicate tag {} on load'.format(tag))
                    
                    all_tags[tag.name] = tag
                
                elif isinstance(tag,str):
                    cls.new(tag, get_if_exists=True)
                
                else:
                    raise RelationalTagError(
                        'unsupported tag type {}'.format(type(tag)),
                        type=RelationalTagError.TYPE_WRONG_TYPE
                    )
            # end for tag in tags
            
        elif isinstance(tags, Dict):
            for tag, value in tags.items():
                # create new parent tag
                rtag = cls.new(tag, get_if_exists=True)
                
                if isinstance(value,List):
                    # tag to many
                    for val in value:
                        ttag = cls.get(val, new_if_missing=True)
                        cls.connect(tag_or_connection=rtag, target=ttag, connection_type=tag_tag_type)
                
                elif isinstance(value,str):
                    # tag to one
                    ttag = cls.get(value, new_if_missing=True)
                    cls.connect(tag_or_connection=rtag, target=ttag, connection_type=tag_tag_type)
                
                else:
                    raise RelationalTagError(
                        'unsupported target type {}'.format(type(value)),
                        type=RelationalTagError.TYPE_WRONG_TYPE
                    )
            # end for tag,value in tags
            
        else:
            raise RelationalTagError(
                'unsupported tags type {}'.format(type(tags)),
                type=RelationalTagError.TYPE_WRONG_TYPE
            )
        
        return list(cls.all_tags.values())
    # end load
    
    @classmethod
    def _entity_to_hashable(cls,entity:Union[RelationalEntity,Any]) -> Union[HashableEntity,RelationalEntity,Any]:
        """Wraps the entity in a `HashableEntity` instance if not hashable already.
        
        A `RelationalEntity` subclass instance will be hashable, so it will be left alone.
        """
        
        if '__hash__' in dir(entity) and entity.__hash__ is not None:
            return entity
        
        else:
            return HashableEntity(entity)
    # end _entity_to_hashable
    
    @classmethod
    def _hashable_to_entity(cls,entity:Union[HashableEntity,Any]) -> Any:
        if isinstance(entity,HashableEntity):
            return entity.entity
        
        else:
            return entity
    # end _hashable_to_entity
    
    @classmethod
    def connect(cls, tag_or_connection:Union['RelationalTag','RelationalTagConnection'], target:Union['RelationalTag',Any]=None, connection_type:int=None) -> 'RelationalTagConnection':
        """Connect a tag with a target.
        """
        
        if isinstance(tag_or_connection, RelationalTagConnection):
            connection:RelationalTagConnection = tag_or_connection
            return cls.connect(connection.source, connection.target, connection.type)
        
        else:
            tag:RelationalTag = tag_or_connection
            
            # resolve connection type
            if connection_type is None:
                if isinstance(target,RelationalTag):
                    connection_type = RelationalTagConnection.TO_TAG_UNDIRECTED
                else:
                    connection_type = RelationalTagConnection.TO_ENT
            
            hashable_target = cls._entity_to_hashable(target)
            
            # connection
            connection = RelationalTagConnection(
                source=tag,
                target=target,
                connection_type=connection_type
            )
            tag.connections[hashable_target] = connection
            
            # inverse connection
            inverse_connection = connection.inverse()
            if isinstance(target,RelationalTag):
                # tag connection
                target.connections[tag] = inverse_connection
            else:
                # entity connection
                if not hashable_target in cls._tagged_entities:
                    cls._tagged_entities[hashable_target] = {}
                
                cls._tagged_entities[hashable_target][tag] = inverse_connection
        
            # return
            return connection
    # end connect
    
    @classmethod
    def disconnect(cls, tag_or_connection:Union['RelationalTag','RelationalTagConnection'], target:Union['RelationalTag',Any]=None):
        """Disconnect a tag from a target.
        
        ## Args
        
        **tag_or_connection** Either a relational tag source, or the connection that contains info
        about both the source and the target.
        
        **target** Connection target, or `None` if a connection was provided for `tag_or_connection`.
        """
        
        if isinstance(tag_or_connection, RelationalTagConnection):
            conn = tag_or_connection
            
            # disconnect connection
            if isinstance(conn.source, RelationalTag):
                cls.disconnect(conn.source, conn.target)
            else:
                cls.disconnect(conn.target, conn.source)
        # end if connection
        
        else:
            tag = tag_or_connection
            hashable_target = cls._entity_to_hashable(target)
            
            # disconnect tag-target
            del tag.connections[hashable_target]
            
            if isinstance(target, RelationalTag):
                # tag connection
                # disconnect target-tag
                del target.connections[tag]
            
            else:
                # entity connection
                # disconnect target-tag
                if hashable_target in cls._tagged_entities:
                    del cls._tagged_entities[hashable_target][tag]
                    
                else:
                    log.warning('entity {} already untagged'.format(target))
        # end if tag, target
    # end connect
    
    @classmethod
    def disconnect_entity(cls, entity:Union[RelationalEntity, Any]):
        """Disconnect the given entity from all tags.
        """
        
        hent = cls._entity_to_hashable(entity)
        
        if hent in cls._tagged_entities:
            # disconnect from tags
            # nested list comprehension to avoid iterating values while changing dict
            for conn in [conn for conn in cls._tagged_entities[hent].values()]:
                cls.log.debug('disconnect {}'.format(conn))
                cls.disconnect(conn)
            # end for conn in rent conns
            
            # remove from tagged entities
            del cls._tagged_entities[hent]
        
        else:
            cls.log.info('{} already not tagged'.format(entity))
    # end disconnect_entity
    
    @classmethod
    def get_tagged_entities(cls) -> List[Tuple[Any,Dict['RelationalTag','RelationalTagConnection']]]:
        tagged_entities:List[Tuple[Any,Dict['RelationalTag','RelationalTagConnection']]] = []
        
        for relational_entity,connections in cls._tagged_entities.items():
            raw_entity = cls._hashable_to_entity(relational_entity)
            tagged_entities.append((raw_entity, connections))
        
        return tagged_entities
    # end get_tagged_entities
    
    @classmethod
    def load_json(cls, json_in:str, get_if_exists:bool=True, skip_bad_conns:bool=False) -> List['RelationalTag']:
        """Load all tags and connections from a json string created by `RelationalTag.save_json`.
        """
        
        tag_dicts:List[Dict] = json.loads(json_in)
        
        cls.load(tags=[
            cls.load_tag(tag_str=tag_dict, get_if_exists=get_if_exists, skip_bad_conns=skip_bad_conns)
            for tag_dict in tag_dicts
        ])
        
        return list(cls.all_tags.values())
    # end load_json
    
    @classmethod
    def save_json(cls) -> str:
        """Save all tags and connections as a json string.
        """
        
        return '[{}]'.format(
            ','.join([
                str(tag) for tag in cls.all_tags.values()
            ])
        )
    # end save_json
    
    @classmethod
    def load_tag(cls, tag_str:Union[str,Dict], get_if_exists:bool=True, skip_bad_conns:bool=False) -> 'RelationalTag':
        """Load a tag from its json string representation, or equivalent dict.
        
        If the tag is connected to entities, each entity must be a serialized instance of a subclass
        of `RelationalEntity`.
        
        Raises `RelationalTagError` if the given tag string or dict is invalid.
        """
        
        # { name: [ [src,type,target] ... ] }
        if isinstance(tag_str,Dict):
            tag_json = tag_str
        else:
            try:
                tag_json:Dict[str,List[List[str]]] = json.loads(tag_str)
            except json.decoder.JSONDecodeError:
                cls.log.error(traceback.format_exc())
                raise RelationalTagError(
                    'unable to load tag from string {}'.format(tag_str),
                    RelationalTagError.TYPE_FORMAT
                )
        
        tag = cls.new(list(tag_json.keys())[0], get_if_exists)
        
        conn_arrs = tag_json[tag.name]
        for conn_arr in conn_arrs:
            connection_type = RelationalTagConnection.str_to_type(conn_arr[1])
            if connection_type in RelationalTagConnection._TAG_TAG_TYPES:
                target_tag = cls.get(conn_arr[2])
                
                cls.connect(
                    tag_or_connection=tag, 
                    connection_type=connection_type,
                    target=target_tag
                )
            # end if tag-tag
            else:
                try:
                    target_entity_json:Dict = conn_arr[2]
                    target_entity_cls:Type = RelationalEntity.classes[
                        target_entity_json[RelationalEntity._ATTR_CLASS]
                    ]
                    
                    target_entity:RelationalEntity = target_entity_cls.load_entity(
                        entity_json=target_entity_json
                    )
                    
                    cls.connect(
                        tag_or_connection=tag,
                        connection_type=connection_type,
                        target=target_entity
                    )
                # end try connect
                except (KeyError, json.decoder.JSONDecodeError) as e:
                    rt_error = RelationalTagError(
                        'loading of a tag-entity connection for {} is not supported: {}-{}-{}'.format(
                            conn_arr[2],
                            conn_arr[0], 
                            connection_type,
                            conn_arr[2]
                        ),
                        RelationalTagError.TYPE_FORMAT
                    )
                    
                    if skip_bad_conns:
                        cls.log.error(rt_error)
                    else:
                        raise rt_error
                # end except connect
            # end else tag-ent
        # end for conn_str in conns
        
        return tag
    # end from_string
    
    @classmethod
    def save_tag(cls, tag:Union[str, 'RelationalTag']) -> str:
        """Export the given tag or tag of given name as a string."""
        
        # convert to RelationalTag
        if isinstance(tag,str):
            tag = cls.get(name=tag, new_if_missing=False)
        
        # export
        return str(tag)
    # end save_tag
    
    @classmethod
    def search_by_tag(cls, tag:Union[str, 'RelationalTag'], include_tags_by_direction:int) -> List[Any]:
        """Find all entities directly and indirectly connected to this tag, in graph distance order ascending.
        
        :param tag:
        :param include_tags_by_direction:
        """
        
        raise NotImplementedError('search_by_tag not yet implemented')
    # end search_by_tag
    
    @classmethod
    def known(cls, node):
        raise NotImplementedError('known not yet implemented')
    # end known
    
    @classmethod
    def graph_path(cls, a, b):
        raise NotImplementedError('graph_path not yet implemented')
    # end graph_path
    
    @classmethod
    def graph_distance(cls, a, b):
        raise NotImplementedError('graph_distance not yet implemented')
    # end graph_distance
    
    def __init__(self, name:str):
        """RelationalTag constructor.
        """
        
        cls = type(self)
        
        if not cls._is_case_sensitive:
            name = name.lower()
        
        if name in cls.all_tags:
            raise RelationalTagError('tag {} already exists'.format(name))
        
        else:
            self.name = name
            """Tag name.
            """
            
            self.connections:Dict[Union[RelationalTag,Any], RelationalTagConnection] = {}
            """Tag connections (relationships).
            
            Connection keys are equal to `RelationalTagConnection.target`.
            """
            
            cls.all_tags[self.name] = self
    # end __init__
    
    def __str__(self) -> str:
        """RelationalTag in a json compatible string representation.
        """
        
        return '{{"{}":[{}]}}'.format(
            self.name,
            ','.join([str(conn) for conn in self.connections.values()])
        )
    # end __str__
    
    def __eq__(self, other) -> bool:
        return isinstance(other,RelationalTag) and hash(self) == hash(other)
    # end __eq__
    
    def __hash__(self):
        return hash(self.name)
    # end __hash__
    
    def connect_to(self, other:Union['RelationalTag',Any], connection_type:int=None) -> 'RelationalTagConnection':
        """Connect tag to another tag or entity.
        
        Calls the class method `RelationalTag.connect`.
        """
        
        return type(self).connect(
            tag_or_connection=self,
            target=other,
            connection_type=connection_type
        )
    # end connect_to
    
    def disconnect_to(self, other:Union['RelationalTag',Any]):
        """Disconnect tag from another tag or entity.
        
        Calls the class method `RelationalTag.disconnect`.
        """
        
        type(self).disconnect(tag=self,target=other)
    # end disconnect_to
    
    def delete_self(self):
        type(self).delete(self)
    # end delete
# end RelationalTag

class RelationalTagConnection:
    """Relational tag connection.
    """
    
    log:logging.Logger = log.getChild('RelationalTagConnection'.format(__name__))
    
    TO_TAG_UNDIRECTED:int = 1
    """Undirected tag-tag connection."""
    TO_TAG_PARENT:int = 2
    """Child-parent tag-tag connection."""
    TO_TAG_CHILD:int = 3
    """Parent-child tag-tag connection."""
    TO_ENT:int = 4
    """Tag-entity connection."""
    ENT_TO_TAG:int = 5
    """Entity-tag connection."""
    
    _TAG_TAG_TYPES:List[int] = [TO_TAG_UNDIRECTED,TO_TAG_PARENT,TO_TAG_CHILD]
    """All tag-tag connection types.
    
    ## Items
    
    `TO_TAG_UNDIRECTED`
    
    `TO_TAG_PARENT`
    
    `TO_TAG_CHILD`
    """
    
    _TAG_ENT_TYPES:List[int] = [TO_ENT,ENT_TO_TAG]
    """All tag-entity connection types.
    
    ## Items
    
    `TO_ENT`
    
    `ENT_TO_TAG`
    """
    
    _TYPES:List[int] = [
        TO_TAG_UNDIRECTED,TO_TAG_PARENT,TO_TAG_CHILD,TO_ENT,ENT_TO_TAG
    ]
    """All connection types.
    
    ## Items
    
    `TO_TAG_UNDIRECTED`
    
    `TO_TAG_PARENT`
    
    `TO_TAG_CHILD`
    
    `TO_ENT`
    
    `ENT_TO_TAG`
    """
    
    @classmethod
    def type_to_str(cls,type:int) -> str:
        """Convert connection type code to string.
        """
        
        if type == cls.TO_TAG_UNDIRECTED:
            return 'to-tag-undirected'
        
        elif type == cls.TO_TAG_PARENT:
            return 'to-tag-parent'
        
        elif type == cls.TO_TAG_CHILD:
            return 'to-tag-child'
            
        elif type == cls.TO_ENT:
            return 'to-entity'
            
        elif type == cls.ENT_TO_TAG:
            return 'entity-to-tag'
    # end type_to_str
    
    @classmethod
    def str_to_type(cls,string:str) -> int:
        """Convert connection type string to code.
        """
        
        if string == 'to-tag-undirected':
            return cls.TO_TAG_UNDIRECTED
        
        elif string == 'to-tag-parent':
            return cls.TO_TAG_PARENT
        
        elif string == 'to-tag-child':
            return cls.TO_TAG_CHILD
            
        elif string == 'to-entity':
            return cls.TO_ENT
            
        elif string == 'entity-to-tag':
            return cls.ENT_TO_TAG
    # end str_to_type
    
    @classmethod
    def inverse_type(cls,type:int) -> int:
        if type == cls.TO_TAG_PARENT:
            return cls.TO_TAG_CHILD
        
        elif type == cls.TO_TAG_CHILD:
            return cls.TO_TAG_PARENT
        
        elif type == cls.TO_ENT:
            return cls.ENT_TO_TAG
            
        elif type == cls.ENT_TO_TAG:
            return cls.TO_ENT
            
        else:
            return type
    # end reverse_type
    
    @classmethod
    def load_connection(cls, connection_str:str) -> 'RelationalTagConnection':
        """Load connection from string representation.
        """
        
        try:
            connection_arr:List[str] = json.loads(connection_str)
        except json.decoder.JSONDecodeError:
            cls.log.error(traceback.format_exc())
            raise RelationalTagError(
                'invalid connection string (probably includes unsupported entity)\n{}'.format(connection_str),
                RelationalTagError.TYPE_FORMAT
            )
        
        if len(connection_arr) == 3:
            source_str = connection_arr[0]
            connection_type = cls.str_to_type(connection_arr[1])
            target_str = connection_arr[2]
            invert:bool = False
            
            # load source
            if isinstance(source_str, str):
                # note RelationalEntity subclasses never serialize as an embedded string because of the
                # implementation requirements listed in `RelationalEntity.__str__`.
                source:RelationalTag = RelationalTag.get(source_str)
                invert = False
                
            else:
                invert = True
                
                try:
                    source_json:Dict = source_str
                    source_cls:Type = RelationalEntity.classes[
                        source_json[RelationalEntity._ATTR_CLASS]
                    ]
                    source:RelationalEntity = source_cls(source_json)
                
                except:
                    cls.log.warning('loading of a tag-entity connection for {} is not supported: {}-{}'.format(
                        source_str,
                        source_str, 
                        target_str
                    ))
                    return None
            # end else not str
            
            # load target
            if isinstance(target_str,str):
                target:RelationalTag = RelationalTag.get(target_str)
                
            else:
                try:
                    target_json:Dict = source_str
                    target_cls:Type = RelationalEntity.classes[
                        target_json[RelationalEntity._ATTR_CLASS]
                    ]
                    target:RelationalEntity = target_cls(target_json)
                
                except:
                    cls.log.warning('loading of a tag-entity connection for {} is not supported: {}-{}'.format(
                        target_str,
                        source_str, 
                        target_str
                    ))
                    return None
            # end else not str
            
            if invert:
                temp = source
                source = target
                target = temp
                del temp
            
            # load connection
            RelationalTag.connect(
                tag_or_connection=source,
                target=target,
                connection_type=connection_type
            )
        # end if conn arr length == 3
            
        else:
            raise RelationalTagError(
                'invalid connection string w embedded list length {}!=3\n{}'.format(
                    len(connection_arr),
                    connection_str
                ),
                RelationalTagError.TYPE_FORMAT
            )
    # end load_connection
    
    def __init__(self, source:RelationalTag, target:Union[RelationalTag,Any], connection_type=TO_ENT):
        """RelationalTagConnection constructor.
        """
        
        cls = type(self)
        
        self.source:RelationalTag = source
        """Connection source; must be a `RelationalTag`.
        """
        
        self.target:Union[RelationalTag,Any] = target
        """Connection target; either a `RelationalTag`, or an entity.
        """
        
        self.type = connection_type
        """Connection type. See `_TYPES` for possible values.
        """
        
        if self.type in cls._TAG_TAG_TYPES and not isinstance(target,RelationalTag):
            raise RelationalTagError(
                'cannot create {} connection with non-tag {}'.format(
                    cls.type_to_str(self.type),
                    target
                ),
                RelationalTagError.TYPE_WRONG_TYPE
            )
    # end __init__
    
    def __str__(self) -> str:
        """RelationalTagConnection string representation.
        
        Format is `[ source_str, type, target_str ]`, being a json compatible string.
        
        Tags are stored as name strings. `RelationalTag.__str__` is not used to avoid recursion.
        
        Entities are stored according to their `__str__` representation.
        """
        
        cls = type(self)
        
        if isinstance(self.source,RelationalTag):
            # don't use __str__, as it would case recursion
            source_str = '"{}"'.format(self.source.name)
        else:
            source_str = str(self.source)
        
        if isinstance(self.target,RelationalTag):
            # don't use __str__, as it would case recursion
            target_str = '"{}"'.format(self.target.name)
        else:
            target_str = str(self.target)
        
        return '[{},"{}",{}]'.format(source_str,cls.type_to_str(self.type),target_str)
    # end __str__
    
    def __eq__(self, other) -> bool:
        """Compare relational tag connections.
        
        Note this version of equality currently means self.inverse() != self.
        """
        
        return isinstance(other,RelationalTagConnection) and hash(self) == hash(other)
    # end __eq__
    
    def __hash__(self):
        return hash((str(self.source), str(self.target), self.type))
    # end __hash__
    
    def inverse(self) -> 'RelationalTagConnection':
        """Return inverse connection.
        """
        
        return RelationalTagConnection(
            source=self.target,
            target=self.source,
            connection_type=type(self).inverse_type(self.type)
        )
    # end inverse
    
    def disconnect(self):
        """Disconnect source and target.
        
        Convenience method for `RelationalTag.disconnect`.
        """
        
        RelationalTag.disconnect(tag_or_connection=self)
    # end disconnect
# end RelationalTagConnection

class RelationalTagError(Exception):
    """Relational tag error.
    """
    
    TYPE_COLLISION = 1
    TYPE_MISSING = 2
    TYPE_WRONG_TYPE = 3
    TYPE_HASH_FAIL = 4
    TYPE_FORMAT = 5
    
    def __init__(self, message, type=TYPE_COLLISION):
        """RelationalTagError constructor.
        """
        
        super().__init__(message)
        
        self.type = type
    # end __init__
# end RelationalTagError

# alias vars

all_tags = RelationalTag.all_tags
"""Alias for `RelationalTag.all_tags`.
"""

# alias methods

config = RelationalTag.config
"""Alias for `RelationalTag.config`"""

new = RelationalTag.new
"""Alias for `RelationalTag.new`"""

get = RelationalTag.get
"""Alias for `RelationalTag.get`"""

get_tagged_entities = RelationalTag.get_tagged_entities
"""Alias for `RelationalTag.get_tagged_entities`"""

delete = RelationalTag.delete
"""Alias for `RelationalTag.delete`"""

clear = RelationalTag.clear
"""Alias for `RelationalTag.clear`"""

load = RelationalTag.load
"""Alias for `RelationalTag.load`"""

connect = RelationalTag.connect
"""Alias for `RelationalTag.connect`"""

disconnect = RelationalTag.disconnect
"""Alias for `RelationalTag.disconnect`"""

disconnect_entity = RelationalTag.disconnect_entity
"""Alias for `RelationalTag.disconnect_entity`"""

load_json = RelationalTag.load_json
"""Alias for `RelationalTag.load_json`"""

save_json = RelationalTag.save_json
"""Alias for `RelationalTag.save_json`"""

load_tag = RelationalTag.load_tag
"""Alias for `RelationalTag.load_tag`"""

save_tag = RelationalTag.save_tag
"""Alias for `RelationalTag.save_tag`"""

search_by_tag = RelationalTag.search_by_tag
"""Alias for `RelationalTag.search_by_tag`"""

known = RelationalTag.known
"""Alias for `RelationalTag.known`"""

# exports

__all__ = [
    'VERSION',
    
    'RelationalTag',
    'RelationalTagConnection',
    'RelationalTagError',
    'RelationalEntity',
    
    'all_tags',
    
    'config',
    'new',
    'get',
    'get_tagged_entities',
    'delete',
    'clear',
    'load',
    'connect',
    'disconnect',
    'disconnect_entity',
    'load_json',
    'save_json',
    'load_tag',
    'save_tag',
    'search_by_tag',
    'known'
]
