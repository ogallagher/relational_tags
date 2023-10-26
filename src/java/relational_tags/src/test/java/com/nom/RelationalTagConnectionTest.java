package com.nom;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.logging.Logger;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import com.nom.RelationalTagConnection.ConnectionType;
import com.nom.RelationalTagException.ExceptionType;

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
}
