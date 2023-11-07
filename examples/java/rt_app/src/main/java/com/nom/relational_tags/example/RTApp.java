package com.nom.relational_tags.example;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;
import java.util.regex.Pattern;

import com.nom.relational_tags.RelationalTag;
import com.nom.relational_tags.RelationalTagException;
import com.nom.relational_tags.RelationalTagConnection.ConnectionType;

/**
 * Example app using relational tags.
 */
public class RTApp {
    private static final Logger logger = Logger.getLogger(RTApp.class.getName());

    private static Map<String, List<String>> tagTreeSeed = new HashMap<>();

    static {
        tagTreeSeed.put("color", Arrays.asList("red", "orange", "yellow", "green", "blue"));
        tagTreeSeed.put("fruit", Arrays.asList("apple", "banana", "cherry", "orange"));
    }

    protected static class Thing {
        protected String name;
        public Thing(String name) { this.name = name; }
        public String toString() { return this.name; }
    }

    public static void main( String[] args ) throws RelationalTagException {
        logger.info("begin example relational tags java app");

        // initial planned tags hierarchy
        RelationalTag.load(tagTreeSeed, ConnectionType.TO_TAG_CHILD);

        // create some things

        Thing glove = new Thing("glove");
        Thing ball = new Thing("ball");

        // tag them

        // TODO create method signatures without null connection types
        RelationalTag.connect(RelationalTag.get("red"), glove, null);

        RelationalTag.get("orange").connectTo(ball, null);

        logger.info(String.valueOf(RelationalTag.get("red").getConnections().containsKey(glove)));
        // true; RelationalTag.connections is a Map where each key is a target

        // use graph distance to measure likeness

        logger.info(String.valueOf(RelationalTag.graphDistance(RelationalTag.get("orange"), ball)));
        // 1    orange-ball

        logger.info(String.valueOf(RelationalTag.graphDistance(RelationalTag.get("color"), ball)));
        // 2    color-orange-ball

        logger.info(String.valueOf(RelationalTag.graphDistance(RelationalTag.get("fruit"), ball)));
        // 2    fruit-orange-ball

        logger.info(String.valueOf(RelationalTag.graphDistance(glove, ball)));
        // 4    glove-red-color-orange-ball

        // use search to find entities by tag
        List<? extends Object> resultTags = RelationalTag.searchEntitiesByTag(RelationalTag.get("orange"), null);
        // [ball]
        resultTags = RelationalTag.searchEntitiesByTag(RelationalTag.get("color"), null);
        // [glove, ball]
        resultTags = RelationalTag.searchEntitiesByTag(RelationalTag.get("fruit"), null);
        // [ball]

        // use search to find tags of entity
        // all transitively connected tags to ball
        resultTags = RelationalTag.searchTagsOfEntity(ball, null, null);
        // [orange, color, fruit]

        // what color is glove?
        Map<RelationalTag, List<Object>> resultPaths = RelationalTag.searchTagPathsOfEntity(
            glove, 
            "color", 
            ConnectionType.TO_TAG_PARENT
        );
        // {color => [orange, red]}

        // ball tags containing or
        resultTags = RelationalTag.searchTagsOfEntity(ball, Pattern.compile(".*or.*"), null);
        // [orange, color]

        // save and load via json
        String json = RelationalTag.saveJSON();
        RelationalTag.clear();
        RelationalTag.loadJSON(json, null, null);
    }
}
