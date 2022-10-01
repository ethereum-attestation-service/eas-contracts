#!/bin/bash

dotenv=$(dirname $0)/../.env
if [ -f "${dotenv}" ]; then
    source ${dotenv}
fi

username=${TENDERLY_USERNAME}
if [ -n "${TEST_FORK}" ]; then
    project=${TENDERLY_TEST_PROJECT}
else
    project=${TENDERLY_PROJECT}
fi

TENDERLY_FORK_API="https://api.tenderly.co/api/v1/account/${username}/project/${project}/fork"

cleanup() {
    if [ -n "${fork_id}" ] && [ -n "${TEST_FORK}" ]; then
        echo "Deleting a fork ${fork_id} from ${username}/${project}..."
        echo

        curl -sX DELETE "${TENDERLY_FORK_API}/${fork_id}" \
            -H "Content-Type: application/json" -H "X-Access-Key: ${TENDERLY_ACCESS_KEY}"
    fi
}

trap cleanup TERM EXIT

fork_id=$(curl -sX POST "${TENDERLY_FORK_API}" \
    -H "Content-Type: application/json" -H "X-Access-Key: ${TENDERLY_ACCESS_KEY}" \
    -d '{"network_id": "1"}' | jq -r '.simulation_fork.id')

echo "Created a fork ${fork_id} at ${username}/${project}..."
echo

command="TENDERLY_FORK_ID=${fork_id} ${@:1}"

echo "Running:"
echo
echo ${command}

eval ${command}
