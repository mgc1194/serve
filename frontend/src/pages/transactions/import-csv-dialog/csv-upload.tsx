// pages/transactions/import-csv-dialog/csv-upload.tsx
//
// Step 2 — File upload: drag-and-drop or browse for a CSV file.

import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import { Alert, Box, Typography } from '@mui/material';

import type { AccountDetail } from '@serve/types/global';

interface CsvUploadProps {
  selectedAccount: AccountDetail | undefined;
  file: File | null;
  setFile: (file: File | null) => void;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  uploadError: string | null;
  setUploadError: (error: string | null) => void;
}

export function CsvUpload({
  selectedAccount,
  file,
  setFile,
  isDragging,
  setIsDragging,
  uploadError,
  setUploadError,
}: CsvUploadProps) {
  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
    e.target.value = '';
  }

  return (
    <Box>
      {selectedAccount && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Importing into <strong>{selectedAccount.name}</strong> (
          {selectedAccount.bank_name})
        </Alert>
      )}

      {/*
        Fix 4: Use a <label> wrapping a visible drop zone and the hidden
        <input>. The label is natively focusable and activates the file
        picker on Enter/Space, with no need for tabIndex, role, or manual
        key handlers.
      */}
      <Box
        component="label"
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleFileDrop}
        sx={{
          display: 'block',
          border: 2,
          borderStyle: 'dashed',
          borderColor: isDragging ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragging ? 'action.hover' : 'background.paper',
          transition: 'border-color 0.15s, background-color 0.15s',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          '&:focus-within': { outline: 2, outlineStyle: 'solid', outlineColor: 'primary.main' },
        }}
      >
        <CloudUploadOutlinedIcon
          sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }}
        />
        <Typography variant="body2" color="text.secondary">
          {file ? file.name : 'Drag & drop a CSV here, or click to browse'}
        </Typography>
        {file && (
          <Typography variant="caption" color="text.disabled">
            {(file.size / 1024).toFixed(1)} KB
          </Typography>
        )}
        <input
          type="file"
          accept=".csv,text/csv"
          style={{
             position: 'absolute',
             width: 1,
             height: 1,
             padding: 0,
             margin: -1,
             border: 0,
             clip: 'rect(0 0 0 0)',
             overflow: 'hidden',
             whiteSpace: 'nowrap',
           }}
          onChange={handleFileInput}
        />
      </Box>

      {uploadError && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}
    </Box>
  );
}
