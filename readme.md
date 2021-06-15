# Relational Tags

See [original dev.to post](https://dev.to/owengall/relational-tags-29n9) for initial theory and motivation.

This repository contains implementations of relational tags organization in various languages.

# Installation

Available on [test.pypi.org](https://test.pypi.org/project/relational-tags-owengall/) as an installable package.

```
pip install -i https://test.pypi.org/simple relational-tags-owengall
```

# Why not?

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

# Tree example

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

# Tags example

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

# Relational tags example

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
