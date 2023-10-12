package com.nom;

import java.lang.Runtime.Version;
import java.util.HashMap;
import java.util.logging.Logger;
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

    public String toString() {
        return this.name;
    }

    public String getName() {
        return this.name;
    }

    public static HashMap<String, RelationalTag> getAllTags() {
        return allTags;
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
     * Convenience wrapper for {@link #newTag(String, boolean)}.
     */
    public static RelationalTag newTag(String name) throws RelationalTagException {
        return newTag(name, true);
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