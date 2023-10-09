#!/bin/bash

cp docs/nginx.conf /etc/nginx/sites-available/default

# Start the first process
npm start &

# Start the second process
nginx -g "daemon off;" &

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $?