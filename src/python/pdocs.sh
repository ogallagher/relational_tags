#!sh

# activate env
# TODO only run when env dir present
source env/bin/activate

# build pdocs
python -m pdoc -o ../../docs/pdocs relational_tags
