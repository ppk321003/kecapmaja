/**
 * Service untuk PPK Approval/Rejection di Manajemen Pulsa
 * Uses pulsa-sheets-bridge Supabase Edge Function
 * 
 * Roles:
 * - User: Can add draft pulsa and submit for approval
 * - PPK (Pejabat Pembuat Komitmen): Can approve or reject pending pulsa
 * - Bendahara: Can view all and track completed
 */

const EDGE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL ||
  "http://localhost:54321/functions/v1/pulsa-sheets-bridge";

export interface ApprovePulsaRequest {
  rowNumber: number;
  approvedBy: string;
  role: string;
}

export interface RejectPulsaRequest {
  rowNumber: number;
  approvedBy: string;
  rejectionReason?: string;
  role: string;
}

export interface PulsaActionResponse {
  success: boolean;
  message: string;
}

/**
 * PPK approve pending pulsa data
 * 
 * Updates:
 * - Status: pending → approved
 * - DisetujuiOleh: approver name
 * - TglApproval: current datetime
 * - LAPORAN sheet
 */
export async function approvePulsa(
  rowNumber: number,
  approvedBy: string,
  userRole: string
): Promise<PulsaActionResponse> {
  try {
    if (!userRole || userRole !== "Pejabat Pembuat Komitmen") {
      return {
        success: false,
        message: "❌ Only PPK (Pejabat Pembuat Komitmen) can approve pulsa",
      };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}?action=approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rowNumber,
        approvedBy,
        role: "PPK",
      } as ApprovePulsaRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = (await response.json()) as PulsaActionResponse;
    return data;
  } catch (error) {
    console.error("Error approving pulsa:", error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * PPK reject pending pulsa data
 * 
 * Updates:
 * - Status: pending → rejected
 * - DisetujuiOleh: "DITOLAK oleh [name]"
 * - TglApproval: current datetime
 * - Keterangan: includes rejection reason
 */
export async function rejectPulsa(
  rowNumber: number,
  approvedBy: string,
  rejectionReason: string,
  userRole: string
): Promise<PulsaActionResponse> {
  try {
    if (!userRole || userRole !== "Pejabat Pembuat Komitmen") {
      return {
        success: false,
        message: "❌ Only PPK (Pejabat Pembuat Komitmen) can reject pulsa",
      };
    }

    const response = await fetch(`${EDGE_FUNCTION_URL}?action=reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rowNumber,
        approvedBy,
        rejectionReason,
        role: "PPK",
      } as RejectPulsaRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = (await response.json()) as PulsaActionResponse;
    return data;
  } catch (error) {
    console.error("Error rejecting pulsa:", error);
    return {
      success: false,
      message: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    "Pejabat Pembuat Komitmen": "PPK",
    "User": "User",
    "Bendahara": "Bendahara",
  };
  return roleMap[role] || role;
}

/**
 * Check if user is PPK
 */
export function isUserPPK(userRole: string): boolean {
  return userRole === "Pejabat Pembuat Komitmen";
}

/**
 * Status workflow helper
 */
export const PulsaStatusWorkflow = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",

  canApprove: (status: string) => status === "pending",
  canReject: (status: string) => status === "pending",
  canEdit: (status: string) => status === "draft",
} as const;
