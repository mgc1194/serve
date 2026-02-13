# capital_one/__init__.py
import logging
from .amex import process

# Setup logging
logging.basicConfig(level=logging.INFO)
logging.info("Initializing the amex package")
