#!/bin/bash
SCRIPT_DIR=$(cd $(dirname $0) && pwd)
RESULTS_DIR=$SCRIPT_DIR/results

rm -rf $RESULTS_DIR
mkdir -p $RESULTS_DIR

for LIB_DIR in $SCRIPT_DIR/*@*; do
    LIB_NAME=$(basename $LIB_DIR)
    echo "$LIB_NAME"
    cd $LIB_DIR
    npm install
    sleep 1
    $SCRIPT_DIR/timeout.sh -t 100 node --expose-gc "$LIB_DIR/read-time.js" | tee "$RESULTS_DIR/$LIB_NAME--read-time.tsv"
    sleep 1
    $SCRIPT_DIR/timeout.sh -t 100 node --expose-gc --max_old_space_size=4000 "$LIB_DIR/insert-time.js" | tee "$RESULTS_DIR/$LIB_NAME--insert-time.tsv"
done

echo "Insert Time"
head -n1 $RESULTS_DIR/stale-lru-cache@latest--insert-time.tsv
for LIB_DIR in $SCRIPT_DIR/*@*; do
    LIB_NAME=$(basename $LIB_DIR)
    echo "$LIB_NAME"
    tail -n1 $RESULTS_DIR/$LIB_NAME--insert-time.tsv
done

echo "Read Time"
head -n1 $RESULTS_DIR/stale-lru-cache@latest--read-time.tsv
for LIB_DIR in $SCRIPT_DIR/*@*; do
    LIB_NAME=$(basename $LIB_DIR)
    echo "$LIB_NAME"
    tail -n1 $RESULTS_DIR/$LIB_NAME--read-time.tsv
done
