package com.nom;

import static org.junit.Assert.assertTrue;

import java.util.logging.Logger;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

/**
 * Unit tests for relational tags.
 */
public class RelationalTagTest 
{
    protected static Logger logger = Logger.getLogger(RelationalTagTest.class.getName());

    @Before
    public void setUp() {
        logger.finest("in setUp");
    }

    @After
    public void tearDown() {
        logger.finest("in tearDown");
        RelationalTag.clear();
    }

    /**
     * Confirm version is populated in class.
     */
    @Test(expected = UnsupportedOperationException.class)
    public void packageVersion()
    {
        // allowed
        logger.info("relational_tags specification version = " + RelationalTag.class.getPackage().getSpecificationVersion());
        logger.info("relational_tags implementation version = " + RelationalTag.class.getPackage().getImplementationVersion());
        // disallowed
        RelationalTag.getVersion();
    }

    @Test
    public void createNewTag() throws RelationalTagException
    {
        RelationalTag fruit = new RelationalTag("fruit");
        logger.info("fruit = " + fruit);
        assertTrue(fruit.toString().equals("fruit"));
    }

    @Test
    public void createNewTagException() throws RelationalTagException
    {
        RelationalTag fruit = new RelationalTag("fruit");
        logger.fine("fruit = " + fruit);

        try {
            new RelationalTag("fruit");
            assertTrue("fruitCopy tag constructor should have thrown error", false);
        }
        catch (RelationalTagException e) {
            logger.info(e.toString());
            assertTrue(e.type.equals(RelationalTagException.ExceptionType.COLLISION));
        }
    }
}
