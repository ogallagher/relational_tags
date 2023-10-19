package com.nom;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;
import java.util.regex.Pattern;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import com.nom.RelationalTagConnection.ConnectionType;
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
        assertTrue("yellow tag is relational tag", RelationalTag.newTag("yellow", true) instanceof RelationalTag);
    }

    @Test
    public void createNewTagException() throws RelationalTagException
    {
        RelationalTag fruit = new RelationalTag("fruit");
        logger.fine("fruit = " + fruit);

        try {
            // only allows for unique tag names
            new RelationalTag("fruit");
            assertTrue("duplicate fruit tag constructor should throw error", false);
        }
        catch (RelationalTagException e) {
            logger.info(e.toString());
            assertTrue(e.type.equals(ExceptionType.COLLISION));
        }

        try {
            // only allow strings for tag names
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
    public void clearTagsEntities() throws RelationalTagException {
        assertEquals("no tags at start of test", 0, RelationalTag.getAllTags().size());

        Entity e1 = new Entity("e1", null);
        RelationalTag.connect(new RelationalTag("t1"), e1, ConnectionType.TO_ENT);
        assertEquals("one tag in middle of test", RelationalTag.getAllTags().size(), 1);

        RelationalTag.clear();
        assertEquals("no tags at end of test", 0, RelationalTag.getAllTags().size());
    }

    @Test
    public void deleteExisting() throws RelationalTagException {
        RelationalTag.newTag("apple");
        int numTagsBefore = RelationalTag.getAllTags().size();
        RelationalTag.delete("apple");

        assertEquals(
            "number of tags decremented after delete of tag",
            numTagsBefore - 1,
            RelationalTag.getAllTags().size()
        );
    }

    @Test
    public void deleteFailQuietly() throws RelationalTagException {
        RelationalTag.newTag("apple");
        int numTagsBefore = RelationalTag.getAllTags().size();
        RelationalTag.delete("missing");

        assertEquals(
            "number of tags unchanged after failed delete of missing tag",
            numTagsBefore,
            RelationalTag.getAllTags().size()
        );
    }
    
    @Test
    public void loadTagsFromFlatList() throws RelationalTagException {
        String[] tagNames = new String[] {"red", "green", "blue", "blue"};
        List<RelationalTag> tags = RelationalTag.load(Arrays.asList(tagNames));

        assertEquals("loaded expected number of tags", 3, tags.size());
        assertTrue(RelationalTag.get("blue", false) instanceof RelationalTag);
    }

    @Test
    public void loadTagsFromMap() throws RelationalTagException {
        Map<String, Object> tagTree = new HashMap<>();
        tagTree.put("color", Arrays.asList("red", "green", "blue", "blue", "orange"));
        tagTree.put("fruit", Arrays.asList("banana", "orange"));

        RelationalTag.load(tagTree, null);

        // TODO test graph structure
    }
}
