#!/bin/bash
# Start project services by auto-discovering backend and frontend configurations.
#
# Follows the prime.md discovery approach: reads AGENTS.md for documented dev
# commands, then falls back to scanning project manifests.
#
# Usage:
#   ./scripts/start.sh              # Auto-discover and start all services
#   ./scripts/start.sh --dry-run    # Show what would be started, don't start

set -e

# ── Colors ──
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Detect project root: look for manifest.yml or AGENTS.md by walking up
PROJECT_ROOT=""
current_dir="$SCRIPT_DIR"
while [ "$current_dir" != "/" ]; do
    if [ -f "$current_dir/manifest.yml" ] || [ -f "$current_dir/AGENTS.md" ]; then
        PROJECT_ROOT="$current_dir"
        break
    fi
    current_dir="$(dirname "$current_dir")"
done

# Fallback: assume parent of scripts directory
if [ -z "$PROJECT_ROOT" ]; then
    PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"
fi

# Collect PIDs for cleanup
PIDS=()
SERVICE_NAMES=()

cleanup() {
    echo -e "\n${BLUE}Shutting down ${#PIDS[@]} service(s)...${NC}"
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
        fi
    done
    wait 2>/dev/null
    echo -e "${GREEN}Services stopped successfully.${NC}"
    exit 0
}

trap cleanup EXIT INT TERM

# ── Discovery Functions ──

discover_dev_command_from_agents_md() {
    # Try to extract the "Run Locally" dev command from AGENTS.md
    if [ -f "$PROJECT_ROOT/AGENTS.md" ]; then
        # Look for a dev/start command in the "Run Locally" or "Development Commands" section
        local cmd
        cmd=$(sed -n '/^## .*[Dd]evelopment\|^## .*[Rr]un.*[Ll]ocally/,/^## /{
            /^#.*[Dd]ev\|^#.*[Ss]tart\|^#.*[Rr]un/{
                /^#/s/^#[[:space:]]*//p
            }
        }' "$PROJECT_ROOT/AGENTS.md" | head -1)
        if [ -n "$cmd" ]; then
            echo "$cmd"
            return 0
        fi
    fi
    return 1
}

discover_python_backend() {
    local found=()

    # Check for uvicorn/gunicorn entry points in common locations
    for entry in "$PROJECT_ROOT/app/server/server.py" "$PROJECT_ROOT/server.py" "$PROJECT_ROOT/app.py" "$PROJECT_ROOT/main.py"; do
        if [ -f "$entry" ]; then
            local relpath="${entry#$PROJECT_ROOT/}"
            # Detect if it uses uvicorn
            if grep -q "uvicorn" "$entry" 2>/dev/null; then
                found+=("$relpath:uvicorn")
            elif grep -q "app\s*=\s*FastAPI\|app\s*=\s*Flask\|app\s*=\s*APIRouter" "$entry" 2>/dev/null; then
                found+=("$relpath:asgi")
            else
                found+=("$relpath:python")
            fi
        fi
    done

    # Check for pyproject.toml with a dev script
    if [ -f "$PROJECT_ROOT/pyproject.toml" ]; then
        if grep -q '"dev"' "$PROJECT_ROOT/pyproject.toml" 2>/dev/null; then
            found+=("pyproject.toml:dev-script")
        fi
    fi

    if [ ${#found[@]} -gt 0 ]; then
        printf '%s\n' "${found[@]}"
        return 0
    fi
    return 1
}

discover_node_frontend() {
    # Check for package.json with a dev script
    for pkgdir in "$PROJECT_ROOT/app/client" "$PROJECT_ROOT/client" "$PROJECT_ROOT"; do
        if [ -f "$pkgdir/package.json" ]; then
            if grep -q '"dev"' "$pkgdir/package.json" 2>/dev/null; then
                local relpath="${pkgdir#$PROJECT_ROOT/}"
                if [ "$relpath" = "$PROJECT_ROOT" ]; then
                    relpath="."
                fi
                echo "$relpath:npm-dev"
                return 0
            fi
        fi
    done
    return 1
}

discover_port_from_env() {
    local varname="$1"
    local default="$2"
    # Check .env file first
    if [ -f "$PROJECT_ROOT/.env" ]; then
        local val
        val=$(grep -E "^${varname}=" "$PROJECT_ROOT/.env" | head -1 | cut -d'=' -f2- | sed 's/#.*//' | tr -d ' ')
        if [ -n "$val" ]; then
            echo "$val"
            return 0
        fi
    fi
    # Check environment
    if [ -n "${!varname}" ]; then
        echo "${!varname}"
        return 0
    fi
    echo "$default"
}

# ── Main ──

echo -e "${BLUE}Starting project services...${NC}"
echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"
echo ""

SERVICES_STARTED=0

# ── Try AGENTS.md dev command first ──
AGENTS_CMD=$(discover_dev_command_from_agents_md || true)
if [ -n "$AGENTS_CMD" ]; then
    echo -e "${GREEN}Found dev command in AGENTS.md: $AGENTS_CMD${NC}"
    if [ "$DRY_RUN" = true ]; then
        echo -e "  Would run: cd $PROJECT_ROOT && $AGENTS_CMD"
    else
        cd "$PROJECT_ROOT"
        eval "$AGENTS_CMD" &
        PIDS+=($!)
        SERVICE_NAMES+=("dev-server")
    fi
    SERVICES_STARTED=$((SERVICES_STARTED + 1))
    # If AGENTS.md has a dev command, prefer it — skip individual discovery
    echo ""
    echo -e "${GREEN}✓ Service started from AGENTS.md${NC}"
    echo "Press Ctrl+C to stop..."
    wait
    exit 0
fi

# ── Discover Python backend ──
BACKEND_ENTRIES=$(discover_python_backend || true)
if [ -n "$BACKEND_ENTRIES" ]; then
    for entry in $BACKEND_ENTRIES; do
        local_path=$(echo "$entry" | cut -d':' -f1)
        entry_type=$(echo "$entry" | cut -d':' -f2)

        BACKEND_PORT=$(discover_port_from_env "BACKEND_PORT" "8000")

        case "$entry_type" in
            uvicorn|asgi)
                # Determine the Python module path
                module_path=$(echo "$local_path" | sed 's/\//./g' | sed 's/\.py$//')
                echo -e "${GREEN}Starting Python backend ($local_path) on port $BACKEND_PORT...${NC}"
                if [ "$DRY_RUN" = true ]; then
                    echo -e "  Would run: uv run uvicorn $module_path:app --port $BACKEND_PORT"
                else
                    cd "$PROJECT_ROOT"
                    uv run uvicorn "$module_path:app" --port "$BACKEND_PORT" &
                    PIDS+=($!)
                    SERVICE_NAMES+=("backend:$local_path")
                fi
                SERVICES_STARTED=$((SERVICES_STARTED + 1))
                ;;
            dev-script)
                echo -e "${GREEN}Starting backend via pyproject.toml dev script...${NC}"
                if [ "$DRY_RUN" = true ]; then
                    echo -e "  Would run: cd $PROJECT_ROOT && uv run dev"
                else
                    cd "$PROJECT_ROOT"
                    uv run dev &
                    PIDS+=($!)
                    SERVICE_NAMES+=("backend:dev-script")
                fi
                SERVICES_STARTED=$((SERVICES_STARTED + 1))
                ;;
            python)
                echo -e "${GREEN}Starting Python backend ($local_path)...${NC}"
                if [ "$DRY_RUN" = true ]; then
                    echo -e "  Would run: uv run python $local_path"
                else
                    cd "$PROJECT_ROOT"
                    uv run python "$local_path" &
                    PIDS+=($!)
                    SERVICE_NAMES+=("backend:$local_path")
                fi
                SERVICES_STARTED=$((SERVICES_STARTED + 1))
                ;;
        esac
    done
fi

# ── Discover Node frontend ──
FRONTEND_ENTRY=$(discover_node_frontend || true)
if [ -n "$FRONTEND_ENTRY" ]; then
    frontend_path=$(echo "$FRONTEND_ENTRY" | cut -d':' -f1)

    FRONTEND_PORT=$(discover_port_from_env "FRONTEND_PORT" "5173")

    echo -e "${GREEN}Starting Node frontend ($frontend_path) on port $FRONTEND_PORT...${NC}"
    if [ "$DRY_RUN" = true ]; then
        echo -e "  Would run: cd $PROJECT_ROOT/$frontend_path && PORT=$FRONTEND_PORT npm run dev"
    else
        cd "$PROJECT_ROOT/$frontend_path"

        # Install dependencies if needed
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}Installing frontend dependencies...${NC}"
            npm install
        fi

        PORT="$FRONTEND_PORT" npm run dev &
        PIDS+=($!)
        SERVICE_NAMES+=("frontend:$frontend_path")
    fi
    SERVICES_STARTED=$((SERVICES_STARTED + 1))
fi

# ── Nothing found ──
if [ "$SERVICES_STARTED" -eq 0 ]; then
    echo -e "${RED}No services were discovered.${NC}"
    echo ""
    echo "To configure auto-discovery, create an AGENTS.md file in your project root"
    echo "with a 'Run Locally' section that documents your dev commands:"
    echo ""
    echo "  ## Run Locally"
    echo "  # uvicorn myapp:app --reload"
    echo ""
    echo "Or add a 'dev' script to your pyproject.toml / package.json."
    exit 1
fi

# ── Wait for services ──
echo ""
sleep 2

# Check each service is still running
for i in "${!PIDS[@]}"; do
    pid="${PIDS[$i]}"
    name="${SERVICE_NAMES[$i]}"
    if ! kill -0 "$pid" 2>/dev/null; then
        echo -e "${RED}Service $name (PID $pid) failed to start!${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ $SERVICES_STARTED service(s) started successfully!${NC}"
for i in "${!PIDS[@]}"; do
    echo -e "${BLUE}  ${SERVICE_NAMES[$i]} (PID ${PIDS[$i]})${NC}"
done
echo ""
echo "Press Ctrl+C to stop all services..."

wait