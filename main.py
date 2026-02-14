import calendar
import os
import pandas as pd
import logging
import gspread
from db import Database, DBConfig
from google.oauth2.service_account import Credentials
from handlers.accounts import ACCOUNT_HANDLERS

# Setup logging
logging.basicConfig(level=logging.INFO, force=True)

# Authenticate with Google Sheets API
SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
creds = Credentials.from_service_account_file("expenses_credentials.json", scopes=SCOPES)
client = gspread.authorize(creds)

FILE_ACCOUNT_MAP = {
    '360Checking': 'CO Checking',
    '360PerformanceSavings': 'CO Savings',
    'transaction_download': 'Quicksilver',
    'SOFI-Checking': 'SoFi Checking',
    'SOFI-Savings': 'SoFi Savings',
    'WF-Checking': 'WF Checking',
    'WF-Savings': 'WF Savings',
    'activity': 'Delta',
    'Chase': 'Chase',
    'Discover': 'Discover',
}


def read_files(data_dir):
    all_transactions = []

    for file in os.listdir(data_dir):
        if not file.lower().endswith('.csv'):
            logging.error(f'Unsupported file format: {file}. Please provide a CSV file')
            continue

        file_path = os.path.join(data_dir, file)
        account_key = next((key for substring, key in FILE_ACCOUNT_MAP.items() if substring in file), None)

        if account_key is None:
            logging.error(f'Error reading {file}. Unrecognized file name')
            continue

        handler = ACCOUNT_HANDLERS[account_key]
        file_data = handler.process(file_path)
        if file_data is not None:
            all_transactions.append(file_data)

    if not all_transactions:
        logging.warning('No valid transactions found')
        return None

    return pd.concat(all_transactions).drop_duplicates()


def filter_transactions_by_date(transactions_df, target_month=None, target_year=None):
    # Ensure 'Date' column is in datetime format
    transactions_df['Date'] = pd.to_datetime(transactions_df['Date'], errors='coerce')

    # Check for empty DataFrame
    if transactions_df.empty:
        logging.warning('No transactions to filter')
        return transactions_df

    if target_year:
        transactions_df = transactions_df[transactions_df['Date'].dt.year == target_year]

    if target_month:
        transactions_df = transactions_df[transactions_df['Date'].dt.month == target_month]

    return transactions_df


def get_gspread_client(credentials_file='expenses_credentials.json'):
    """Authenticate and return a gspread client with proper scopes."""
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"  # Add Drive scope
    ]
    creds = Credentials.from_service_account_file(credentials_file, scopes=scopes)
    return gspread.authorize(creds)


def export_to_gsheet(df, spreadsheet_name, worksheet_name, credentials_file='expenses_credentials.json'):
    """Exports DataFrame to a Google Sheets worksheet, appending data starting at row 4, column A."""
    # Authenticate with Google Sheets
    client = get_gspread_client()

    # Open the Google Sheet
    try:
        sheet = client.open(spreadsheet_name).worksheet(worksheet_name)
    except gspread.exceptions.WorksheetNotFound:
        logging.error(f"Worksheet '{worksheet_name}' not found in '{spreadsheet_name}'.")
        return

    # Drop unwanted columns
    df.sort_values(by=['Date', 'Concept'], inplace=True)
    data = df.drop(columns=['Label', 'Category'], errors='ignore')

    # Convert Pandas Timestamp objects to strings
    data = data.applymap(lambda x: x.isoformat() if isinstance(x, pd.Timestamp) else x)
    # Define the starting cell (row 4, column A)
    start_row, start_col = 2, 1  # 'A4' is row 4, column 1 (A)

    # Convert dataframe to list of lists
    data_values = data.values.tolist()

    # Define the range to update dynamically
    end_row = start_row + len(data_values) - 1
    end_col = start_col + len(data.columns) - 1
    range_to_update = f"A{start_row}:{chr(64 + end_col)}{end_row}"
    # Update existing cells
    sheet.update(range_name=range_to_update, values=data_values)

    logging.info(f"Successfully exported {len(df)} transactions to '{worksheet_name}' in '{spreadsheet_name}'.")


# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    source_path = "./data/2026"
    current_year = 2026

    all_data = read_files(source_path)

    if all_data is None or all_data.empty:
        logging.warning('No valid transactions found. Nothing to import or export.')
    else:
        with Database.connect() as db:
            result = db.upsert_transactions(all_data)
            logging.info(
                f"Import complete — "
                f"{result['inserted']} new, "
                f"{result['skipped']} already existed, "
                f"{result['total']} total processed."
            )
            year_data = db.query_transactions(year=current_year)

        if year_data.empty:
            logging.warning(f'No transactions found in database for {current_year}.')
        else:
            logging.info(f'Exporting {len(year_data)} transactions to Google Sheets.')
            export_to_gsheet(year_data, f'{current_year} Budget', 'Transactions')
