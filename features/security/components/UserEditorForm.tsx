"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormResultNotice, InlineNotice } from "@/components/feedback/InlineNotice";
import { FormField } from "@/components/forms/FormField";
import { NativeSelect } from "@/components/forms/NativeSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { SectionCard } from "@/components/layout/SectionCard";
import { apiRequest } from "@/lib/api/apiRequest";
import { createClientTransactionId } from "@/lib/api/sendApiRequest";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { RoleCodes } from "@/lib/constants/roleCodes";
import { findRoleMessageKey } from "@/lib/i18n/roleMessageKeys";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import type { PermissionCatalogResponse } from "@/lib/types/permissions";
import type { CreateUserRequest, CreateUserResponse, UserCreationOptionsResponse } from "@/lib/types/user";
import type { UpdateUserRequest, UserDetailsResponse } from "@/lib/types/userManagement";
import { buildAssignableCodes } from "../logic/permissionTreeSelection";
import { findPasswordRuleViolation, MINIMUM_PASSWORD_LENGTH } from "../logic/temporaryPasswordRules";
import { PermissionTreeEditor } from "./PermissionTreeEditor";
import { QuickActionsChecklist } from "./QuickActionsChecklist";
import { RoleTemplatePicker } from "./RoleTemplatePicker";

export type UserEditorFormProps = {
  mode: "create" | "edit";
  // Edit only: the user being edited.
  user?: UserDetailsResponse;
  creationOptions: UserCreationOptionsResponse;
  catalog: PermissionCatalogResponse | undefined;
  // Edit only: the permission codes the user holds now, and whether they hold the whole catalog by role (the company owner).
  currentPermissionCodes?: readonly string[];
  holdsEveryPermissionByRole?: boolean;
  // Edit only: false when the signed-in person may not see or change permissions (then the tree is not shown).
  canViewPermissions: boolean;
  currentQuickActionCodes?: readonly string[];
  isOwnAccount?: boolean;
  isOnline: boolean;
  onSaved?: () => void;
};

function sameMembers(first: ReadonlySet<string> | readonly string[], second: ReadonlySet<string> | readonly string[]): boolean {
  const firstSet = new Set(first);
  const secondSet = new Set(second);
  return firstSet.size === secondSet.size && [...firstSet].every((value) => secondSet.has(value));
}

// Create New User (docx 1.1) and Edit User (docx 1.3 Edit) in one form: login details, role, stores, the permission tree with the
// role template and the five quick rights, and the "Standard Menu" toolbar. The roles and stores offered come from the API, so the form
// only offers what the signed-in person may do; the API checks the choice again on submit.
export function UserEditorForm({
  mode,
  user,
  creationOptions,
  catalog,
  currentPermissionCodes = [],
  holdsEveryPermissionByRole = false,
  canViewPermissions,
  currentQuickActionCodes = [],
  isOwnAccount = false,
  isOnline,
  onSaved,
}: UserEditorFormProps) {
  const { translateMessage } = useTranslation();
  const router = useRouter();
  const { grantedPermissionCodes: codesHeldByCaller } = usePermissions();

  const [email, setEmail] = useState(user?.email ?? "");
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [roleCode, setRoleCode] = useState(user?.roleCode ?? creationOptions.roles[0] ?? "");
  const [storeIds, setStoreIds] = useState<ReadonlySet<string>>(new Set(user?.storeIds ?? []));
  const [password, setPassword] = useState("");
  const [selectedPermissionCodes, setSelectedPermissionCodes] = useState<ReadonlySet<string>>(new Set(currentPermissionCodes));
  const [hasChosenPermissions, setHasChosenPermissions] = useState(false);
  const [quickActionCodes, setQuickActionCodes] = useState<string[]>([...currentQuickActionCodes]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [fieldErrorMessages, setFieldErrorMessages] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCreate = mode === "create";
  const rolesOffered = user && !creationOptions.roles.includes(user.roleCode) ? [user.roleCode, ...creationOptions.roles] : creationOptions.roles;
  const isRoleFixed = isOwnAccount || (user !== undefined && !creationOptions.roles.includes(user.roleCode));
  const rolesWithoutStores = roleCode === RoleCodes.companyOwner;
  const storesNotOffered = (user?.storeIds ?? []).filter((storeId) => !creationOptions.stores.some((store) => store.id === storeId));
  const assignableCodes = catalog
    ? buildAssignableCodes(catalog, codesHeldByCaller, new Set(currentPermissionCodes))
    : new Set<string>();
  const showPermissionTree = catalog !== undefined && (isCreate || canViewPermissions);

  function validate(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!email.trim()) errors.email = translateMessage("securityManagement.userEditor.emailRequired");
    if (!fullName.trim()) errors.fullName = translateMessage("securityManagement.userEditor.fullNameRequired");
    if (isCreate) {
      const violation = findPasswordRuleViolation(password);
      if (violation === "tooShort") errors.password = translateMessage("securityManagement.userEditor.passwordTooShort", { minimumLength: String(MINIMUM_PASSWORD_LENGTH) });
      else if (violation === "needsLettersAndDigits") errors.password = translateMessage("securityManagement.userEditor.passwordNeedsLettersAndDigits");
      else if (violation === "tooLong") errors.password = translateMessage("securityManagement.userEditor.passwordTooLong");
    }
    if (!isOwnAccount && !rolesWithoutStores) {
      if (storeIds.size === 0) errors.storeIds = translateMessage("securityManagement.userEditor.storeRequired");
      else if (roleCode === RoleCodes.storeManager && storeIds.size !== 1) errors.storeIds = translateMessage("securityManagement.userEditor.managerNeedsOneStore");
    }
    return errors;
  }

  function toggleStore(storeId: string) {
    const next = new Set(storeIds);
    if (next.has(storeId)) next.delete(storeId);
    else next.add(storeId);
    setStoreIds(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    const clientErrors = validate();
    setFieldErrorMessages(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const chosenStoreIds = rolesWithoutStores ? [] : [...storeIds];
      if (isCreate) {
        const body: CreateUserRequest = {
          companyId: null,
          email: email.trim(),
          fullName: fullName.trim(),
          roleCode,
          storeIds: chosenStoreIds,
          password,
          permissionCodes: hasChosenPermissions ? [...selectedPermissionCodes] : undefined,
          quickActionCodes: quickActionCodes.length > 0 ? quickActionCodes : undefined,
        };
        const result = await apiRequest<CreateUserResponse>(ApiEndpoints.users.create, {
          method: "POST",
          body,
          idempotencyKey: createClientTransactionId(),
        });
        if (!result.ok) {
          setErrorMessage(result.kind === "offline" ? translateMessage("securityManagement.userEditor.offlineError") : result.problem.message);
          setFieldErrorMessages(result.problem.fieldErrorMessages);
          return;
        }
        router.push(ApplicationRoutes.userEdit(result.data.id));
        return;
      }

      const body: UpdateUserRequest = {
        email: email.trim(),
        fullName: fullName.trim(),
        roleCode,
        storeIds: chosenStoreIds.length > 0 || rolesWithoutStores ? chosenStoreIds : (user?.storeIds ?? []),
        rowVersion: user!.rowVersion,
      };
      const profileResult = await apiRequest(ApiEndpoints.users.update(user!.id), { method: "PUT", body });
      if (!profileResult.ok) {
        setErrorMessage(profileResult.kind === "offline" ? translateMessage("securityManagement.userEditor.offlineError") : profileResult.problem.message);
        setFieldErrorMessages(profileResult.problem.fieldErrorMessages);
        return;
      }
      if (showPermissionTree && !holdsEveryPermissionByRole && !sameMembers(selectedPermissionCodes, currentPermissionCodes)) {
        const permissionsResult = await apiRequest(ApiEndpoints.users.permissions(user!.id), {
          method: "PUT",
          body: { permissionCodes: [...selectedPermissionCodes] },
        });
        if (!permissionsResult.ok) {
          setErrorMessage(permissionsResult.problem.message);
          return;
        }
      }
      if (!sameMembers(quickActionCodes, currentQuickActionCodes)) {
        const quickActionsResult = await apiRequest(ApiEndpoints.users.quickActions(user!.id), {
          method: "PUT",
          body: { actionCodes: quickActionCodes },
        });
        if (!quickActionsResult.ok) {
          setErrorMessage(quickActionsResult.problem.message);
          return;
        }
      }
      setSuccessMessage(translateMessage("securityManagement.userEditor.saved"));
      onSaved?.();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (creationOptions.roles.length === 0 && isCreate) {
    return <p className="text-sm text-muted-foreground">{translateMessage("security.createUser.roleCannotCreate")}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <SectionCard title={translateMessage("securityManagement.userEditor.loginDetailsTitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInputField
            label={translateMessage("security.createUser.emailLabel")}
            name="email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            hint={translateMessage("security.createUser.emailHint")}
            errorMessage={fieldErrorMessages.email}
            required
          />
          <TextInputField
            label={translateMessage("security.createUser.fullNameLabel")}
            name="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            errorMessage={fieldErrorMessages.fullName}
            required
          />
          <FormField label={translateMessage("security.createUser.roleLabel")} name="roleCode" errorMessage={fieldErrorMessages.roleCode} isRequired>
            {(controlProps) => (
              <NativeSelect {...controlProps} value={roleCode} onChange={(event) => setRoleCode(event.target.value)} disabled={isRoleFixed}>
                {rolesOffered.map((offeredRoleCode) => {
                  const messageKey = findRoleMessageKey(offeredRoleCode);
                  return (
                    <option key={offeredRoleCode} value={offeredRoleCode}>
                      {messageKey ? translateMessage(messageKey) : offeredRoleCode}
                    </option>
                  );
                })}
              </NativeSelect>
            )}
          </FormField>
          {isCreate && (
            <TextInputField
              label={translateMessage("security.createUser.passwordLabel")}
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              hint={translateMessage("securityManagement.userEditor.passwordHint", { minimumLength: String(MINIMUM_PASSWORD_LENGTH) })}
              errorMessage={fieldErrorMessages.password}
              required
            />
          )}
        </div>

        {!isOwnAccount && (
          <fieldset className="mt-4 space-y-2">
            <legend className="text-sm font-medium text-foreground">{translateMessage("security.createUser.storesLegend")}</legend>
            {rolesWithoutStores ? (
              <p className="text-sm text-muted-foreground">{translateMessage("securityManagement.userEditor.ownerHasAllStores")}</p>
            ) : creationOptions.stores.length === 0 ? (
              <p className="text-sm text-muted-foreground">{translateMessage("security.createUser.noStores")}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {creationOptions.stores.map((store) => (
                  <label
                    key={store.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                  >
                    <input type="checkbox" className="size-4 accent-primary" checked={storeIds.has(store.id)} onChange={() => toggleStore(store.id)} />
                    <span>
                      {store.code} · {store.name}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {storesNotOffered.length > 0 && (
              <p className="text-xs text-muted-foreground">{translateMessage("securityManagement.userEditor.otherStoresKept", { storeCount: String(storesNotOffered.length) })}</p>
            )}
            {fieldErrorMessages.storeIds && <p className="text-xs font-medium text-destructive">{fieldErrorMessages.storeIds}</p>}
          </fieldset>
        )}
      </SectionCard>

      {showPermissionTree && catalog && (
        <SectionCard
          title={translateMessage("securityManagement.userEditor.permissionsTitle")}
          description={translateMessage(isCreate ? "securityManagement.userEditor.permissionsHintCreate" : "securityManagement.userEditor.permissionsHintEdit")}
        >
          <div className="space-y-4">
            {!holdsEveryPermissionByRole && (
              <RoleTemplatePicker
                onApplyTemplate={(permissionCodes) => {
                  setSelectedPermissionCodes(new Set(permissionCodes.filter((code) => assignableCodes.has(code))));
                  setHasChosenPermissions(true);
                }}
              />
            )}
            {holdsEveryPermissionByRole && (
              <InlineNotice tone="info">{translateMessage("securityManagement.userEditor.ownerHoldsEverything")}</InlineNotice>
            )}
            <PermissionTreeEditor
              catalog={catalog}
              selectedCodes={holdsEveryPermissionByRole ? new Set(currentPermissionCodes) : selectedPermissionCodes}
              assignableCodes={assignableCodes}
              isReadOnly={holdsEveryPermissionByRole || isOwnAccount || (!isCreate && !assignableCodes.size)}
              onChange={(next) => {
                setSelectedPermissionCodes(next);
                setHasChosenPermissions(true);
              }}
            />
          </div>
        </SectionCard>
      )}

      <SectionCard title={translateMessage("securityManagement.userEditor.quickActionsTitle")}>
        <QuickActionsChecklist selectedActionCodes={quickActionCodes} onChange={setQuickActionCodes} />
      </SectionCard>

      <div className="space-y-3">
        {!isOnline && <InlineNotice tone="warning">{translateMessage("security.createUser.offlineNotice")}</InlineNotice>}
        <FormResultNotice errorMessage={errorMessage} successMessage={successMessage} />
        <SubmitButton
          label={translateMessage(isCreate ? "security.createUser.submit" : "securityManagement.userEditor.save")}
          pendingLabel={translateMessage("security.createUser.submitting")}
          isPending={isSubmitting}
          isDisabled={!isOnline}
        />
      </div>
    </form>
  );
}
