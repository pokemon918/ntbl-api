#!/bin/bash 
#exec > /dev/null 2>&1

originalpath="$(pwd)/storage/app/images"
publicpath="$(pwd)/public/images"

if [ -f $publicpath ] && [ ! -L $publicpath ]
then
    exit 0
else
    ln -s "$originalpath" "$publicpath"
fi

exit 0