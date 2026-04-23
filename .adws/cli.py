#!/usr/bin/env python3
"""ADW CLI - Main entry point for the AI Developer Workflow System.

Usage:
    adws --help              Show all commands
    adws start               Start project services
    adws stop                Stop project services
    adws plan <issue>        Generate implementation plan for an issue
    adws build <issue>       Build/Implement solution for an issue
    adws health              Run system health check
    adws init                Initialize ADW in current directory
    adws status              Show ADW status
    adws update              Update ADW framework to latest version

Environment:
    ADW_REPO                 Override git remote (format: owner/repo)
    ADW_AGENT_PROVIDER       Agent provider: opencode, claude_cli, venice_api
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional


def get_project_root() -> Path:
    """Find project root by looking for manifest.yml or AGENTS.md."""
    cwd = Path.cwd()
    for path in [cwd] + list(cwd.parents):
        if (path / "manifest.yml").exists() or (path / "AGENTS.md").exists():
            return path
    return cwd


def get_adws_dir(project_root: Path) -> Path:
    """Get the .adws directory for the project."""
    return project_root / ".adws"


def find_script(script_name: str) -> Optional[Path]:
    """Find a script in the project or framework."""
    project_root = get_project_root()
    adws_dir = get_adws_dir(project_root)

    # Check project .adws/scripts/
    script_path = adws_dir / "scripts" / script_name
    if script_path.exists():
        return script_path

    # Check project scripts/
    script_path = project_root / "scripts" / script_name
    if script_path.exists():
        return script_path

    # Check framework scripts/ (if running from framework repo)
    framework_root = Path(__file__).parent.parent
    script_path = framework_root / "scripts" / script_name
    if script_path.exists():
        return script_path

    return None


def run_script(script_name: str, args: list[str] = None, cwd: Optional[Path] = None) -> int:
    """Run a shell script with arguments."""
    script_path = find_script(script_name)
    if not script_path:
        print(f"Error: Script not found: {script_name}", file=sys.stderr)
        return 1

    cmd = ["bash", str(script_path)]
    if args:
        cmd.extend(args)

    work_dir = cwd or get_project_root()
    result = subprocess.run(cmd, cwd=work_dir)
    return result.returncode


def cmd_start(args: argparse.Namespace) -> int:
    """Start project services."""
    print("Starting ADW services...")
    return run_script("start.sh", args.args)


def cmd_stop(args: argparse.Namespace) -> int:
    """Stop project services."""
    print("Stopping ADW services...")
    return run_script("stop_apps.sh")


def cmd_plan(args: argparse.Namespace) -> int:
    """Generate implementation plan for a GitHub issue."""
    issue_number = args.issue
    if not issue_number:
        print("Error: Issue number required", file=sys.stderr)
        return 1

    adws_dir = get_adws_dir(get_project_root())
    plan_script = adws_dir / "adw_plan_build.py"

    if not plan_script.exists():
        # Try framework repo
        framework_root = Path(__file__).parent.parent
        plan_script = framework_root / "adws" / "adw_plan_build.py"

    if not plan_script.exists():
        print("Error: adw_plan_build.py not found", file=sys.stderr)
        return 1

    cmd = ["python3", str(plan_script), issue_number]
    if args.repo:
        os.environ["ADW_REPO"] = args.repo
    if args.adw_id:
        cmd.append(args.adw_id)

    result = subprocess.run(cmd, cwd=get_project_root())
    return result.returncode


def cmd_build(args: argparse.Namespace) -> int:
    """Build/Implement solution (alias for plan)."""
    return cmd_plan(args)


def cmd_health(args: argparse.Namespace) -> int:
    """Run system health check."""
    project_root = get_project_root()
    adws_dir = get_adws_dir(project_root)
    health_script = adws_dir / "health_check.py"

    if not health_script.exists():
        framework_root = Path(__file__).parent.parent
        health_script = framework_root / "adws" / "health_check.py"

    if not health_script.exists():
        print("Error: health_check.py not found", file=sys.stderr)
        return 1

    cmd = ["python3", str(health_script)]
    if args.issue:
        cmd.append(args.issue)
    if args.repo:
        os.environ["ADW_REPO"] = args.repo

    result = subprocess.run(cmd, cwd=project_root)
    return result.returncode


def cmd_init(args: argparse.Namespace) -> int:
    """Initialize ADW in current directory."""
    project_root = get_project_root()

    # Check if already initialized
    if (project_root / ".adws").exists() or (project_root / "AGENTS.md").exists():
        print("ADW appears to already be initialized in this directory.")
        response = input("Reinitialize? (y/N): ")
        if response.lower() != "y":
            print("Cancelled")
            return 0

    # Run install.sh from framework
    framework_root = Path(__file__).parent.parent
    install_script = framework_root / "install.sh"

    if install_script.exists():
        result = subprocess.run(["bash", str(install_script), str(project_root)])
        return result.returncode
    else:
        print("Error: install.sh not found. Is ADW properly installed?", file=sys.stderr)
        return 1


def cmd_status(args: argparse.Namespace) -> int:
    """Show ADW status for current project."""
    project_root = get_project_root()

    print(f"Project root: {project_root}")
    print("")

    # Check for key files
    files = {
        "AGENTS.md": (project_root / "AGENTS.md").exists(),
        "manifest.yml": (project_root / "manifest.yml").exists(),
        ".env": (project_root / ".env").exists(),
        ".adws/": (project_root / ".adws").exists(),
    }

    print("Framework files:")
    for name, exists in files.items():
        status = "✅" if exists else "❌"
        print(f"  {status} {name}")

    # Check git repo
    try:
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            cwd=project_root,
        )
        if result.returncode == 0:
            print(f"\nGit remote: {result.stdout.strip()}")
        else:
            print("\nGit remote: Not configured")
    except FileNotFoundError:
        print("\nGit remote: git not found")

    # Check agent provider
    provider = os.getenv("ADW_AGENT_PROVIDER", "opencode")
    print(f"Agent provider: {provider}")

    # Check for running services
    print("\nRunning services:")
    try:
        result = subprocess.run(
            ["pgrep", "-f", "trigger_webhook.py"],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            pids = result.stdout.strip().split("\n")
            print(f"  ✅ Webhook server (PID: {', '.join(pids)})")
        else:
            print("  ❌ Webhook server")
    except FileNotFoundError:
        print("  ❌ Webhook server (pgrep not available)")

    return 0


def cmd_update(args: argparse.Namespace) -> int:
    """Update ADW framework to latest version."""
    print("Checking for ADW framework updates...")

    # Check if we're in a git repo (framework repo)
    framework_root = Path(__file__).parent.parent
    git_dir = framework_root / ".git"

    if git_dir.exists():
        # Running from cloned repo - pull latest
        print("Framework is a git repository. Pulling latest changes...")
        result = subprocess.run(
            ["git", "pull", "origin", "main"],
            cwd=framework_root,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            print("✅ Framework updated successfully")
            print(result.stdout)
        else:
            print("❌ Failed to pull updates:")
            print(result.stderr)
            return 1
    else:
        # Installed via pip - try to upgrade
        print("Framework installed via pip. Upgrading...")
        pkg_manager = "uv" if subprocess.run(["which", "uv"], capture_output=True).returncode == 0 else "pip"

        if pkg_manager == "uv":
            result = subprocess.run(["uv", "pip", "install", "--upgrade", "adws"])
        else:
            result = subprocess.run([sys.executable, "-m", "pip", "install", "--upgrade", "adws"])

        if result.returncode == 0:
            print("✅ Framework upgraded via pip")
        else:
            print("❌ Failed to upgrade. Try manually: pip install --upgrade adws")
            return 1

    # Update project files if in a project
    project_root = get_project_root()
    adws_dir = get_adws_dir(project_root)

    if adws_dir.exists():
        print(f"\nUpdating project files in {project_root}...")
        # Re-run install for this project
        install_script = framework_root / "install.sh"
        if install_script.exists():
            result = subprocess.run(["bash", str(install_script), str(project_root)])
            return result.returncode

    return 0


def main() -> int:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="adws",
        description="AI Developer Workflow System CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Environment Variables:
  ADW_REPO                 Override git remote (format: owner/repo)
  ADW_AGENT_PROVIDER       Agent provider: opencode, claude_cli, venice_api

Examples:
  adws start               Start project services
  adws stop                Stop all services
  adws plan 123            Generate plan for issue #123
  adws health              Run health check
  adws init                Initialize ADW in current directory
  adws update              Update to latest framework version
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # start
    start_parser = subparsers.add_parser("start", help="Start project services")
    start_parser.add_argument("args", nargs="*", help="Additional arguments")
    start_parser.set_defaults(func=cmd_start)

    # stop
    stop_parser = subparsers.add_parser("stop", help="Stop project services")
    stop_parser.set_defaults(func=cmd_stop)

    # plan
    plan_parser = subparsers.add_parser("plan", help="Generate implementation plan")
    plan_parser.add_argument("issue", help="GitHub issue number")
    plan_parser.add_argument("--repo", help="Repository (owner/repo format)")
    plan_parser.add_argument("--adw-id", help="ADW workflow ID")
    plan_parser.set_defaults(func=cmd_plan)

    # build
    build_parser = subparsers.add_parser("build", help="Build/Implement solution")
    build_parser.add_argument("issue", help="GitHub issue number")
    build_parser.add_argument("--repo", help="Repository (owner/repo format)")
    build_parser.add_argument("--adw-id", help="ADW workflow ID")
    build_parser.set_defaults(func=cmd_build)

    # health
    health_parser = subparsers.add_parser("health", help="Run system health check")
    health_parser.add_argument("issue", nargs="?", help="Post results to issue")
    health_parser.add_argument("--repo", help="Repository (owner/repo format)")
    health_parser.set_defaults(func=cmd_health)

    # init
    init_parser = subparsers.add_parser("init", help="Initialize ADW in current directory")
    init_parser.set_defaults(func=cmd_init)

    # status
    status_parser = subparsers.add_parser("status", help="Show ADW status")
    status_parser.set_defaults(func=cmd_status)

    # update
    update_parser = subparsers.add_parser("update", help="Update ADW framework")
    update_parser.set_defaults(func=cmd_update)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 0

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
