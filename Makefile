.PHONY: help global-setup bootstrap profile verify audit hooks ci-local cursor-install
.DEFAULT_GOAL := help

TARGET ?= .

help:           ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n",$$1,$$2}'
	@echo
	@echo "  Order of operations:"
	@echo "    1. make global-setup   (once, globally)"
	@echo "    2. make bootstrap      (once per project)"
	@echo "    3. make verify         (anytime — preflight check)"

global-setup:   ## One-time: set up ~/.claude/machina/ and update global CLAUDE.md
	@bash scripts/global-setup.sh

bootstrap:      ## Per-project: hygiene gates + profile + verify + human gate
	@bash scripts/bootstrap.sh

profile:        ## Detect or re-detect project profile (TARGET=dir, default .)
	@bash scripts/detect-profile.sh $(TARGET)

verify:         ## Preflight: confirm nothing is missing
	@bash scripts/verify.sh

audit:          ## Read-only audit of ~/.claude, ~/.codex, ~/.cursor configs
	@bash scripts/audit-configs.sh

hooks:          ## Install pre-commit hooks (requires git init first)
	@pre-commit install && pre-commit install --hook-type commit-msg

ci-local:       ## Run all gates locally before pushing
	@pre-commit run --all-files

cursor-install: ## Per-project: install .cursor/ Machina rules + hooks (TARGET=dir, default .)
	@bash scripts/install-cursor.sh $(TARGET)
