.PHONY: help install test run clean lint format

help:  ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install:  ## Install dependencies
	pip install -r requirements.txt

test:  ## Run smoke tests
	python test_smoke.py

run:  ## Run the app with default settings (no Google Sheets)
	python main.py --no-gsheet

run-gsheet:  ## Run the app with Google Sheets export
	python main.py

clean:  ## Clean up generated files and cache
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	find . -type f -name "*.py~" -delete 2>/dev/null || true
	rm -rf output/* 2>/dev/null || true

lint:  ## Check code style (requires pylint)
	@command -v pylint >/dev/null 2>&1 || { echo "pylint not installed. Install with: pip install pylint"; exit 1; }
	pylint main.py config.py utils.py

format:  ## Format code with black (requires black)
	@command -v black >/dev/null 2>&1 || { echo "black not installed. Install with: pip install black"; exit 1; }
	black main.py config.py utils.py test_smoke.py
