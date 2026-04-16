# PPK Approve/Reject Implementation Complete ✅

## What Was Implemented

### 1. **Backend: pulsa-sheets-bridge/index.ts**
✅ Added `validateRole(role, requiredRole)` - Role-based access control
✅ Enhanced `approvePulsa()` - Now validates PPK role before approval
✅ New `rejectPulsa()` - PPK can reject with rejection reason
✅ New `updateLaporanPulsaFromPendingRow()` - Auto-updates laporan after approval
✅ Updated main handler - Routes "approve" and "reject" actions

### 2. **Frontend Service: pulsaApprovalService.ts**
✅ Created new service with wrapper functions
✅ `approvePulsa(rowNumber, approvedBy, userRole)`
✅ `rejectPulsa(rowNumber, approvedBy, rejectionReason, userRole)`
✅ Helper functions for role validation and status checking

## Status Workflow
```
draft (User creates)
  ↓
pending (User submits via UI)
  ↓
├─ approved (PPK approves) ← AUTO UPDATE LAPORAN
├─ rejected (PPK rejects + reason)
  ↓
completed (Final/Archive status)
```

## API Endpoints

### Approve
```javascript
POST /functions/v1/pulsa-sheets-bridge?action=approve
{
  "rowNumber": 5,
  "approvedBy": "Budi Santoso",
  "role": "PPK"
}
↓
{
  "success": true,
  "message": "✅ Data pulsa sudah disetujui oleh PPK"
}
```

### Reject
```javascript
POST /functions/v1/pulsa-sheets-bridge?action=reject
{
  "rowNumber": 5,
  "approvedBy": "Budi Santoso",
  "rejectionReason": "Nominal tidak sesuai budget",
  "role": "PPK"
}
↓
{
  "success": true,
  "message": "✅ Data pulsa ditolak oleh PPK. Alasan: Nominal tidak sesuai budget"
}
```

## Google Sheet Column Updates

### On Approve:
- **Column J (Status)**: pending → approved
- **Column M (DisetujuiOleh)**: Name of PPK
- **Column N (TglApproval)**: Current datetime
- **LAPORAN sheet**: Recalculated (totalApproved, totalPending, etc)

### On Reject:
- **Column J (Status)**: pending → rejected
- **Column M (DisetujuiOleh)**: "DITOLAK oleh [Name]"
- **Column N (TglApproval)**: Current datetime
- **Column L (Keterangan)**: "[DITOLAK] [Reason]"

## Next Steps for Frontend Integration

### Option 1: Add Reject Button to Existing Table
Update `src/components/pulsa/TabelPulsaBulanan.tsx`:

```typescript
import { approvePulsa, rejectPulsa } from '@/services/pulsaApprovalService';

// Add state for rejection reason dialog
const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
const [selectedRowForReject, setSelectedRowForReject] = useState<number | null>(null);
const [rejectionReason, setRejectionReason] = useState('');

// Add reject handler
const handleReject = async () => {
  if (!selectedRowForReject || !rejectionReason.trim()) {
    alert('Alasan penolakan harus diisi');
    return;
  }

  setActionLoading(`reject-${selectedRowForReject}`);
  const rejector = user?.username || 'Unknown';
  const result = await rejectPulsa(
    selectedRowForReject,
    rejector,
    rejectionReason,
    user?.role || ''
  );
  
  if (result.success) {
    fetchItems();
    onRefresh?.();
    setRejectDialogOpen(false);
    setRejectionReason('');
  } else {
    alert(result.message);
  }
  setActionLoading(null);
};

// Update button area in table to include reject button:
{isPPK && isPending && (
  <div className="flex gap-1">
    <Button
      size="sm"
      variant="outline"
      className="text-green-600 text-xs h-6"
      onClick={() => handleApprove(entry.rowIndex)}
      disabled={actionLoading === `approve-${entry.rowIndex}`}
    >
      ✓ Approve
    </Button>
    <Button
      size="sm"
      variant="outline"
      className="text-red-600 text-xs h-6"
      onClick={() => {
        setSelectedRowForReject(entry.rowIndex);
        setRejectDialogOpen(true);
      }}
      disabled={actionLoading?.startsWith('reject-')}
    >
      ✗ Reject
    </Button>
  </div>
)}
```

### Option 2: Create Dedicated PPK Dashboard
Create `src/pages/PPKApprovalDashboard.tsx`:
- Show only pending pulsa records
- Filter by month/year
- Approve/Reject with modal for rejection reason
- Show approval history
- Auto-refresh for new pending items

## File Changes Summary

| File | Type | Changes |
|------|------|---------|
| `supabase/functions/pulsa-sheets-bridge/index.ts` | Backend | +rejectPulsa(), +validateRole(), enhanced approvePulsa() |
| `src/services/pulsaApprovalService.ts` | Frontend | NEW - Wrapper service for approve/reject |
| `src/components/pulsa/TabelPulsaBulanan.tsx` | Frontend | TO DO - Add reject button & modal |

## Testing Checklist

- [ ] PPK role can approve pending items
- [ ] PPK role can reject with reason
- [ ] Non-PPK users see no approval buttons
- [ ] Approved items update with approver name and date
- [ ] Rejected items show "[DITOLAK]" marker and reason in keterangan
- [ ] LAPORAN sheet updates after approval
- [ ] Test with both local dev and deployed functions
