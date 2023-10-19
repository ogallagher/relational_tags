package com.nom;

import java.util.HashSet;
import java.util.Set;
import java.util.logging.Logger;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class RelationalTagConnection {
    private static final Logger logger = Logger.getLogger(RelationalTag.class.getName());

    /**
     * Relational tag exception types.
     */
    public enum ConnectionType {
        TO_TAG_UNDIRECTED,
        TO_TAG_PARENT,
        TO_TAG_CHILD,
        TO_ENT,
        ENT_TO_TAG
    }

    /**
     * Connection types between tags.
     * 
     * TODO is TO_ENT supposed to be included? What about ENT_TO_TAG?
     */
    private static Set<ConnectionType> TAG_TAG_TYPES = new HashSet<>();
    /**
     * Connection types between a tag and an entity.
     */
    private static Set<ConnectionType> TAG_ENT_TYPES = new HashSet<>();

    static {
        for (ConnectionType type : ConnectionType.values()) {
            if (type.name().indexOf("TAG") != -1) {
                TAG_TAG_TYPES.add(type);
            }

            if (type.name().indexOf("ENT") != -1) {
                TAG_ENT_TYPES.add(type);
            }
        }
        // logger.fine("RelationalTagConnection.ConnectionType = " + ConnectionType.values());
    }

    private Object source;

    private Object target;

    private ConnectionType type;

    /**
     * Create a new connection instance. This should not be called directly, as it doesn't register
     * itself with the source or target. Use {@link RelationalTag#connect(RelationalTag, Object, String)} instead.
     * @param source
     * @param target
     * @param type
     * @throws RelationalTagException
     */
    protected RelationalTagConnection(Object source, Object target, ConnectionType type) throws RelationalTagException {
        this.source = source;
        this.target = target;
        this.type = type;

        if (TAG_TAG_TYPES.contains(type) && !(target instanceof RelationalTag)) {
            throw new RelationalTagException(
                "cannot create " + type.name() + " connection with entity " + target, 
                RelationalTagException.ExceptionType.WRONG_TYPE
            );
        }
    }

    public Object getSource() {
        return source;
    }
    public Object getTarget() {
        return target;
    }
    public ConnectionType getType() {
        return type;
    }

    public RelationalTagConnection inverse() throws RelationalTagException {
        return new RelationalTagConnection(
            this.target, 
            this.source, 
            inverseType(this.type)
        );
    }

    /**
     * Format properties of the connection into a json compatible array.
     * 
     * Structure = {@code [ source, type, target ]}. Tags are stored as their name strings, while
     * entities are kept unchanged. The resulting array is then passed as an argument to a
     * JSON formatter. Therefore, all properties that can be stored in a json representation
     * of the entity will be preserved.
     * 
     * {@link RelationalTag#toString()} is not used for serializing tags because it would cause
     * recursion when serializing their connections.
     */
    public String toString() {
        Object source = this.source instanceof RelationalTag
        ? ((RelationalTag) this.source).getName()
        : this.source;

        Object target = this.target instanceof RelationalTag
        ? ((RelationalTag) this.target).getName()
        : this.target;

        Gson gson = new GsonBuilder().setPrettyPrinting().create();
        return gson.toJson(new Object[] {
            source, this.type, target
        });
    }

    /**
     * Whether the given argument is an equivalent connection (same source, target, and type).
     */
    public boolean equals(Object other) {
        if (other instanceof RelationalTagConnection) {
            RelationalTagConnection otherConn = (RelationalTagConnection) other;
            return (
                otherConn.source == source
                && otherConn.target == target
                && otherConn.type.equals(type)
            );
        }
        else {
            return false;
        }
    }

    public static ConnectionType inverseType(ConnectionType type) {
        switch (type) {
            case TO_TAG_PARENT:
                return ConnectionType.TO_TAG_CHILD;
            case TO_TAG_CHILD:
                return ConnectionType.TO_TAG_PARENT;
            case TO_ENT:
                return ConnectionType.ENT_TO_TAG;
            case ENT_TO_TAG:
                return ConnectionType.TO_ENT;
            case TO_TAG_UNDIRECTED:
            default:
                return ConnectionType.TO_TAG_UNDIRECTED;
        }
    }
}