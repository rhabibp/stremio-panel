#!/bin/bash

# Stremio Management Panel Development Script

echo "====================================="
echo "Stremio Management Panel Development"
echo "====================================="

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is not installed. Installing tmux..."
    sudo apt-get update && sudo apt-get install -y tmux
fi

# Kill existing tmux session if it exists
tmux kill-session -t stremio-panel 2>/dev/null

# Create a new tmux session
tmux new-session -d -s stremio-panel

# Split the window horizontally
tmux split-window -h -t stremio-panel

# Start backend in the left pane
tmux send-keys -t stremio-panel:0.0 "cd backend && npm run dev" C-m

# Start frontend in the right pane
tmux send-keys -t stremio-panel:0.1 "cd frontend && npm run dev" C-m

# Attach to the tmux session
echo "Starting backend and frontend servers..."
echo "Press Ctrl+B then D to detach from the session without stopping the servers."
echo "====================================="
tmux attach -t stremio-panel