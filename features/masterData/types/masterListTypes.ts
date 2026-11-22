// Shapes of the master list API (backend EFootwear.BLL/MasterData/Contracts). Camel-case JSON, whole numbers only.

export type MasterListItemResponse = {
  id: string;
  code: string | null;
  name: string;
  nameUrdu: string | null;
  sortOrder: number;
  isActive: boolean;
  // Sent back on update: the server refuses the save when somebody else changed the item in the meantime.
  rowVersion: number;
};

export type MasterListOptionResponse = {
  id: string;
  code: string | null;
  name: string;
  nameUrdu: string | null;
};

export type SaveMasterListItemRequest = {
  name: string;
  nameUrdu: string | null;
  code: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type UpdateMasterListItemRequest = SaveMasterListItemRequest & { rowVersion: number };

// The answer to a save. nearDuplicateNames lists existing names that look like a spelling slip of the saved one (cities).
export type MasterListItemSavedResponse = {
  id: string;
  nearDuplicateNames: string[];
};

export type CategoryResponse = {
  id: string;
  departmentId: string;
  departmentName: string;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  code: string | null;
  name: string;
  nameUrdu: string | null;
  sortOrder: number;
  isActive: boolean;
  rowVersion: number;
};

export type SaveCategoryRequest = {
  departmentId: string;
  parentCategoryId: string | null;
  name: string;
  nameUrdu: string | null;
  code: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type UpdateCategoryRequest = SaveCategoryRequest & { rowVersion: number };

export type SizeResponse = {
  id: string;
  sizeGroupId: string;
  sizeCode: string;
  sortOrder: number;
};

export type SaveSizeRequest = {
  sizeCode: string;
  sortOrder: number;
};
