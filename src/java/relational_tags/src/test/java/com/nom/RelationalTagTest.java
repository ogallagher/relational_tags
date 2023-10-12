package com.nom;

import static org.junit.Assert.assertTrue;

import java.util.logging.Logger;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import com.nom.RelationalTagException.ExceptionType;

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
        RelationalTag red = new RelationalTag("red");
        logger.info("red = " + red);
        assertTrue(red.toString().equals("red"));
        assertTrue(red.getName().equals("red"));

        assertTrue("red tag in all tags", RelationalTag.getAllTags().containsKey(red.getName()));
        assertTrue("red tag is relational tag", RelationalTag.get("red", false) instanceof RelationalTag);
    }

    @Test
    public void createNewTagException() throws RelationalTagException
    {
        RelationalTag fruit = new RelationalTag("fruit");
        logger.fine("fruit = " + fruit);

        try {
            new RelationalTag("fruit");
            assertTrue("duplicate fruit tag constructor should throw error", false);
        }
        catch (RelationalTagException e) {
            logger.info(e.toString());
            assertTrue(e.type.equals(ExceptionType.COLLISION));
        }

        try {
            new RelationalTag(null);
        }
        catch (RelationalTagException e) {
            logger.info(e.toString());
            assertTrue(e.type.equals(ExceptionType.WRONG_TYPE));
        }
    }
}
