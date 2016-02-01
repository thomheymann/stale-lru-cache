node --version

mkdir -p results

# SCRIPT_DIR=$(dirname $0)

# echo "Installing dependencies..."
# for LIB in $SCRIPT_DIR/*@*; do
#     echo "$LIB"
# done

# exit;

cd fast-lru@3.0.1/
npm install
node --max_old_space_size=4000 main.js > ../results/fast-lru.tsv
echo ""
echo "fast-lru@3.0.1"
head -n1 ../results/fast-lru.tsv
tail -n1 ../results/fast-lru.tsv

cd ../lru-cache@4.0.0/
npm install
node --max_old_space_size=4000 main.js > ../results/lru-cache.tsv
echo ""
echo "lru-cache@4.0.0"
head -n1 ../results/lru-cache.tsv
tail -n1 ../results/lru-cache.tsv

cd ../node-cache@3.1.0/
npm install
node --max_old_space_size=4000 main.js > ../results/node-cache.tsv
echo ""
echo "node-cache@3.1.0"
head -n1 ../results/node-cache.tsv
tail -n1 ../results/node-cache.tsv

cd ../stale-lru-cache@latest/
npm install
node --max_old_space_size=4000 main.js > ../results/stale-lru-cache.tsv
echo ""
echo "stale-lru-cache@latest"
head -n1 ../results/stale-lru-cache.tsv
tail -n1 ../results/stale-lru-cache.tsv
