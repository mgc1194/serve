// pages/transactions/import-csv-dialog/csv-upload.test.tsx

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AccountDetail } from '@serve/types/global';

import { CsvUpload } from './csv-upload';

const ACCOUNT: AccountDetail = {
  id: 1,
  name: "Alice's 360 Savings",
  handler_key: 'co-savings',
  account_type_id: 1,
  account_type: '360 Performance Savings',
  bank_id: 1,
  bank_name: 'Capital One',
  household_id: 1,
  household_name: 'Smith Household',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('CsvUpload', () => {
  it('renders the drop zone', () => {
    render(
      <CsvUpload
        selectedAccount={ACCOUNT}
        file={null}
        setFile={vi.fn()}
        isDragging={false}
        setIsDragging={vi.fn()}
        uploadError={null}
        setUploadError={vi.fn()}
      />,
    );
    expect(screen.getByText(/drag & drop/i)).toBeDefined();
  });

  it('renders the account banner when selectedAccount is provided', () => {
    render(
      <CsvUpload
        selectedAccount={ACCOUNT}
        file={null}
        setFile={vi.fn()}
        isDragging={false}
        setIsDragging={vi.fn()}
        uploadError={null}
        setUploadError={vi.fn()}
      />,
    );
    expect(screen.getByText("Alice's 360 Savings")).toBeDefined();
    expect(screen.getByText(/Capital One/)).toBeDefined();
  });

  it('does not render the account banner when selectedAccount is undefined', () => {
    render(
      <CsvUpload
        selectedAccount={undefined}
        file={null}
        setFile={vi.fn()}
        isDragging={false}
        setIsDragging={vi.fn()}
        uploadError={null}
        setUploadError={vi.fn()}
      />,
    );
    expect(screen.queryByText("Alice's 360 Savings")).toBeNull();
  });

  it('renders the file name when a file is selected', () => {
    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    render(
      <CsvUpload
        selectedAccount={ACCOUNT}
        file={file}
        setFile={vi.fn()}
        isDragging={false}
        setIsDragging={vi.fn()}
        uploadError={null}
        setUploadError={vi.fn()}
      />,
    );
    expect(screen.getByText('transactions.csv')).toBeDefined();
  });

  it('calls setFile when a file is picked via input', () => {
    const setFile = vi.fn();
    render(
      <CsvUpload
        selectedAccount={ACCOUNT}
        file={null}
        setFile={setFile}
        isDragging={false}
        setIsDragging={vi.fn()}
        uploadError={null}
        setUploadError={vi.fn()}
      />,
    );
    const file = new File([''], 'transactions.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(setFile).toHaveBeenCalledWith(file);
  });

  it('renders the upload error when set', () => {
    render(
      <CsvUpload
        selectedAccount={ACCOUNT}
        file={null}
        setFile={vi.fn()}
        isDragging={false}
        setIsDragging={vi.fn()}
        uploadError="Upload failed. Please try again."
        setUploadError={vi.fn()}
      />,
    );
    expect(screen.getByText('Upload failed. Please try again.')).toBeDefined();
  });

  it('renders the drop zone as a label element', () => {
    render(
      <CsvUpload
        selectedAccount={ACCOUNT}
        file={null}
        setFile={vi.fn()}
        isDragging={false}
        setIsDragging={vi.fn()}
        uploadError={null}
        setUploadError={vi.fn()}
      />,
    );
    const label = document.querySelector('label');
    expect(label).not.toBeNull();
    expect(label?.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('calls setUploadError with null when the error alert is dismissed', () => {
    const setUploadError = vi.fn();
    render(
      <CsvUpload
        selectedAccount={ACCOUNT}
        file={null}
        setFile={vi.fn()}
        isDragging={false}
        setIsDragging={vi.fn()}
        uploadError="Upload failed. Please try again."
        setUploadError={setUploadError}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(setUploadError).toHaveBeenCalledWith(null);
  });
});
