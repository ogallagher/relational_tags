package com.nom;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.Map.Entry;
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
 */
public class RelationalTagTest 
{
    protected static Logger logger = Logger.getLogger(RelationalTagTest.class.getName());

    private static Map<String, Object> tagTree = new HashMap<>();

    private static String apple = "apple";
    private static String rock = "rock";
    private static String leaf = "leaf";

    private static Comparator<Object> reverseSorter;

    @BeforeClass
    public static void setUpClass() {
        tagTree.put("color", Arrays.asList("red", "green", "blue", "blue", "orange"));
        tagTree.put("fruit", Arrays.asList("banana", "orange"));
        tagTree.put("orange", "tangerine");

        reverseSorter = new Comparator<Object>() {
            @Override
            public int compare(Object arg0, Object arg1) {
                return arg0.toString().compareTo(arg1.toString());
            }
        };
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

    private void setUpGraphTraversal() throws RelationalTagException {
        // load extended tag tree
        Map<String, Object> traversalTagTree = new HashMap<>();
        traversalTagTree.put("fruit", Arrays.asList("banana", "cinnamon", "donut", "orange"));
        traversalTagTree.put("organic", Arrays.asList("fruit", "animal"));
        traversalTagTree.put("color", Arrays.asList("red", "green", "blue", "yellow", "orange"));
        traversalTagTree.put("animal", Arrays.asList("elephant", "fish", "giraffe", "hyena"));

        RelationalTag.load(traversalTagTree, null);

        // note apple is an entity here
        RelationalTag.connect(RelationalTag.get("fruit"), apple, null);

        RelationalTag.connect(RelationalTag.get("green"), leaf, null);
        RelationalTag.get("banana").connectTo(leaf, null);
        RelationalTag.connect(RelationalTag.get("orange"), leaf, null);
    }

    private String formatPath(List<Object> path) {
        List<String> nodes = new ArrayList<>(path.size());

        for (Object node : path) {
            nodes.add(
                node instanceof RelationalTag ? ((RelationalTag) node).getName() : node.toString()
            );
        }

        return String.join(",", nodes);
    }

    private String formatSearch(HashMap<Object, List<Object>> search) {
        List<String> paths = new ArrayList<>(search.size());

        for (Entry<Object, List<Object>> entry : search.entrySet()) {
            Object key = entry.getKey();
            paths.add(
                (key instanceof RelationalTag ? ((RelationalTag) key).getName() : key.toString())
                + " => "
                + formatPath(entry.getValue())
            );
        }

        return String.join("\n", paths);
    }

    @Test
    public void graphTraversalPathsDistances() throws RelationalTagException {
        setUpGraphTraversal();

        RelationalTag organic = RelationalTag.get("organic");
        assertTrue(RelationalTag.known(organic));
        RelationalTag fruit = RelationalTag.get("fruit");

        List<Object> rock_rock = RelationalTag.graphPath(rock, null);
        List<Object> organic_organic = RelationalTag.graphPath(organic, null);
        List<Object> organic_fruit = RelationalTag.graphPath(organic, fruit);
        logger.info("organic-fruit = " + formatPath(organic_fruit));
        List<Object> organic_apple = RelationalTag.graphPath(organic, apple);
        logger.info("organic-apple = " + formatPath(organic_apple));
        List<Object> apple_organic = RelationalTag.graphPath(apple, organic);

        assertTrue(rock_rock.equals(new ArrayList<Object>(0)));
        assertTrue(organic_organic.equals(Arrays.asList(organic)));
        assertTrue(organic_fruit.equals(Arrays.asList(organic, fruit)));
        assertTrue(organic_apple.equals(Arrays.asList(organic, fruit, apple)));

        List<Object> organic_apple_reversed = new ArrayList<>(organic_apple);
        organic_apple_reversed.sort(reverseSorter);
        assertTrue(apple_organic.equals(organic_apple_reversed));

        assertEquals(RelationalTag.graphDistance(rock, null), -1);
        assertEquals(RelationalTag.graphDistance(organic, null), 0);
        assertEquals(RelationalTag.graphDistance(apple, apple), 0);
        assertEquals(RelationalTag.graphDistance(organic, fruit), 1);
    }

    @Test
    public void graphTraversalSearchEntitiesByTag() throws RelationalTagException {
        setUpGraphTraversal();

        // fail if tag not found
        try {
            RelationalTag.searchEntitiesByTag(RelationalTag.get("nothing", false), null);
        }
        catch (RelationalTagException e) {
            assertEquals(e.type, ExceptionType.MISSING);
        }

        // find leaf by fruit
        HashMap<Object, List<Object>> banana_leaf = RelationalTag.searchEntityPathsByTag(
            RelationalTag.get("banana"),
            ConnectionType.TO_TAG_CHILD
        );
        logger.info("banana entities:\n" + formatSearch(banana_leaf));
        assertTrue(banana_leaf.containsKey(leaf));
        assertTrue(banana_leaf.get(leaf).equals(Arrays.asList(RelationalTag.get("banana"), leaf)));
        assertTrue(
            banana_leaf.keySet().equals(new HashSet<Object>(
                RelationalTag.searchEntitiesByTag(RelationalTag.get("banana"), ConnectionType.TO_TAG_CHILD)
            ))
        );

        HashMap<Object, List<Object>> fruit_leaf = RelationalTag.searchEntityPathsByTag(
            RelationalTag.get("fruit"),
            ConnectionType.TO_TAG_CHILD
        );
        logger.info("fruit entities:\n" + formatSearch(fruit_leaf));
        assertTrue(fruit_leaf.containsKey(leaf));
        assertEquals(3, fruit_leaf.get(leaf).size());
        assertEquals(RelationalTag.get("fruit"), fruit_leaf.get(leaf).get(0));
        assertEquals(leaf, fruit_leaf.get(leaf).get(2));

        // find leaf by color
        HashMap<Object, List<Object>> color_leaf = RelationalTag.searchEntityPathsByTag(
            RelationalTag.get("color"),
            ConnectionType.TO_TAG_CHILD
        );
        logger.info("color entities:\n" + formatSearch(color_leaf));
        assertTrue(color_leaf.containsKey(leaf));
        assertEquals(color_leaf.get(leaf).size(), 3);
        assertEquals(color_leaf.get(leaf).get(0), RelationalTag.get("color"));
        assertEquals(color_leaf.get(leaf).get(2), leaf);
    }

    @Test
    public void graphTraversalSearchTagsByEntityNoQuery() throws RelationalTagException {
        // TODO here
        setUpGraphTraversal();
    }

    @Test
    public void graphTraversalSearchTagsByEntityQuery() throws RelationalTagException {
        setUpGraphTraversal();
    }

    @Test
    public void graphTraversalSearchTagsByTag() throws RelationalTagException {
        setUpGraphTraversal();
    }
}
