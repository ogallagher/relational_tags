package com.nom.relational_tags;

import java.util.logging.Logger;

public class Entity {
    protected static Logger logger = Logger.getLogger(RelationalTagTest.class.getName());
    
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
