package com.nom;

import static org.junit.Assert.assertTrue;

import java.util.logging.Logger;
import java.util.regex.Pattern;

import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
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
        RelationalTag.config(false);
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

    @Test
    public void tagComparison() throws RelationalTagException {
        // equals no case
        RelationalTag.config(false);
        RelationalTag orange = new RelationalTag("orange");
        RelationalTag orangeUpper = RelationalTag.get("ORANGE");
        assertTrue(orange.equals(orangeUpper) && orange == orangeUpper);

        // string match
        assertTrue(orange.matches("orange"));
        assertTrue(orangeUpper.matches("orange"));

        // pattern match
        Pattern query = Pattern.compile("o\\w{4}e");
        assertTrue(orange.matches(query));
        assertTrue(orangeUpper.matches(query));
        assertTrue(orange.matches(Pattern.compile("O\\w{4}E")));

        // equals letter case
        RelationalTag.config(true);
        orangeUpper = RelationalTag.get("ORANGE");
        assertTrue(!orange.equals(orangeUpper));

        // string match letter case
        assertTrue(orange.matches("orange"));
        assertTrue(!orangeUpper.matches("orange"));

        // pattern match letter case
        query = Pattern.compile("o\\w{4}e");
        assertTrue(orange.matches(query));
        assertTrue(!orangeUpper.matches(query));

        RelationalTag.config(false);
        // careful with this scenario! after creating separate case sensitive tags, they are
        // not merged as the same tag when I switch to case insensitive mode.
        assertTrue(orange.equals(orangeUpper) && orange != orangeUpper);
    }

    @Test
    @Ignore
    public void clearTagsEntities() {
        
    }

    protected class Entity {
        public String name;
        public String[] fruit;
        public void method(String message) {
            logger.info(this.name + " says " + message);
        }

        public Entity(String name, String[] fruit) {
            this.name = name;
            this.fruit = fruit;
        }
    }

    public class ManageConnectionsTest {
        @Before
        public void setUp() {
            logger.finest("in setUp");
            RelationalTag.config(false);

            String[] tagNames = new String[] {"color", "red", "yellow"};
            String apple = "apple";
            String banana = "banana";
            Entity object = new Entity("object", new String[] {apple, banana});
        }

        @After
        public void tearDown() {
            logger.finest("in tearDown");
            RelationalTag.clear();
        }

        @Test
        @Ignore
        public void connectTags() {

        }

        @Test
        @Ignore
        public void connectEntities() {

        }

        @Test
        @Ignore
        public void disconnectTags() {

        }

        @Test
        @Ignore
        public void disconnectEntities() {

        }
    }
}
