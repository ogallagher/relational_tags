package com.nom;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;
import java.util.regex.Pattern;

import org.junit.After;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.nom.RelationalTagConnection.ConnectionType;
import com.nom.RelationalTagException.ExceptionType;

/**
 * Unit tests for relational tags.
 * 
 * // TODO graph traversal: path and distance, search entities, search tags by entity, search tags by tag
 */
public class RelationalTagTest 
{
    protected static Logger logger = Logger.getLogger(RelationalTagTest.class.getName());

    private static Map<String, Object> tagTree = new HashMap<>();

    @BeforeClass
    public static void setUpClass() {
        tagTree.put("color", Arrays.asList("red", "green", "blue", "blue", "orange"));
        tagTree.put("fruit", Arrays.asList("banana", "orange"));
        tagTree.put("orange", "tangerine");
    }

    protected static Map<String, Object> getTagTree() {
        if (tagTree.isEmpty()) {
            setUpClass();
        }

        return tagTree;
    }

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

        assertTrue("entity has at least 1 tag", RelationalTag.known(e1));

        RelationalTag.clear();
        assertEquals("no tags at end of test", 0, RelationalTag.getAllTags().size());

        assertTrue("entity is untagged", !RelationalTag.known(e1));
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
        RelationalTag.load(tagTree, null);

        // test graph structure
        assertTrue(
            "red is in color connections", 
            RelationalTag.get("red").getConnections().containsKey(RelationalTag.get("color"))
        );
        assertTrue(
            "color is in red connections", 
            RelationalTag.get("color").getConnections().containsKey(RelationalTag.get("red"))
        );
        assertTrue(
            "tangerine is orange",
            RelationalTag.get("tangerine").getConnections().containsKey(RelationalTag.get("orange"))
        );

        RelationalTagConnection redToColor = RelationalTag.get("red").getConnections().get(RelationalTag.get("color"));
        RelationalTagConnection colorToRed = RelationalTag.get("color").getConnections().get(RelationalTag.get("red"));
        assertTrue("red-color is connection", redToColor instanceof RelationalTagConnection);
        assertTrue(
            "red-color " + redToColor + " equals color-red.inverse " + colorToRed,
            redToColor.equals(colorToRed.inverse())
        );

        assertTrue(
            "orange is child of color and fruit",
            RelationalTag.get("color").getConnections().containsKey(RelationalTag.get("orange"))
            && RelationalTag.get("fruit").getConnections().containsKey(RelationalTag.get("orange"))
        );
    }

    @Test
    public void saveLoadJSON() throws RelationalTagException {
        RelationalTag.load(tagTree, null);

        RelationalTag.get("red").connectTo(
            new Entity("ripe", new String[] {"apple"}),
            null
        );

        String json = RelationalTag.saveJSON();
        logger.info(json);
        assertEquals("saved JSON is string", String.class, json.getClass());
        
        RelationalTag.clear();

        List<RelationalTag> tagsLoaded = RelationalTag.loadJSON(json, null, null);
        for (RelationalTag tagLoaded : tagsLoaded) {
            assertTrue(
                tagLoaded + " not found in relational tags",
                RelationalTag.getAllTags().containsKey(tagLoaded.getName())
            );
        }

        assertTrue(
            "color connected to red",
            RelationalTag.get("color").getConnections().containsKey(RelationalTag.get("red"))
        );
        assertEquals(
            "color-child is parent-child", 
            ConnectionType.TO_TAG_CHILD, 
            RelationalTag.get("color").getConnections().get(RelationalTag.get("red")).getType()
        );

        JsonObject entityLoaded = (
            (JsonElement) RelationalTag.getTaggedEntities().keySet().toArray()[0]
        ).getAsJsonObject();
        logger.info("loaded entity " + entityLoaded);
        assertTrue(
            "saved and loaded simple entity",
            entityLoaded.has("name") 
            && entityLoaded.get("name").getAsString().equals("ripe")
            && entityLoaded.has("fruit")
            && entityLoaded.get("fruit").getAsJsonArray().get(0).getAsString().equals("apple")
        );
    }
}
