# capital_one/__init__.py

import logging
from .checking import process
from .savings import process
from .quicksilver import process

# Setup logging
logging.basicConfig(level=logging.INFO)

logging.info("Initializing the capital_one package")
