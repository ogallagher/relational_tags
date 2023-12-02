#!sh

# activate env
# TODO only run when env dir present
source env/bin/activate

# build pdocs
out_dir="../../docs/pdocs"
python -m pdoc -o "$out_dir" relational_tags

echo "generated python docs at $out_dir/index.html"