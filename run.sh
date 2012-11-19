#! /bin/bash

echo "Compiling parsers..."

for f in peg/*.pegjs
do 
    base=`basename $f .pegjs;`
    #pegjs --track-line-and-column $f "peg/$base.js"
    pegjs $f "peg/$base.js"
done

echo "Running Server..."
node ./app.js


