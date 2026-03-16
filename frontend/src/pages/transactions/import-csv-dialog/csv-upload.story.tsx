// pages/transactions/import-csv-dialog/csv-upload.story.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { CsvUpload } from './csv-upload';

const ACCOUNT = {
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

function CsvUploadWithState(props: React.ComponentProps<typeof CsvUpload>) {
  const [file, setFile] = useState(props.file);
  const [isDragging, setIsDragging] = useState(props.isDragging);
  const [uploadError, setUploadError] = useState(props.uploadError);
  return (
    <CsvUpload
      {...props}
      file={file}
      setFile={setFile}
      isDragging={isDragging}
      setIsDragging={setIsDragging}
      uploadError={uploadError}
      setUploadError={setUploadError}
    />
  );
}

const meta: Meta<typeof CsvUpload> = {
  title: 'Transactions/ImportCsvDialog/CsvUpload',
  component: CsvUpload,
  render: args => <CsvUploadWithState {...args} />,
  parameters: { layout: 'padded' },
  args: {
    selectedAccount: ACCOUNT,
    file: null,
    setFile: () => {},
    isDragging: false,
    setIsDragging: () => {},
    uploadError: null,
    setUploadError: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof CsvUpload>;

export const Default: Story = {};

export const NoAccount: Story = {
  args: { selectedAccount: undefined },
};

export const WithError: Story = {
  args: { uploadError: 'Upload failed. Please try again.' },
};
