#!sh

version=$(npm pkg get version)

echo 'copy updated readme from project root'
cp ../../../readme.md .

echo "publish version $version to npm"
npm publish
