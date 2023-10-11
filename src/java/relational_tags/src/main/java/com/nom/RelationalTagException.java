package com.nom;

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
        GENERIC,
        MISSING,
        WRONG_TYPE,
        COLLISION,
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
