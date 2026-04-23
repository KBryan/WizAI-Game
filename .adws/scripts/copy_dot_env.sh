#!/bin/bash
# Copy .env.example to .env in the project root.
#
# Usage:
#   ./scripts/copy_dot_env.sh                  # Auto-discover .env.example
#   ./scripts/copy_dot_env.sh /path/to/.env    # Explicit source file

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
DEST="$PROJECT_ROOT/.env"

# Determine source
if [ -n "$1" ]; then
    SOURCE="$1"
else
    SOURCE="$PROJECT_ROOT/.env.example"
fi

# Validate source exists
if [ ! -f "$SOURCE" ]; then
    echo "Error: Source file not found: $SOURCE"
    echo ""
    echo "Usage:"
    echo "  $0                    # Copy .env.example from project root"
    echo "  $0 /path/to/.env      # Copy from an explicit path"
    exit 1
fi

# Warn if destination already exists
if [ -f "$DEST" ]; then
    echo "Warning: .env already exists at $DEST"
    echo "To overwrite, remove it first: rm $DEST"
    exit 1
fi

cp "$SOURCE" "$DEST"
echo "Successfully copied $SOURCE to $DEST"
echo "Edit $DEST and fill in your values."