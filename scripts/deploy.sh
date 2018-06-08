#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

TARGET_BRANCH="master"
printenv | grep "TRAVIS"

# Pull requests and commits to other branches shouldn't try to deploy, just build to verify
echo "$TRAVIS_PULL_REQUEST - $TRAVIS_BRANCH - $TARGET_BRANCH";
if [ "$TRAVIS_PULL_REQUEST" != "false" -o "$TRAVIS_BRANCH" != "$TARGET_BRANCH" ]; then
    echo "Nothing to deploy"
    exit 0
fi

# Now we figure out what type of version we are deploying (PR labels)
echo "========================================================"
echo "Versionning"

# Publish to npmjs
echo "========================================================"
echo "Publishing"
# npm publish

# Push the version tag to Github
echo "========================================================"
echo "Pushing tags"
# git push --tags

# Get the deploy key by using Travis's stored variables to decrypt deploy_key.enc
# ENCRYPTED_KEY_VAR="encrypted_${ENCRYPTION_LABEL}_key"
# ENCRYPTED_IV_VAR="encrypted_${ENCRYPTION_LABEL}_iv"
# ENCRYPTED_KEY=${!ENCRYPTED_KEY_VAR}
# ENCRYPTED_IV=${!ENCRYPTED_IV_VAR}
# openssl aes-256-cbc -K $encrypted_96214dec6a0b_key -iv $encrypted_96214dec6a0b_iv -in ggj2018_key.enc -out ggj2018_key -d
# chmod 600 ggj2018_key
# eval `ssh-agent -s`
# ssh-add ggj2018_key


echo "========================================================"
echo "Deploy success"
