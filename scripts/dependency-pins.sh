#!/usr/bin/env bash
# dependency-pins.sh — pinned versions for all Machina-managed dependencies
# Sourced by global-setup.sh. Do not change manually — update here and commit.
# Use git blame for audit trail of pin changes.
#
# To update a pin: edit this file, commit with message "chore(pins): bump X to vY.Z"

export GRAPHIFY_PIN="v3"              # update to commit hash when v4 ships
export SPECIFY_VERSION="v0.10.2"
export CLAUDE_MEM_VERSION="13.6.0"
export SUPERPOWERS_VERSION="5.1.0"
export AGENT_BROWSER_VERSION="0.27.3"
