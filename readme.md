# Relational Tags

See [original dev.to post](https://dev.to/owengall/relational-tags-29n9) for initial theory and motivation.

This repository contains implementations of relational tags organization in various languages.

# Development

## python

Some auxiliary scripts assume that you're using a virtual environment named `env/`. To set this up, run the following.

```bash
# enter python source dir
cd src/python
# create virtual environment
python -m virtualenv env
```

Then, you can proceed to install development dependencies.

```bash
# activate virtual environment
source env/bin/activate
# install dependencies
python -m pip install -r relational_tags/requirements.txt
# confirm dependencies
python -m pip list
```

## javascript

Start by installing the development dependencies.

```bash
# enter javascript source dir
cd src/javascript
# install dependencies
npm install
# confirm dependencies
npm list
```

## java

Start by installing the dependencies from `pom.xml` using Maven. Most IDEs with Java support will have a quick way to do this.

```bash
# enter java source dir
cd src/java/relational_tags
# install dependencies and compile source to bytecode
mvn build
```

# Installation

## python

Available at [test.pypi.org](https://test.pypi.org/project/relational-tags-owengall/) as an installable package.

```shell
pip install -i https://test.pypi.org/simple relational-tags-owengall
```

## javascript

Available at [npmjs.com](https://www.npmjs.com/package/relational_tags) as an installable package.

```shell
npm install relational_tags
```

## java

The java implementation is not yet distributed as a package, but you can build it locally with the maven `package` phase.

```shell
# enter java source dir
cd src/java/relational_tags
# create distributable jar package
mvn package
```

The resulting jar will at `src/java/relational_tags/target/relational_tags-<version>.jar`.

# Showcase

*A screen recording of `examples/python/rt_webapp`*

![examples/python/rt_webapp](https://user-images.githubusercontent.com/17031438/132413493-dd1464ed-8115-465e-bdf1-847d72a83f96.mp4)

# Generated Documentation

## python

Generate docs at `docs/pdocs/` using the `src/python/pdocs.sh` script, or something similar.

## javascript

Generate docs at `docs/jsdocs/` using the `src/javascript/jsdocs.sh` script, or something similar.

## java

Generate docs at `docs/javadocs/` using the `src/java/javadocs.sh` script, or something similar.

# Usage

The API aims to be as consistent across languages as possible. Below are scripts that generate equivalent
relational tagging systems in each language. For more examples, see code samples in `examples/` and test cases in `tests/` (though be aware that the tests often circumvent the public API and use hidden members, or don't take advantage of things that were added to the library later).

## python

```python
import relational_tags as rt
from relational_tags import RelationalTagConnection

# initial planned tags hierarchy
rt.load(
    {
        'color': ['red', 'orange', 'yellow', 'green', 'blue'],
        'fruit': ['apple', 'banana', 'cherry', 'orange']
    },
    RelationalTagConnection.TYPE_TO_TAG_CHILD
)

# create some things

class Thing:
    def __init__(self, name: str):
        self.name = name
# end Thing

glove = Thing('glove')
ball = Thing('ball')

# tag them

rt.connect(rt.get('red'), glove)

rt.get('orange').connect_to(ball)

print(glove in rt.get('red').connections)
# True; RelationalTag.connections is a Dict where each key is a target

# use graph distance to measure likeness

print(rt.graph_distance(rt.get('orange'), ball))
# 1    # orange-ball

print(rt.graph_distance(rt.get('color'), ball))
# 2    # color-orange-ball

print(rt.graph_distance(rt.get('fruit'), ball))
# 2    # fruit-orange-ball

print(rt.graph_distance(glove, ball))
# 4    # glove-red-color-orange-ball

# use search to find entities by tag
rt.search_entities_by_tag('orange')
# [ball]
rt.search_entities_by_tag('color')
# [glove, ball]
rt.search_entities_by_tag('fruit')
# [ball]

# TODO use search to find tags of entity

# TODO save and load via json

# TODO python aliasing implementation
```

## javascript

```javascript
const rt = require('relational_tags')
const RelationalTagConnection = rt.RelationalTagConnection

// initial planned tags hierarchy
rt.load(
    {
        color: ['red', 'orange', 'yellow', 'green', 'blue'],
        fruit: ['apple', 'banana', 'cherry', 'orange']
    },
    RelationalTagConnection.TYPE_TO_TAG_CHILD
)

// create some things

class Thing {
    constructor(name) {
        this.name = name
    }
}

glove = new Thing('glove')
ball = new Thing('ball')

// tag them

rt.connect(rt.get('red'), glove)

rt.get('orange').connect_to(ball)

console.log(rt.get('red').connections.has(glove))
// true; RelationalTag.connections is a Map where each key is a target

// use graph distance to measure likeness

console.log(rt.graph_distance(rt.get('orange'), ball))
// 1    # orange-ball

console.log(rt.graph_distance(rt.get('color'), ball))
// 2    # color-orange-ball

console.log(rt.graph_distance(rt.get('fruit'), ball))
// 2    # fruit-orange-ball

console.log(rt.graph_distance(glove, ball))
// 4    # glove-red-color-orange-ball

// use search to find entities by tag
rt.search_entities_by_tag('orange')
// [ball]
rt.search_entities_by_tag('color')
// [glove, ball]
rt.search_entities_by_tag('fruit')
// [ball]

// use search to find tags of entity
rt.search_tags_of_entity(ball)              // all transitively connected tags to ball
// [orange, color, fruit]
rt.search_tags_of_entity(glove, 'color', 'TO_TAG_PARENT', true)    // what color is glove?
// {color => [red, color]}
rt.search_tags_of_entity(ball, /.*or.*/)    // ball tags containing or
// [orange, color]

// save and load via json
let json = rt.save_json()
rt.clear()
rt.load_json(json)

// support for things like translations, synonyms, alternative spellings with tag aliasing
rt.alias(rt.get('color'), 'colour')
rt.alias('color', 'hue')

rt.search_entities_by_tag('colour')
// [glove, ball]
rt.rename('colour', 'hue')
rt.search_tags_of_entity(ball)
// [orange, hue, fruit]
```

## java

See `examples/java/rt_app/readme.md` for instructions to install the `relational_tags` package as a dependency from the local jar file.

```java
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
        // initial planned tags hierarchy
        RelationalTag.load(tagTreeSeed, ConnectionType.TO_TAG_CHILD);

        // create some things

        Thing glove = new Thing("glove");
        Thing ball = new Thing("ball");

        // tag them

        RelationalTag.connect(RelationalTag.get("red"), glove);

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
        // {color => [orange, color]}

        // ball tags containing or
        resultTags = RelationalTag.searchTagsOfEntity(ball, Pattern.compile(".*or.*"), null);
        // [orange, color]

        // save and load via json
        String json = RelationalTag.saveJSON();
        RelationalTag.clear();
        RelationalTag.loadJSON(json, null, null);
				
				// TODO java aliasing implementation
    }
}
```

# Theory

Let's combine the best of two disparate organizational systems: tree hierarchy, and tags.

![tree hierarchy graph](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/j5tmd6zkesbzd0xrennt.png)

- **tree**
    - Very intuitive for grouping, and maintaining a spatial metaphor (ex. file system with folders, geolocation with quadrants).
    - Memorable relationships between entities, permitting easy search by incrementing specificity (`users > myself > images > cats > fat_cat.png`).
- **tags**
    - More improvised/ad hoc approach, where organization evolves organically without knowing what is more or less specific.
    - Less rigid classification than the hierarchy tree, with loose relationships.

Relational tags would have the flexibility of tags, with an additional layer of association by defining relationships between tags. I wonder if something like this concept is used in applications like knowledge graphs and mapping natural languages.

For example, I’ll organize the following entities according to the three systems. Note there are certainly many ways to do so:

```
apple, banana, cat, dandelion, grass, 
mouse, school bus, strawberry, Rudolph
```

## Tree example

```
- alive
	- plant
	    - yellow
			- banana
			- dandelion
		- red
			- apple
			- strawberry
		- green
			- grass
	- animal
		- cat
		- mouse
		- Rudolph
- inanimate
	- school bus
```

Note, for example, that I didn’t put `school bus` in `yellow` because it’s only allowed to have one parent node. A filesystem typically gets around this with aliases/symbolic links/shortcuts/etc.

## Tags example

```
- apple - fruit, plant, alive, red, sweet
- banana - fruit, plant, alive, yellow, sweet
- cat - animal, alive, mammal, carnivore
- dandelion - plant, alive, yellow, flower, bitter
- grass - plant, alive, green, bitter
- mouse - animal, alive, mammal, herbivore
- school bus - inanimate, yellow
- strawberry - red, plant, red, sweet, alive
- Rudolph - alive, animal, red, fiction, herbivore, mammal
```

Note here that adding new entities to this system becomes tedious, and entity-tag assignments are easily forgotten.

## Relational tags example

**Tag relationships**

These could be directed or not; I’m not sure which is more useful.

```
alive --> animal, plant, animate
inanimate
color --> red, yellow, green
animal --> mammal, carnivore, herbivore
plant --> fruit, vegetable, flower
fruit --> sweet
flavor --> sweet, bitter
existence --> reality, fiction
```

**Entity-tag assignments**

```
Apple - plant, fruit, red
Banana - fruit, yellow
Cat - mammal, carnivore
Dandelion - flower
Grass - plant
Mouse - mammal
School bus - yellow, inanimate
Strawberry - fruit, red
Rudolph - animal, fictional
```

Hooray! Now, an entity can belong to any number of tags, **and** tags have relationships with each other, so I don’t need to remember to add `alive` and `plant` to all of my `fruit` entities.

If I change my mind about the tag relationships, I can easily redefine them.

If I want to search for entities, I can search by tags and the tag relationships will pull in entities assigned to related tags as well.
