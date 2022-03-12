#!sh

out_dir="../../../docs/jsdocs"
pkg_version=$(sed -e 's/^"//' -e 's/"$//' <<< $(npm pkg get version))

# must be run from the js project root where package.json is found
./node_modules/jsdoc/jsdoc.js \
  --readme ../../../readme.md \
  --destination $out_dir \
  --package ./package.json \
  .

echo "generated docs at $out_dir/relational_tags/$pkg_version/index.html"
