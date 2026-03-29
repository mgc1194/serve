// pages/transactions/transactions-table/table-header-cell.story.tsx

import { Table, TableHead, TableRow } from '@mui/material';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { TableHeaderCell } from '@pages/transactions/transactions-table/table-header-cell';

const tableDecorator: Decorator = Story => (
  <Table size="small">
    <TableHead>
      <TableRow sx={{ bgcolor: 'grey.50' }}>
        <Story />
      </TableRow>
    </TableHead>
  </Table>
);

const meta: Meta<typeof TableHeaderCell> = {
  title: 'Transactions/TransactionsTable/TableHeaderCell',
  component: TableHeaderCell,
  decorators: [tableDecorator],
  parameters: { layout: 'padded' },
  args: {
    columnKey: 'concept',
    sortKey: 'date',
    sortDir: 'desc',
    dragOver: null,
    heldKey: null,
    onMouseDown: () => {},
    onDragStart: () => {},
    onDragOver: () => {},
    onDrop: () => {},
    onDragEnd: () => {},
    onHeaderClick: () => {},
    onHeaderKeyDown: () => {},
    onHandleKeyDown: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof TableHeaderCell>;

// Inactive column
export const Default: Story = {};

// This column is the active sort — ascending
export const SortedAsc: Story = {
  args: { columnKey: 'concept', sortKey: 'concept', sortDir: 'asc' },
};

// This column is the active sort — descending
export const SortedDesc: Story = {
  args: { columnKey: 'concept', sortKey: 'concept', sortDir: 'desc' },
};

// The drag handle is in the "held" (picked up) state
export const Held: Story = {
  args: { heldKey: 'concept' },
};

// Another column is held — this one shows "Move here" tooltip hint
export const OtherHeld: Story = {
  args: { heldKey: 'date' },
};

// Amount column — right-aligned
export const AmountColumn: Story = {
  args: { columnKey: 'amount', sortKey: 'amount', sortDir: 'asc' },
};

// Drop target highlighted
export const DragOver: Story = {
  args: { dragOver: 'concept' },
};
