#!/bin/bash
set -e

# init cluster
bash test/assets/k8s-init.sh

echo "-> running tests"
cd /usr/app
yarn test
#yarn test:mocha
exit_code=$?
echo "<- tests execution completed"

# teardown cluster
bash test/assets/k8s-destroy.sh

echo "-> building ./coverage/coverage.lcov report file..."
./node_modules/.bin/nyc report --reporter=text-lcov > ./coverage/coverage.lcov
echo "-> ./coverage/coverage.lcov created"

exit $exit_code