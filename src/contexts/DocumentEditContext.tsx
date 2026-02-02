import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type DocumentEditMode = 'create' | 'edit' | 'duplicate';

export interface DocumentEditData {
  mode: DocumentEditMode;
  documentType: string; // e.g., 'daftar-hadir', 'surat-pernyataan', etc.
  rowIndex?: number; // Row index in the sheet (for edit mode)
  documentId?: string; // The ID field value
  data: Record<string, any>; // The full row data from the sheet
}

interface DocumentEditContextValue {
  editData: DocumentEditData | null;
  setEditData: (data: DocumentEditData | null) => void;
  clearEditData: () => void;
  isEditing: boolean;
  isDuplicating: boolean;
}

const DocumentEditContext = createContext<DocumentEditContextValue | null>(null);

export const DocumentEditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [editData, setEditData] = useState<DocumentEditData | null>(null);

  const clearEditData = useCallback(() => {
    setEditData(null);
  }, []);

  const isEditing = editData?.mode === 'edit';
  const isDuplicating = editData?.mode === 'duplicate';

  return (
    <DocumentEditContext.Provider 
      value={{ 
        editData, 
        setEditData, 
        clearEditData,
        isEditing,
        isDuplicating
      }}
    >
      {children}
    </DocumentEditContext.Provider>
  );
};

export const useDocumentEdit = (): DocumentEditContextValue => {
  const context = useContext(DocumentEditContext);
  if (!context) {
    throw new Error('useDocumentEdit must be used within a DocumentEditProvider');
  }
  return context;
};

// Export a safe version that returns null if not in provider
export const useDocumentEditSafe = (): DocumentEditContextValue | null => {
  return useContext(DocumentEditContext);
};
