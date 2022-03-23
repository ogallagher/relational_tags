# Relational Tags

See [original dev.to post](https://dev.to/owengall/relational-tags-29n9) for initial theory and motivation.

This repository contains implementations of relational tags organization in various languages.

# Installation

## Python

Available at [test.pypi.org](https://test.pypi.org/project/relational-tags-owengall/) as an installable package.

```
pip install -i https://test.pypi.org/simple relational-tags-owengall
```

## Javascript

Available at [npmjs.com](https://www.npmjs.com/package/relational_tags) as an installable package.

```
npm install relational_tags
```

# Showcase

*A screen recording of `examples/python/rt_webapp`*

![examples/python/rt_webapp](https://user-images.githubusercontent.com/17031438/132413493-dd1464ed-8115-465e-bdf1-847d72a83f96.mp4)

# Generated Documentation

## Python

Generate docs at `docs/pdocs/` using the `src/python/pdocs.sh` script, or something similar.

## Javascript

Generate docs at `docs/jsdocs/` using the `src/javascript/jsdocs.sh` script, or something similar.

# Usage

The API aims to be as consistent across languages as possible. Below are scripts that generate equivalent
relational tagging systems in each language. For more examples, see code samples in `examples/` and test cases in `tests/` (though be aware that the tests often circumvent the public API and use hidden members, or don't take advantage of things that were added to the library later).

```python
import relational_tags as rt
from relational_tags import RelationalTagConnection

# initial planned tags hierarchy
rt.load(
    {
        'color': ['red', 'orange', 'yellow', 'green', 'blue'],
        'fruit': ['apple', 'banana', 'cherry', 'orange']
    },
    RelationalTagConnection.TO_TAG_CHILD
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
# [ball]
rt.search_entities_by_tag('fruit')
# [ball]

# TODO save and load via json
```

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

// TODO use search to find entities by tag

// TODO save and load via json
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
