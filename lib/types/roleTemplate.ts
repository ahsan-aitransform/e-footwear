// Role templates: named permission sets that prefill a user's permissions. A template never limits what a user can be given.

export type RoleTemplateSummaryResponse = {
  // A role code for a system suggestion, a template id for a company template.
  key: string;
  id: string | null;
  name: string;
  description: string | null;
  isSystemSuggestion: boolean;
  permissionCount: number;
};

export type RoleTemplateDetailsResponse = {
  key: string;
  id: string | null;
  name: string;
  description: string | null;
  isSystemSuggestion: boolean;
  permissionCodes: string[];
  rowVersion: number;
};

// rowVersion is empty when creating and comes from the details when updating.
export type SaveRoleTemplateRequest = {
  name: string;
  description: string | null;
  permissionCodes: string[];
  rowVersion: number | null;
};
