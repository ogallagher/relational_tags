package com.nom.relational_tags;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.logging.Logger;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import com.nom.relational_tags.RelationalTagConnection.ConnectionType;
import com.nom.relational_tags.RelationalTagException.ExceptionType;

public class RelationalTagConnectionTest {
    protected static Logger logger = Logger.getLogger(RelationalTagTest.class.getName());

    String apple = "apple";
    String banana = "banana";
    Entity fruitBasket;
    
    @Before
    public void setUp() throws RelationalTagException {
        logger.finest("in setUp");
        RelationalTag.config(false);

        // define tags
        RelationalTag.clear();
        RelationalTag.load(RelationalTagTest.getTagTree(), null);

        fruitBasket = new Entity("object", new String[] {apple, banana});
    }

    @After
    public void tearDown() {
        logger.finest("in tearDown");
        RelationalTag.clear();
    }

    @Test
    public void connectTags() throws RelationalTagException {
        RelationalTag color = RelationalTag.get("color");
        // color tags not yet defined in setup
        RelationalTag red = RelationalTag.get("red");
        RelationalTag yellow = RelationalTag.get("yellow");

        // connect colors w instance methods
        color.connectTo(red, ConnectionType.TO_TAG_CHILD);
        yellow.connectTo(color, ConnectionType.TO_TAG_PARENT);

        assertTrue(color.getConnections().containsKey(red));
        assertTrue(yellow.getConnections().containsKey(color));

        // undo connections
        color.disconnectTo(red);
        color.disconnectTo(yellow);

        // connect colors w class methods
        RelationalTag.connect(color, red, ConnectionType.TO_TAG_CHILD);
        RelationalTag.connect(yellow, color, ConnectionType.TO_TAG_PARENT);

        assertTrue(color.getConnections().containsKey(red));
        assertTrue(yellow.getConnections().containsKey(color));
    }

    @Test
    public void connectEntities() throws RelationalTagException {
        RelationalTag red = RelationalTag.get("red");
        RelationalTag yellow = RelationalTag.get("yellow");
        RelationalTag fruit = RelationalTag.get("fruit", false);

        // colors to entities
        red.connectTo(apple, null);
        RelationalTag.connect(yellow, banana, null);
        
        // fruit to object entity
        assertFalse(RelationalTag.known(fruitBasket));
        RelationalTag.connect(fruit, fruitBasket, null);

        // validate connections
        assertTrue(red.getConnections().containsKey(apple));
        assertEquals(red.getConnections().get(apple).getType(), ConnectionType.TO_ENT);
        assertTrue(RelationalTag.getTaggedEntities().get(fruitBasket).containsKey(fruit));
        assertTrue(RelationalTag.known(fruitBasket));

        // fail to connect backwards
        try {
            RelationalTag.connect(null, yellow, null);
        }
        catch (RelationalTagException e) {
            assertEquals(e.type, ExceptionType.WRONG_TYPE);
        }
    }

    @Test
    public void disconnectTags() throws RelationalTagException {
        RelationalTag color = RelationalTag.get("color", false);
        RelationalTag orange = RelationalTag.get("orange", false);
        RelationalTag red = RelationalTag.get("red", false);

        assertTrue(color.getConnections().containsKey(orange));
        assertTrue(red.getConnections().containsKey(color));

        // disconnect
        orange.disconnectTo(color);
        RelationalTag.disconnect(red, color);

        assertFalse(color.getConnections().containsKey(orange));
        assertFalse(red.getConnections().containsKey(color));
    }

    @Test
    public void disconnectEntities() throws RelationalTagException {
        RelationalTag fruit = RelationalTag.get("fruit", false);
        RelationalTag.connect(fruit, fruitBasket, null);

        RelationalTag red = RelationalTag.get("red", false);
        red.connectTo(apple, null);

        assertTrue(RelationalTag.getTaggedEntities().get(fruitBasket).containsKey(fruit));
        assertTrue(red.getConnections().containsKey(apple));

        red.disconnectTo(apple);
        RelationalTag.disconnect(RelationalTag.getTaggedEntities().get(fruitBasket).get(fruit));

        assertFalse(RelationalTag.getTaggedEntities().get(fruitBasket).containsKey(fruit));
        assertFalse(red.getConnections().containsKey(apple));
    }

    @Test
    public void constructorTagTagConnections() throws RelationalTagException {
        // creates connections of all tag-tag types
        logger.info("tag-tag types = " + RelationalTagConnection.getTagTagTypes());
        for (ConnectionType type : RelationalTagConnection.getTagTagTypes()) {
            RelationalTagConnection tagToTag = new RelationalTagConnection(
                RelationalTag.get(apple), 
                RelationalTag.get(banana), 
                type
            );
            assertEquals(
                "conn type equals " + type,
                tagToTag.getType(), type
            );
        }
    }

    @Test
    public void constructorTagEntConnections() throws RelationalTagException {
        // creates connections of all tag-ent types
        RelationalTag tag = RelationalTag.get("apple");
        Entity ent = fruitBasket;

        RelationalTagConnection tagToEnt = new RelationalTagConnection(tag, ent, ConnectionType.TO_ENT);

        assertEquals(tagToEnt.getType(), ConnectionType.TO_ENT);
        assertEquals(tagToEnt.getSource(), tag);
        assertEquals(tagToEnt.getTarget(), ent);

        RelationalTagConnection entToTag = new RelationalTagConnection(ent, tag, ConnectionType.ENT_TO_TAG);

        assertEquals(entToTag.getType(), ConnectionType.ENT_TO_TAG);
        assertEquals(entToTag.getSource(), ent);
        assertEquals(entToTag.getTarget(), tag);
    }

    @Test
    public void inverseType() {
        assertEquals(
            "child-parent", 
            ConnectionType.TO_TAG_CHILD, 
            RelationalTagConnection.inverseType(ConnectionType.TO_TAG_PARENT)
        );
        assertEquals(
            "parent-child",
            ConnectionType.TO_TAG_PARENT,
            RelationalTagConnection.inverseType(ConnectionType.TO_TAG_CHILD)
        );
        assertEquals(
            "tag-tag double inverse",
            ConnectionType.TO_TAG_CHILD,
            RelationalTagConnection.inverseType(RelationalTagConnection.inverseType(ConnectionType.TO_TAG_CHILD))
        );

        assertEquals(
            "tag-tag undirected",
            ConnectionType.TO_TAG_UNDIRECTED,
            RelationalTagConnection.inverseType(ConnectionType.TO_TAG_UNDIRECTED)
        );

        assertEquals(
            "tag-ent",
            ConnectionType.TO_ENT, 
            RelationalTagConnection.inverseType(ConnectionType.ENT_TO_TAG)
        );
        assertEquals(
            "ent-tag",
            ConnectionType.ENT_TO_TAG,
            RelationalTagConnection.inverseType(ConnectionType.TO_ENT)
        );
    }

    @Test
    public void inverseConnection() throws RelationalTagException {
        // works for all connection types
        RelationalTagConnection redApple = RelationalTag.connect(
            RelationalTag.get("red"), 
            RelationalTag.get("apple"), 
            null
        );
        RelationalTagConnection appleRed = redApple.inverse();

        assertEquals(
            "tag-ent inverse type",
            redApple.getType(),
            appleRed.inverse().getType()
        );
        assertTrue(
            "tag-ent inverse connection",
            redApple.inverse().equals(appleRed)
        );

        RelationalTagConnection colorGreen = RelationalTag.connect(
            RelationalTag.newTag("color"),
            RelationalTag.get("green"),
            ConnectionType.TO_TAG_CHILD
        );
        RelationalTagConnection greenColor = colorGreen.inverse();

        assertEquals(
            "parent-child inverse type",
            colorGreen.getType(), greenColor.inverse().getType()
        );
        assertEquals(
            "parent-child inverse connection",
            colorGreen.inverse(),
            greenColor
        );
        
        colorGreen.type = ConnectionType.TO_TAG_UNDIRECTED;
        greenColor = colorGreen.inverse();

        assertEquals(
            "tag-tag undirected inverse type",
            colorGreen.getType(), greenColor.getType()
        );
        assertEquals(
            "tag-tag undirected inverse connection",
            colorGreen.inverse(), greenColor
        );
    }
}
