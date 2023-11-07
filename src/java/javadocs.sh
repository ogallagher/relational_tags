# generate javadocs using maven javadoc plugin from pom.xml
cd relational_tags
mvn javadoc:javadoc

# create symlink at docs/javadocs
cd ../../../docs
ln -s ../src/java/relational_tags/target/javadocs javadocs
echo "generated javadocs at $(pwd)/javadocs/index.html"

# return to src/java
cd -
cd ..
