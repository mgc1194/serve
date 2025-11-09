# Expenses App

A Python application for processing and analyzing CSV transaction sheets to manage and track expenses.

## Overview

This application helps you process, categorize, and analyze financial transactions from CSV files. It's designed to simplify expense tracking and provide insights into spending patterns.

## Features

- **CSV Processing**: Import and parse CSV transaction files
- **Expense Analysis**: Analyze spending patterns and categories
- **Transaction Management**: Organize and categorize transactions
- **Report Generation**: Generate expense reports and summaries

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mgc1194/expenses-app.git
   cd expenses-app
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Basic Usage

```bash
python expenses_app.py [input_file.csv]
```

### CSV File Format

The application expects CSV files with the following structure:

```csv
Date,Description,Amount,Category
2025-01-15,Coffee Shop,4.50,Food
2025-01-15,Gas Station,45.00,Transportation
2025-01-16,Grocery Store,87.23,Food
```

**Required Columns:**
- `Date`: Transaction date (YYYY-MM-DD format)
- `Description`: Transaction description
- `Amount`: Transaction amount (positive for expenses)
- `Category`: Expense category (optional)

### Example

```bash
# Process a transaction file
python expenses_app.py transactions_january.csv

# View help
python expenses_app.py --help
```

## Project Structure

```
expenses-app/
├── README.md           # This file
├── .gitignore         # Git ignore rules
├── requirements.txt   # Python dependencies (to be added)
├── expenses_app.py    # Main application file (to be added)
└── tests/            # Unit tests (to be added)
```

## Development

### Running Tests

```bash
python -m pytest tests/
```

### Code Style

This project follows PEP 8 style guidelines. To check code style:

```bash
# Install linting tools
pip install flake8 black

# Run linter
flake8 .

# Format code
black .
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

## Roadmap

Future enhancements may include:
- Multiple CSV format support
- Data visualization and charts
- Budget tracking and alerts
- Export to different formats (PDF, Excel)
- Web interface
- Database storage for historical data

## Acknowledgments

- Thanks to all contributors who help improve this application
- Built with Python and open-source libraries
