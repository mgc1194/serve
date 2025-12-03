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
        all_transactions = pd.read_csv(file_path, encoding='latin1').fillna(0)

        # Calculate the 'Amount' column
        all_transactions['Amount'] = all_transactions['Credit'] - all_transactions['Debit']

        # Setup new dataframe with clean data
        clean_df = pd.DataFrame({
            'ID': all_transactions.apply(generate_unique_id, axis=1),
            'Date': pd.to_datetime(all_transactions['Transaction Date'], format='%Y-%m-%d'),
            'Concept': all_transactions['Description'],
            'Account': 'Quicksilver',
            'Amount': all_transactions['Amount'],
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
