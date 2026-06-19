.PHONY: help global-setup profile-setup migrate update bootstrap profile verify audit hooks ci-local cursor-install check-pins harness-test report
.DEFAULT_GOAL := help

TARGET ?= .

help:           ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n",$$1,$$2}'
	@echo
	@echo "  Order of operations:"
	@echo "    1. make global-setup    (once per machine — hooks only)"
	@echo "    2. make bootstrap       (once per project — .machina/)"
	@echo "    3. make profile-setup   (profile-gated tools)"
	@echo "    4. make verify          (preflight)"

global-setup:   ## One-time: harness hooks + commands to ~/.claude/
	@bash scripts/global-setup.sh

migrate:        ## Disconnect v2.5 + wire v3.1 globally (run once when upgrading)
	@bash scripts/migrate-v3.sh

profile-setup:  ## Install tools for .agent-profile (PROFILE=lean|standard|full)
	@bash scripts/profile-setup.sh $(TARGET)

update:         ## Update installed harness files without reinstalling tools
	@bash scripts/update.sh

bootstrap:      ## Per-project: .machina/ scaffold + profile + verify
	@bash scripts/bootstrap.sh

profile:        ## Detect or re-detect internal profile (TARGET=dir)
	@bash scripts/detect-profile.sh $(TARGET)

verify:         ## Fail-loud preflight check
	@bash scripts/verify.sh

report:         ## Telemetry summary from .machina/telemetry.jsonl
	@bash scripts/machina-report.sh $(TARGET)

check-pins:     ## Print PINNED vs LATEST for managed dependencies
	@bash scripts/check-pins.sh

harness-test:   ## Run harness acceptance tests (phase-gate, secret-guard)
	@bash scripts/test-harness.sh

audit:          ## Read-only audit of ~/.claude configs
	@bash scripts/audit-configs.sh

hooks:          ## Install pre-commit hooks
	@pre-commit install && pre-commit install --hook-type commit-msg

ci-local:       ## Run all gates locally
	@pre-commit run --all-files

cursor-install: ## PARKED — Cursor integration frozen at v2.5
	@bash scripts/install-cursor.sh $(TARGET)
