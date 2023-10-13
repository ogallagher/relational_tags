package com.nom;

import java.lang.Runtime.Version;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Set;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.nom.RelationalTagConnection.ConnectionType;
import com.nom.RelationalTagException.ExceptionType;

/**
 * A relational tag instance can be connected to an entity to categorize it, and also be connected
 * to other relational tags.
 */
public class RelationalTag {
    private static final Logger logger = Logger.getLogger(RelationalTag.class.getName());

    /**
     * Whether tag names are case sensitive.
     */
    private static boolean isCaseSensitive = false;

    /**
     * All relational tags.
     */
    private static HashMap<String, RelationalTag> allTags = new HashMap<>();

    /**
     * All tagged entities.
     * 
     * This enables association of any entity with tags, without modifying the target entity.
     */
    private static HashMap<Object, HashMap<RelationalTag, RelationalTagConnection>> taggedEntities = new HashMap<>();

    /**
     * Relational tag name.
     */
    private String name;

    /**
     * Relational tag connections. This is how we keep track of tag-[entity,tag] relationships.
     */
    private HashMap<Object, RelationalTagConnection> connections;

    /**
     * Constructor to create a new relational tag.
     * 
     * @param name The name/label/value of this tag.
     * 
     * @throws RelationalTagException This tag already exists. Use {@link RelationalTag#newTag(String, boolean)} for
     * get-if-exists behavior.
     */
    public RelationalTag(String name) throws RelationalTagException {
        if (name == null) {
            throw new RelationalTagException(
                "tag name must be non null string", 
                ExceptionType.WRONG_TYPE
            );
        }
        this.name = RelationalTag.isCaseSensitive ? name : name.toLowerCase();

        if (RelationalTag.allTags.containsKey(this.name)) {
            throw new RelationalTagException(
                "tag " + this.name + " already exists",
                ExceptionType.COLLISION
            );
        }
        else {
            // register tag
            RelationalTag.allTags.put(this.name, this);
            this.connections = new HashMap<>();
            logger.info("created new tag " + this.name);
        }
    }

    /**
     * Convenience wrapper for {@link RelationalTag#connect(RelationalTag, Object, ConnectionType)}.
     * 
     * @param other
     * @param connectionType
     * 
     * @throws RelationalTagException
     */
    public RelationalTagConnection connectTo(Object other, ConnectionType connectionType) throws RelationalTagException {
        return RelationalTag.connect(this, other, connectionType);
    }

    /**
     * Convenience wrapper for {@link #disconnect(RelationalTag, Object)}.
     * 
     * @param other
     */
    public void disconnectTo(Object other) {
        RelationalTag.disconnect(this, other);
    }

    /**
     * Convenience wrapper for {@link #delete(RelationalTag)}.
     * @throws RelationalTagException
     */
    public void deleteSelf() throws RelationalTagException {
        RelationalTag.delete(this);
    }

    /**
     * Returns this tag represented as json.
     * 
     * I cannot use a typical JSON formatter for this because this object has recursive references.
     */
    public String toString() {
        Collection<RelationalTagConnection> connections = this.connections.values();
        String[] connectionsStr = new String[connections.size()];

        int c = 0;
        for (RelationalTagConnection connection : connections) {
            connectionsStr[c] = connection.toString();
            c++;
        }
        
        StringBuilder out = new StringBuilder("{\"").append(this.name).append("\": [");
        out.append(String.join(",", connectionsStr));
        out.append("]}");

        return out.toString();
    }

    public String getName() {
        return this.name;
    }

    /**
     * Whether this tag has the same name as another. It is sometimes desirable to compare using
     * == operator instead, as it requires that both tags reference the same object in memory.
     */
    public boolean equals(Object other) {
        if (other instanceof RelationalTag) {
            RelationalTag otherTag = (RelationalTag) other;
            return (
                otherTag.name.equals(name) || (
                    !RelationalTag.isCaseSensitive 
                    && otherTag.name.toLowerCase().equals(name.toLowerCase())
                )
            );
        }
        else {
            return false;
        }
    }

    /**
     * Whether this tag matches the given query string or regexp pattern.
     * 
     * @param query String for exact match or regular expression to 
     * @return
     */
    public boolean matches(Object query) throws RelationalTagException {
        if (query == null) {
            return true;
        }
        else if (query instanceof String) {
            return RelationalTag.isCaseSensitive
            ? name.equals(query)
            : name.toLowerCase().equals(((String) query).toLowerCase());
        }
        else if (query instanceof Pattern) {
            String name = this.name;
            Pattern queryPattern = (Pattern) query;
            if (!RelationalTag.isCaseSensitive) {
                name = name.toLowerCase();
                queryPattern = Pattern.compile(
                    queryPattern.pattern(),
                    queryPattern.flags() | Pattern.CASE_INSENSITIVE
                );
            }
            Matcher matcher = queryPattern.matcher(name);
            return matcher.matches() && matcher.group().equals(name);
        }
        else {
            throw new RelationalTagException(
                "invalid query of type " + (query.getClass().getName()) + " " + query + " for match against tag name",
                ExceptionType.WRONG_TYPE
            );
        }
    }

    public static HashMap<String, RelationalTag> getAllTags() {
        return allTags;
    }

    public static void config(boolean isCaseSensitive) {
        RelationalTag.isCaseSensitive = isCaseSensitive;
    }

    /**
     * Whether tag names are case sensitive.
     */
    public static boolean getIsCaseSensitive() {
        return isCaseSensitive;
    }

    /**
     * Create a connection between a source and target with the given connection type.
     * 
     * @param tag The source tag.
     * @param target The target tag or entity.
     * @param connectionType Connection type.
     * @return Relational tag connection instance.
     */
    public static RelationalTagConnection connect(RelationalTag tag, Object target, ConnectionType connectionType) throws RelationalTagException {
        boolean targetIsTag = (target instanceof RelationalTag);

        // resolve type as default
        if (connectionType == null) {
            if (targetIsTag) {
                connectionType = ConnectionType.TO_TAG_UNDIRECTED;
            }
            else {
                connectionType = ConnectionType.TO_ENT;
            }
        }

        // connection
        RelationalTagConnection conn = new RelationalTagConnection(tag, target, connectionType);
        tag.connections.put(target, conn);

        // inverse connection
        if (targetIsTag) {
            ((RelationalTag) target).connections.put(tag, conn.inverse());
        }
        else {
            if (!RelationalTag.taggedEntities.containsKey(target)) {
                logger.info("new tagged entity " + target);
                RelationalTag.taggedEntities.put(target, new HashMap<RelationalTag, RelationalTagConnection>());
            }

            RelationalTag.taggedEntities.get(target).put(tag, conn.inverse());
        }

        return conn;
    }

    /**
     * Calls {@link #connect(RelationalTag, Object, ConnectionType)} using the details stored in the given
     * relational connection instance.
     * 
     * @param connection
     * @return
     * @throws RelationalTagException
     */
    public static RelationalTagConnection connect(RelationalTagConnection connection) throws RelationalTagException {
        Object source = connection.getSource();

        if (source instanceof RelationalTag) {
            return connect(
                (RelationalTag) source, 
                connection.getTarget(), 
                connection.getType()
            );
        }
        else {
            return connect(connection.inverse());
        }
    }

    /**
     * Remove a connection between a tag and a target.
     * 
     * @param tag Connection source.
     * @param target Connection target.
     */
    public static void disconnect(RelationalTag tag, Object target) {
        // remove connection from source
        tag.connections.remove(target);

        // remove inverse connection from target
        if (target instanceof RelationalTag) {
            ((RelationalTag) target).connections.remove(tag);
        }
        else {
            if (RelationalTag.taggedEntities.containsKey(target)) {
                RelationalTag.taggedEntities.get(target).remove(tag);
            }
            else {
                logger.warning("entity " + target + " already untagged");
            }
        }
    }

    /**
     * Calls {@link #disconnect(RelationalTag, Object)} using the details stored in the given
     * relational connection instance.
     * 
     * @param connection
     * @throws RelationalTagException
     */
    public static void disconnect(RelationalTagConnection connection) throws RelationalTagException {
        Object source = connection.getSource();

        if (source instanceof RelationalTag) {
            disconnect(
                (RelationalTag) source,
                connection.getTarget()
            );
        }
        else {
            disconnect(connection.inverse());
        }
    }

    /**
     * Disconnect the given {@code entity} from all tags.
     * If the entity is already not connected to any tags, this method does nothing.
     * 
     * @param entity Entity to disconnect/untag.
     */
    public static void disconnectEntity(Object entity) throws RelationalTagException {
        if (RelationalTag.taggedEntities.containsKey(entity)) {
            // disconnect from tags
            for (RelationalTagConnection conn : RelationalTag.taggedEntities.get(entity).values()) {
                RelationalTag.disconnect(conn);
            }

            // remove from tagged entities
            RelationalTag.taggedEntities.remove(entity);
        }
        else {
            logger.info(entity + " already not tagged");
        }
    }

    /**
     * Convenience wrapper for {@link #newTag(String, boolean)}.
     */
    public static RelationalTag newTag(String name) throws RelationalTagException {
        return newTag(name, true);
    }

    /**
     * Create a new relational tag.
     * 
     * @param name Unique tag name.
     * @param getIfExists Whether to return an existing tag if one of the given name already
     * exists. Default is {@code true}.
     * 
     * @return Relational tag instance.
     * @throws RelationalTagException
     */
    public static RelationalTag newTag(String name, boolean getIfExists) throws RelationalTagException {
        if (!RelationalTag.isCaseSensitive) {
            name = name.toLowerCase();
        }

        try {
            return new RelationalTag(name);
        }
        catch (RelationalTagException e) {
            logger.warning(e.getMessage());

            if (e.type == ExceptionType.COLLISION && getIfExists) {
                return RelationalTag.allTags.get(name);
            }
            else {
                throw e;
            }
        }
    }

    /**
     * Get an existing relational tag.
     * 
     * @param name Unique tag name.
     * @param newIfMissing Whether to create a new tag if it doesn't exist yet.
     */
    public static RelationalTag get(String name, boolean newIfMissing) throws RelationalTagException {
        if (!RelationalTag.isCaseSensitive) {
            name = name.toLowerCase();
        }

        if (!RelationalTag.allTags.containsKey(name)) {
            if (newIfMissing) {
                return new RelationalTag(name);
            }
            else {
                throw new RelationalTagException(
                    "tag " + name + " not found", 
                    ExceptionType.MISSING
                );
            }
        }
        else {
            return RelationalTag.allTags.get(name);
        }
    }

    /**
     * Calls {@link #get(String, boolean)}.
     * @param name
     */
    public static RelationalTag get(String name) throws RelationalTagException {
        return get(name, true);
    }

    /**
     * Delete an existing relational tag.
     * 
     * @param tag {@code RelationalTag} instance to delete.
     */
    public static void delete(RelationalTag tag) throws RelationalTagException {
        // remove from all tags
        RelationalTag.allTags.remove(tag.name);

        // remove all connections
        for (RelationalTagConnection conn : tag.connections.values()) {
            RelationalTag.disconnect(conn);
        }
    }

    /**
     * Delete an existing relational tag by name.
     * 
     * Note this method fails silently, and will do nothing if the given tag doesn't exist.
     * 
     * @param tagName
     * @throws RelationalTagException
     */
    public static void delete(String tagName) throws RelationalTagException {
        // convert to tag
        if (!RelationalTag.isCaseSensitive) {
            tagName = tagName.toLowerCase();
        }

        if (RelationalTag.allTags.containsKey(tagName)) {
            RelationalTag.delete(RelationalTag.allTags.get(tagName));
        }
        else {
            logger.warning("skip delete of nonexistent tag " + tagName);
        }
    }

    /**
     * Remove all tags and connections.
     * 
     * @return Number of tags removed.
     */
    public static int clear() {
        int numTags = allTags.size();
        
        allTags.clear();
        taggedEntities.clear();

        return numTags;
    }
    
    public static List<RelationalTag> load() {
        throw new UnsupportedOperationException("not yet implemented");
    }

    public static RelationalTag loadTag() {
        throw new UnsupportedOperationException("not yet implemented");
    }

    public static String saveTag() {
        throw new UnsupportedOperationException("not yet implemented");
    }

    public static List<RelationalTag> loadJSON() {
        throw new UnsupportedOperationException("not yet implemented");
    }

    public static String saveJSON() {
        throw new UnsupportedOperationException("not yet implemented");
    }

    /**
     * Whether the given tag or entity is present in the relational tags system/graph.
     * 
     * @param node Tag or entity to check.
     */
    public static boolean known(Object node) {
        return (node instanceof RelationalTag) 
        ? RelationalTag.allTags.containsKey(node)
        : RelationalTag.taggedEntities.containsKey(node);
    }

    /**
     * Find the shortest path between two nodes in the relational tags graph.
     * 
     * Connections are analagous to edges and tags and entities are analagous to nodes. Edge direction
     * (connection type) is not considered.
     * 
     * Implemented using breadth first search, starting from a.
     * 
     * @param a
     * @param b
     * @return List of nodes (tags and entities) along the discovered path, in order from a to b.
     */
    public static List<Object> graphPath(Object a, Object b) {
        throw new UnsupportedOperationException("not yet implemented");
    }

    /**
     * Helper function for {@link #graphPath(Object, Object)}.
     * Assumes both {@code a} and {@code b} are in the same graph.
     * 
     * @param a
     * @param b
     * @param visits
     */
    private static List<Object> graphPath(Object a, Object b, Set<Object> visits) {
        throw new UnsupportedOperationException("not yet implemented");
    }

    /**
     * Find the shortest distance between two nodes in the relational tags graph. Calls
     * {@link #graphPath(Object, Object)} and then calculates the graph distance of that
     * path to be the number of edges:
     * 
     * <pre>
     * numEdges = graphDistance().size() - 1
     * </pre>
     * 
     * <ul>
     *  <li>{@code distance == -1} means the nodes are not connected.</li>
     *  <li>{@code distance == 0} means {@code a} and {@code b} are the same node.</li>
     *  <li>{@code distance > 0} means the nodes are connected.</li>
     * </ul>
     * 
     * @param a
     * @param b
     */
    public static int graphDistance(Object a, Object b) {
        return RelationalTag.graphPath(a, b).size() - 1;
    }
    
    /**
     * Find all entities directly or indirectly connected to this tag.
     * 
     * @param tag Tag.
     * @param searchDirection Tag-tag connection direction for search.
     * @return List of connected entities.
     */
    public static List<Object> searchEntitiesByTag(RelationalTag tag, ConnectionType searchDirection) {
        throw new UnsupportedOperationException("not yet implemented");
    }

    /**
     * Find all entities directly or indirectly connected to this tag, including their paths to
     * the start tag.
     * 
     * @param tag
     * @param searchDirection Tag-tag connection direction for search.
     * @return Map of entities with their respective paths to the start tag.
     */
    public static HashMap<Object, List<Object>> searchEntityPathsByTag(RelationalTag tag, ConnectionType searchDirection) {
        throw new UnsupportedOperationException("not yet implemented");
    }
    
    /**
     * Find all tags directly and indirectly connected to this entity that match the given 
     * query string.
     * 
     * @param entity Entity from which to start the search.
     * @param query Optional string or regular expression for filtering tag names.
     * If the query is a string, only one tag will be returned, as it must be an exact match.
     * @param searchDirection Tag-tag connection direction for search.
     * @return List of connected tags.
     */
    public static List<RelationalTag> searchTagsOfEntity(Object entity, String query, ConnectionType searchDirection) {
        throw new UnsupportedOperationException("not yet implemented");
    }

    public static HashMap<RelationalTag, List<Object>> searchTagPathsByTag(Object entity, String query, ConnectionType searchDirection) {
        throw new UnsupportedOperationException("not yet implemented");
    }

    /**
     * Internal helper method for searching the graph.
     * 
     * Uses depth-first search to return the path to each node from the start node. If the start node
     * is an entity, the result is each of its tags, plus searches starting from each tag connected
     * to the entity, using the same tag-tag connection search direction as provided originally.
     * 
     * @param node Start tag or entity from which to begin searching.
     * @param direction Tag-tag connection direction 
     * (ex {@link RelationalTagConnection.ConnectionType#TO_TAG_PARENT TO_TAG_PARENT}, {@link RelationalTagConnection.ConnectionType#TO_TAG_CHILD TO_TAG_CHILD})
     * @param includeEntities If {@code true}, each entity found after the start node is its own
     * key in the result map.
     * @param includeTags If {@code true}, each tag found after the start node is its own key in
     * the result map.
     * @param tagQuery Query string for exact match or regular expression pattern for filtering tag
     * names.
     * @param visits Nodes already visited.
     * @param path Path from an original start node to the current node.
     * @return Map of search results, each node as the key and the corresponding path as the value.
     */
    private static HashMap<Object, List<Object>> searchDescendants(
        Object node,
        ConnectionType direction,
        boolean includeEntities,
        boolean includeTags,
        Object tagQuery,
        Set<Object> visits,
        List<Object> path
    ) {
        throw new UnsupportedOperationException("not yet implemented");
    }
    
    /**
     * Package version.
     */
    public static Version getVersion() {
        throw new UnsupportedOperationException(
            "cannot determine version of parent package. "
            + "use RelationalTag.class.getPackage().getImplementationVersion() instead"
        );
    }
}