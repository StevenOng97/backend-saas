#!/bin/bash

# Start the main application in the background
npm run start:prod &
MAIN_APP_PID=$!

# Start the worker using the npm script
npm run worker &
WORKER_PID=$!

# Function to handle signals
handle_signal() {
  echo "Received signal, shutting down..."
  kill $MAIN_APP_PID
  kill $WORKER_PID
  exit 0
}

# Set up signal handler
trap handle_signal SIGINT SIGTERM

# Wait for any process to exit
wait -n

# Exit with the status of the process that exited first
exit $?