package com.nom.relational_tags;

/**
 * All exceptions/errors specific to relational tags.
 *
 */
public class RelationalTagException extends Exception
{
    /**
     * Relational tag exception types.
     */
    public enum ExceptionType {
        /**
         * Any exception that doesn't fall into the other categories.
         */
        GENERIC,
        /**
         * Attempted to reference a missing tag.
         */
        MISSING,
        /**
         * Incorrect type (ex. attempted to create tag-entity connection between two tags).
         */
        WRONG_TYPE,
        /**
         * Attempted to create another tag with the same name.
         */
        COLLISION,
        /**
         * Failure to parse tags data.
         */
        FORMAT
    }

    public final ExceptionType type;

    public RelationalTagException(String message, ExceptionType type, Throwable reason) {
        super("[" + type + "] " + message, reason);
        this.type = type;
    }

    public RelationalTagException(String message, ExceptionType type) {
        this(message, type, null);
    }
}
