import pandas as pd
import logging
import hashlib

# Setup logging
logging.basicConfig(level=logging.INFO)


def generate_unique_id(row):
    unique_string = '_'.join(row.astype(str))
    return hashlib.md5(unique_string.encode()).hexdigest()

def process(file_path):
    try:
        return __read_and_process(file_path)
    except FileNotFoundError as e:
        logging.error(f'File not found: {e}')
    except pd.errors.EmptyDataError as e:
        logging.error(f'No data: {e}')
    except pd.errors.ParserError as e:
        logging.error(f'Parsing error: {e}')
    except Exception as e:
        logging.error(f'An unexpected error occurred: {e}')


def __read_and_process(file_path):
    try:
        # Read the CSV file into a DataFrame
        transactions_df = pd.read_csv(file_path, encoding='latin1')

        # Process Amount based on Transaction Type
        transactions_df['Amount'] = transactions_df.apply(
            lambda row: row['Transaction Amount'] if row['Transaction Type'] == 'Credit' else -row[
                'Transaction Amount'],
            axis=1
        )

        # Setup clean DataFrame with processed data
        clean_df = pd.DataFrame({
            'ID': transactions_df.apply(generate_unique_id, axis=1),
            'Date': pd.to_datetime(transactions_df['Transaction Date'], format='%m/%d/%y'),
            'Concept': transactions_df['Transaction Description'],
            'Account': 'CO Savings',
            'Amount': transactions_df['Amount'],
            'Label': None,  # Placeholder for 'Label' if needed
            'Category': None,  # Placeholder for 'Category' if needed
        })

        return clean_df

    except Exception as e:
        logging.error(f'Error processing file: {e}')
        raise


# Example usage
if __name__ == "__main__":
    processed_df = process('path_to_your_file.csv')
    if processed_df is not None:
        print(processed_df.head())

