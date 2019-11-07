#!/bin/bash

# change directory to TMHI-Discord-Bot
echo "Changing directory to $( dirname "${BASH_SOURCE[0]}" )..."    && \
cd "$( dirname "${BASH_SOURCE[0]}" )"   && \

# fetch and checkout changes
echo -e "\nUpdating the bot..."         && \
git fetch --all                         && \
git checkout --force "origin/master"    && \

# reload the bot
echo -e "\nReloading the bot..."        && \
export HOME="/var/www"                  && \
pm2 reload src/index.js                 && \

# done
echo -e "\nUpdate completed successfully."
