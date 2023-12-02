# Owen Gallagher
# 13 June 2021

"""Relational tagging package.
"""

# imports

from typing import List, Dict, Union, Any, Tuple, Type, Set
import sys
import traceback
import logging
from logging import Logger
import json

# module vars

VERSION:str = '0.1.2'
"""Package version.
"""

log:logging.Logger = logging.getLogger('rt')
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter(fmt='{levelname}\t{name}.{lineno}: {msg}', style='{')
handler.setFormatter(formatter)
log.addHandler(handler)

Node = Union['RelationalTag', Any]
"""Alias for `Union[RelationalTag, Any]`, being a tag or an entity.
"""

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
    def load(cls, tags:Union[List[Union[str,'RelationalTag']],Dict[str,Union[str,List[str]]]], tag_tag_type:str=None) -> List['RelationalTag']:
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
        
        :param tags: Relational tags, either as a list or dict. Entities not supported.
        :param tag_tag_type: Specify what a key-value relationship in a dictionary means. Default
        of `RelationalTagConnection.TYPE_TO_TAG_CHILD` means the key is the parent of the value. See 
        `RelationalTagConnection._TAG_TAG_TYPES` for possible values.
        """
        
        if tag_tag_type is None:
            tag_tag_type = RelationalTagConnection.TYPE_TO_TAG_CHILD
        
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
    def connect(cls, tag_or_connection:Union['RelationalTag','RelationalTagConnection'], target:Node=None, connection_type:str=None) -> 'RelationalTagConnection':
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
                    connection_type = RelationalTagConnection.TYPE_TO_TAG_UNDIRECTED
                else:
                    connection_type = RelationalTagConnection.TYPE_TO_ENT
            
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
    def disconnect(cls, tag_or_connection:Union['RelationalTag','RelationalTagConnection'], target:Node=None):
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
        
        TODO only return the list of newly loaded tags.
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
            connection_type = conn_arr[1]
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
        """Export the given tag or tag of given name as a string.
        """
        
        # convert to RelationalTag
        if isinstance(tag,str):
            tag = cls.get(name=tag, new_if_missing=False)
        
        # export
        return str(tag)
    # end save_tag
    
    @classmethod
    def search_entities_by_tag(cls, tag:Union[str, 'RelationalTag'], search_direction:str=None, include_paths:bool=False) -> Union[List[Node],Dict[Node,List[Node]]]:
        """Find all entities directly and indirectly connected to this tag.
        
        :param tag: The tag or tag name.
        :param search_direction: Tag-tag connection direction for search. If default of
        `RelationalTagConnection.TYPE_TO_TAG_CHILD`, for example, then all entities connected to this tag, as
        well as all entities connected to descendants (instead of ancestors) of this tag, are returned.
        :param include_paths: Whether to return as a dictionary mapping entities to their paths from the start
        tag (`True`) or the return as a list of entities (`False`).
        """
        
        if search_direction is None:
            search_direction = RelationalTagConnection.TYPE_TO_TAG_CHILD
        
        if isinstance(tag, str):
            tag = cls.get(tag, new_if_missing=False)
        
        paths:Dict[Node, List[Node]] = cls._search_descendants(
            node=tag, 
            direction=search_direction, 
            include_entities=True, 
            include_tags=False
        )
        
        if include_paths:
            return paths
            
        else:
            return list(paths.keys())
    # end search_entities_by_tag
    
    @classmethod
    def _search_descendants(cls, node:Node, direction:str, include_entities:bool=True, include_tags:bool=False, visits:Set[Node]=None, path:List[Node]=None) -> Dict[Node, List[Node]]:
        """Internal helper method for searching the graph.
        
        Uses depth-first search to return the path to each found node from the start node. If the start node is
        an entity, the result is each of its tags, plus searches starting from each tag connected to the entity, 
        using the same tag-tag connection search direction as provided originally.
        
        :param node: The start tag or entity from which to begin searching.
        :param direction:
        :param include_entities: If `True`, each entity found after the start node is its own key in the 
        result dict.
        :param include_tags: If `True`, each tag found after the start node is its own key in the result dict.
        :param path: Path from an original start node to the current node.
        """
        
        if visits is None:
            visits = set()
        
        if path is None:
            path = [node]
        
        if cls.known(node):
            # add current node to visits
            visits.add(node)
            
            # create results dict for paths to each child
            results:Dict[Node, List[Node]] = {}
        
            if isinstance(node, RelationalTag):
                for child, conn in node.connections.items():
                    if child not in visits and (conn.type == direction or conn.type == RelationalTagConnection.TYPE_TO_ENT):
                        if isinstance(child, RelationalTag):
                            child_path:List[Node] = path + [child]
                            if include_tags:
                                # add tag as key in res
                                results[child] = child_path
                            
                            # search descendents of each child
                            child_results:Dict[Node, List[Node]] = cls._search_descendants(
                                node=child,
                                direction=direction,
                                include_entities=include_entities,
                                include_tags=include_tags,
                                visits=visits,
                                path=child_path
                            )
                            
                            # add child results to results
                            for key,val in child_results.items():
                                results[key] = val
                            
                        elif include_entities:
                            # add ent as key in res
                            results[child] = path + [child]
                            # stop here; don't search tags of an entity
                    # else, skip
                # end for children
            # end if tag
            
            else:                
                # combine searches of all tags
                for tag in cls._tagged_entities[node]:
                    # add tag to results
                    results[tag] = [tag]
                    
                    tag_results:Dict[Node, List[Node]] = cls._search_descendants(
                        node=tag,
                        direction=direction,
                        include_entities=include_entities,
                        include_tags=include_tags,
                        visits=visits,
                        path=[tag]
                    )
                    
                    # add tag results to results
                    for key,val in tag_results.items():
                        results[key] = val
            # end else ent
            
            return results
        # end if known
                
        else:
            # not in graph; empty results
            return {}
    # end _search_by_tag
    
    @classmethod
    def known(cls, node:Node) -> bool:
        """Whether the given tag or entity is present in the relational tags system/graph.
        
        :param node: The tag or entity to check.
        """
        
        if isinstance(node, RelationalTag):
            return node.name in cls.all_tags
        
        else:
            return cls._entity_to_hashable(node) in cls._tagged_entities
    # end known
    
    @classmethod
    def graph_path(cls, a:Node, b:Node=None) -> List[Node]:
        """Find the shortest path between two nodes in the relational tags graph.
        
        Connections are analagous to edges and tags and entities are analagous to nodes. Edge direction
        (connection type) is not considered.
        
        :param a:
        :param b:
        """
        
        if a == b or b is None:
            if cls.known(a):
                # circular path to oneself is length=1
                return [a]
            else:
                # node not in graph; empty path
                return []
        
        elif cls.known(a) and cls.known(b):
            path = cls._graph_path(a, b, set())
            
            if path is None:
                # nodes not connected; empty path
                return []
            else:
                # nodes in graph and connected; path exists
                return path
            
        else:
            # nodes not in graph; empty path
            return []
    # end graph_path
    
    @classmethod
    def _graph_path(cls, a, b, visits:Set[Node]) -> List:
        """Helper method for `RelationalTag.graph_path`.
        
        Assumes `a` and `b` are both in the graph.
        """
        
        # add current node to visits
        visits.add(a)
        
        connections:List[Node]
        if isinstance(a, RelationalTag):
            connections = list(a.connections)
        else:
            connections = list(cls._tagged_entities[a])
    
        # search outward connections
        nexts = []
        for node in connections:
            if node == b:
                # return path
                return [a, node]
            
            elif not node in visits:
                nexts.append(node)
            # else, skip visited node
        # end for connections
            
        if len(nexts) == 0:
            # no path found, no more unexplored nodes
            return None
        # end nexts empty
        
        else:
            # search next level
            for next in nexts:
                path = cls._graph_path(next, b, visits)
                
                if path is not None:
                    # return path
                    return [a] + path
                # end path
            # end for nexts
            
            # no path found in further levels
            return None
        # end nexts not empty
    # end _graph_path
    
    @classmethod
    def graph_distance(cls, a:Node, b:Node=None) -> int:
        """Find the shortest distance between two nodes in the relational tags graph.
        
        Calls `RelationalTag.graph_path` and then calculates graph distance as the number of edges:
        
        ```
        num_edges = graph_distance().length - 1
        ```
        
        - `distance == -1` means the nodes are not connected.
        - `distance == 0` means `a` and `b` are the same node.
        - `distance > 0` means the nodes are connected.
        
        :param a:
        :param b:
        """
        
        return len(cls.graph_path(a, b)) - 1
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
    
    def connect_to(self, other:Node, connection_type:str=None) -> 'RelationalTagConnection':
        """Connect tag to another tag or entity.
        
        Calls the class method `RelationalTag.connect`.
        """
        
        return type(self).connect(
            tag_or_connection=self,
            target=other,
            connection_type=connection_type
        )
    # end connect_to
    
    def disconnect_to(self, other:Node):
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
    
    TYPE_TO_TAG_UNDIRECTED:str = 'TO_TAG_UNDIRECTED'
    """Undirected tag-tag connection."""
    TYPE_TO_TAG_PARENT:str = 'TO_TAG_PARENT'
    """Child-parent tag-tag connection."""
    TYPE_TO_TAG_CHILD:str = 'TO_TAG_CHILD'
    """Parent-child tag-tag connection."""
    TYPE_TO_ENT:str = 'TO_ENT'
    """Tag-entity connection."""
    TYPE_ENT_TO_TAG:str = 'ENT_TO_TAG'
    """Entity-tag connection."""
    
    _TAG_TAG_TYPES:List[str] = [TYPE_TO_TAG_UNDIRECTED,TYPE_TO_TAG_PARENT,TYPE_TO_TAG_CHILD]
    """All tag-tag connection types.
    
    ## Items
    
    `TYPE_TO_TAG_UNDIRECTED`
    
    `TYPE_TO_TAG_PARENT`
    
    `TYPE_TO_TAG_CHILD`
    """
    
    _TAG_ENT_TYPES:List[str] = [TYPE_TO_ENT,TYPE_ENT_TO_TAG]
    """All tag-entity connection types.
    
    ## Items
    
    `TYPE_TO_ENT`
    
    `TYPE_ENT_TO_TAG`
    """
    
    _TYPES:List[str] = [
        TYPE_TO_TAG_UNDIRECTED,TYPE_TO_TAG_PARENT,TYPE_TO_TAG_CHILD,TYPE_TO_ENT,TYPE_ENT_TO_TAG
    ]
    """All connection types.
    
    ## Items
    
    `TYPE_TO_TAG_UNDIRECTED`
    
    `TYPE_TO_TAG_PARENT`
    
    `TYPE_TO_TAG_CHILD`
    
    `TYPE_TO_ENT`
    
    `TYPE_ENT_TO_TAG`
    """
    
    @classmethod
    def type_to_str(cls, type:str) -> str:
        """Convert connection type code to string. **deprecated**
        """
        
        return type
    # end type_to_str
    
    @classmethod
    def str_to_type(cls, string:str) -> str:
        """Convert connection type string to code. **deprecated**
        """
        
        return string
    # end str_to_type
    
    @classmethod
    def inverse_type(cls,type:str) -> str:
        if type == cls.TYPE_TO_TAG_PARENT:
            return cls.TYPE_TO_TAG_CHILD
        
        elif type == cls.TYPE_TO_TAG_CHILD:
            return cls.TYPE_TO_TAG_PARENT
        
        elif type == cls.TYPE_TO_ENT:
            return cls.TYPE_ENT_TO_TAG
            
        elif type == cls.TYPE_ENT_TO_TAG:
            return cls.TYPE_TO_ENT
            
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
            connection_type = connection_arr[1]
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
    
    def __init__(self, source:RelationalTag, target:Union[RelationalTag,Any], connection_type=TYPE_TO_ENT):
        """RelationalTagConnection constructor to create a new connection instance.

        This should not be called directly, as it doesn't register itself with the source or target.
        Use `RelationalTag.connect` instead.
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
        
        # validate type
        source_tag = isinstance(source, RelationalTag)
        target_tag = isinstance(target, RelationalTag)
        type_tag = self.type in self._TAG_TAG_TYPES
        type_ent = self.type in self._TAG_ENT_TYPES
        if source_tag and target_tag:
            if not type_tag:
                raise RelationalTagError(
                    f'cannot create {self.type} tags connection with {source} and {target}',
                    RelationalTagError.TYPE_WRONG_TYPE
                )
        # end tag-tag
        elif not source_tag and not target_tag:
            raise RelationalTagError(
                f'cannot create {self.type} connection between entities {source} and {target}',
                RelationalTagError.TYPE_WRONG_TYPE
            )
        # end ent-ent
        else:
            if not type_ent:
                raise RelationalTagError(
                    f'cannot create {self.type} connection without entities between {source} and {target}',
                    RelationalTagError.TYPE_WRONG_TYPE
                )
            elif source_tag and self.type == RelationalTagConnection.TYPE_ENT_TO_TAG:
                raise RelationalTagError(
                    f'cannot create {self.type} from tag {source} to entity {target}',
                    RelationalTagError.TYPE_WRONG_TYPE
                )
            elif target_tag and self.type == RelationalTagConnection.TYPE_TO_ENT:
                raise RelationalTagError(
                    f'cannot create {self.type} from entity {source} to tag {target}',
					RelationalTagError.TYPE_WRONG_TYPE
                )
        # end mixed
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
        
        return '[{},"{}",{}]'.format(source_str, self.type, target_str)
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

search_entities_by_tag = RelationalTag.search_entities_by_tag
"""Alias for `RelationalTag.search_entities_by_tag`"""

known = RelationalTag.known
"""Alias for `RelationalTag.known`"""

graph_path = RelationalTag.graph_path
"""Alias for `RelationalTag.graph_path`"""

graph_distance = RelationalTag.graph_distance
"""Alias for `RelationalTag.graph_distance`"""

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
    'search_entities_by_tag',
    'known',
    'graph_path',
    'graph_distance'
]
