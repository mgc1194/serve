import calendar
import os
import pandas as pd
import logging
import gspread
from db import Database, DBConfig
from google.oauth2.service_account import Credentials
from handlers.capital_one_handler import process as co_handler
from handlers.sofi_handler import process as sofi_handler
from handlers.amex_handler import process as amex_handler
from handlers.chase_handler import process as chase_handler
from handlers.wells_fargo_handler import process as wf_handler
from handlers.discover_handler import process as discover_handler

# Setup logging
logging.basicConfig(level=logging.INFO)

# Authenticate with Google Sheets API
SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
creds = Credentials.from_service_account_file("expenses_credentials.json", scopes=SCOPES)
client = gspread.authorize(creds)


def read_files(data_dir):
    all_transactions = []
    co_files = {'360Checking', '360PerformanceSavings', 'transaction_download'}
    sofi_files = {'SOFI-Checking', 'SOFI-Savings'}
    wf_files = {'WF-Checking', 'WF-Savings'}
    amex_files = {'activity'}
    chase_files = {'Chase'}
    discover_files = {'Discover'}
    for file in os.listdir(data_dir):
        file_path = os.path.join(data_dir, file)
        if file.lower().endswith('.csv'):
            # Process Capital One transactions
            if any(substring in file for substring in co_files):
                try:
                    all_transactions.append(co_handler(file_path))
                except Exception as e:
                    logging.error(f'Error processing {file}: {e}')
            # Process SoFi transactions
            elif any(substring in file for substring in sofi_files):
                try:
                    all_transactions.append(sofi_handler(file_path))
                except Exception as e:
                    logging.error(f'Error processing {file}: {e}')
            # Process Wells Fargo transactions
            elif any(substring in file for substring in wf_files):
                try:
                    all_transactions.append(wf_handler(file_path))
                except Exception as e:
                    logging.error(f'Error processing {file}: {e}')
            # Process Chase transactions
            elif any(substring in file for substring in chase_files):
                try:
                    all_transactions.append(chase_handler(file_path))
                except Exception as e:
                    logging.error(f'Error processing {file}: {e}')
            # Process Discover transactions
            elif any(substring in file for substring in discover_files):
                try:
                    all_transactions.append(discover_handler(file_path))
                except Exception as e:
                    logging.error(f'Error processing {file}: {e}')
            # Process Amex transactions
            elif any(substring in file for substring in amex_files):
                try:
                    all_transactions.append(amex_handler(file_path))
                except Exception as e:
                    logging.error(f'Error processing {file}: {e}')
            else:
                logging.error(f'Error reading {file}. Unrecognized file name')
        else:
            logging.error(f'Unsupported file format: {file}. Please provide a CSV file')

    if not all_transactions:
        logging.warning('No valid transactions found')
        return

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
