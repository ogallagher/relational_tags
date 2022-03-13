#!sh

# activate env
# TODO only run when env dir present
source env/bin/activate

# build wheel file
python -m build -o ../../dist/python

# upload to test.pypi
echo "for upload to test.pypi:"
echo "python -m twine upload --repository testpypi ../../dist/python/*"
