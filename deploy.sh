#!/bin/bash
cd "$( dirname "${BASH_SOURCE[0]}" )"
git fetch --all
git checkout --force "origin/master"
