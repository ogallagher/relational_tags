package com.nom;

import java.util.logging.Logger;

import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;

public class RelationalTagConnectionTest {
    protected static Logger logger = Logger.getLogger(RelationalTagTest.class.getName());
    
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
