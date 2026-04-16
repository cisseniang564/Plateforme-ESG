# ============================================================
# ESGFlow Platform — Developer Makefile
# Usage: make <target>
# ============================================================

COMPOSE     := docker compose
BACKEND     := $(COMPOSE) exec backend
E2E_DIR     := ./e2e

.PHONY: help up down logs \
        test test-unit test-integration test-cov \
        e2e e2e-install e2e-headed \
        install-dev

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── Docker lifecycle ─────────────────────────────────────────
up: ## Start all services (detached)
	$(COMPOSE) up -d

down: ## Stop all services
	$(COMPOSE) down

logs: ## Follow backend logs
	$(COMPOSE) logs -f backend

# ── Backend tests (run inside Docker) ────────────────────────
test: ## Run all backend tests with coverage
	$(BACKEND) python -m pytest tests/ -q --tb=short \
	  --cov=app --cov-report=term-missing --cov-report=html

test-unit: ## Run unit tests only (fast, no DB)
	$(BACKEND) python -m pytest tests/unit/ -v --tb=short -q

test-integration: ## Run integration tests (requires running DB)
	$(BACKEND) python -m pytest tests/integration/ -v --tb=short -q

test-cov: ## Generate HTML coverage report → htmlcov/
	$(BACKEND) python -m pytest tests/ \
	  --cov=app --cov-branch \
	  --cov-report=term-missing:skip-covered \
	  --cov-report=html --cov-report=xml -q
	@echo "Coverage report: backend/htmlcov/index.html"

# ── Install deps into running container (no rebuild needed) ──
install-dev: ## pip install test deps into the running backend container
	$(BACKEND) pip install pytest-cov pytest-asyncio pytest-mock --quiet

# ── E2E Playwright tests ──────────────────────────────────────
e2e-install: ## Install Playwright + Chromium/Firefox binaries
	cd $(E2E_DIR) && npm install && npx playwright install --with-deps chromium firefox

e2e: ## Run all E2E tests (headless, requires frontend running)
	cd $(E2E_DIR) && npx playwright test --project=chromium

e2e-headed: ## Run E2E tests with visible browser
	cd $(E2E_DIR) && npx playwright test --headed --project=chromium

e2e-report: ## Show last Playwright HTML report
	cd $(E2E_DIR) && npx playwright show-report
