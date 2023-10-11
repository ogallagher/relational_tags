package com.nom;

import java.lang.Runtime.Version;
import java.util.HashMap;
import java.util.logging.Logger;

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
    private static HashMap<Object, RelationalTag> taggedEntities = new HashMap<>();

    /**
     * Relational tag name.
     */
    private String name;

    /**
     * Relational tag connections. This is how we keep track of tag-[entity,tag] relationships.
     */
    private HashMap<Object, RelationalTagConnection> connections;

    public RelationalTag(String name) throws RelationalTagException {
        this.name = RelationalTag.isCaseSensitive ? name : name.toLowerCase();

        if (RelationalTag.allTags.containsKey(this.name)) {
            throw new RelationalTagException(
                "tag " + this.name + " already exists",
                RelationalTagException.ExceptionType.COLLISION
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
     * Package version.
     */
    public static Version getVersion() {
        throw new UnsupportedOperationException(
            "cannot determine version of parent package. "
            + "use RelationalTag.class.getPackage().getImplementationVersion() instead"
        );
    }
}