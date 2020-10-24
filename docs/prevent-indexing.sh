#!/usr/bin/env bash

echo "User-agent: *" > .vuepress/dist/robots.txt
echo "Disallow: /" >> .vuepress/dist/robots.txt
