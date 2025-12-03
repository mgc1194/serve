import calendar
import os
import pandas as pd
import logging
import gspread
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


def export_monthly_csv(df, output_dir, target_month=None, target_year=None):
    # Create directory for the month if it doesn't exist
    month_name = calendar.month_name[target_month]
    # month_dir = os.path.join(output_dir, month_name)
    os.makedirs(output_dir, exist_ok=True)

    # Define the file path
    file_path = os.path.join(output_dir, f'transactions_{target_month:02d}.csv')
    month_data = filter_transactions_by_date(df, target_month, target_year)
    logging.info(f'Total transactions for {month_name}: {len(month_data)}')

    # Save the DataFrame to CSV
    month_data.to_csv(file_path, index=False)
    logging.info(f'Successfully saved data to {file_path}')


def export_to_csv(df, output_dir, target_month=None, target_year=None):
    # Create directory for the year if it doesn't exist
    if target_year:
        year_dir = os.path.join(output_dir, str(target_year))
        os.makedirs(year_dir, exist_ok=True)

        # Create directory for the month within the year directory if it doesn't exist
        if target_month:
            month_name = calendar.month_name[target_month]
            file_path = os.path.join(year_dir, f'transactions_{target_year}_{target_month:02d}.csv')
        else:
            file_path = os.path.join(year_dir, f'transactions_{target_year}.csv')
    else:
        # Only month is provided (without year)
        if target_month:
            os.makedirs(output_dir, exist_ok=True)
            file_path = os.path.join(output_dir, f'transactions_{target_month:02d}.csv')
        else:
            file_path = os.path.join(output_dir, 'transactions.csv')

    df.sort_values(by=['Account','Date'], inplace=True)
    # Save the DataFrame to CSV
    df.to_csv(file_path, index=False)
    logging.info(f'Successfully saved data to {file_path}')


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
    df.sort_values(by=['Date'], inplace=True)
    data = df.drop(columns=['ID', 'Label', 'Category'], errors='ignore')

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
    source_path = "./data"
    output_path = "./output"
    current_year = 2025

    all_data = read_files(source_path)

    if not all_data.empty:
        filtered_data = filter_transactions_by_date(all_data, target_year=current_year)
        logging.info(f'Total transactions for {current_year}: {len(filtered_data)}')
        export_to_csv(filtered_data, output_path, target_year=current_year)
        export_to_gsheet(filtered_data, 'YTD Transactions', 'Transactions')
    else:
        logging.warning('No data to filter or export')
