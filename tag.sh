#!/bin/bash

# modified from https://stackoverflow.com/a/27332476/6595777

# get version number from package
VERSION=$(node -p "require('./package.json').version")

# get current hash and see if it already has a tag
GIT_COMMIT=`git rev-parse HEAD`
NEEDS_TAG=`git describe --contains $GIT_COMMIT 2>/dev/null`

# only tag if no tag already
if [ -z "$NEEDS_TAG" ]; then
    git tag $VERSION
    echo "Tagged with $VERSION"
    git push --tags
    git push
else
    echo "Already a tag on this commit"
fi
