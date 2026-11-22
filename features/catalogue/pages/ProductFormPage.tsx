"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";
import { FormResultNotice } from "@/components/feedback/InlineNotice";
import { LoadingIndicator } from "@/components/feedback/LoadingIndicator";
import { FormField } from "@/components/forms/FormField";
import { OptionSelect } from "@/components/forms/OptionSelect";
import { PercentageField } from "@/components/forms/PercentageField";
import { QuantityField } from "@/components/forms/QuantityField";
import { SearchableSelect } from "@/components/forms/SearchableSelect";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextInputField } from "@/components/forms/TextInputField";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionCard } from "@/components/layout/SectionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApiMutation } from "@/lib/api/hooks/useApiMutation";
import { useApiQuery } from "@/lib/api/hooks/useApiQuery";
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { ApplicationRoutes } from "@/lib/constants/applicationRoutes";
import { PermissionCodes } from "@/lib/contracts/permissionCodes";
import { ToneNames } from "@/lib/design/semanticTones";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { showToast } from "@/lib/toast/toastStore";
import { ProductImagesPanel } from "../components/ProductImagesPanel";
import { ProductPriceHistoryPanel } from "../components/ProductPriceHistoryPanel";
import { ProductSizesGrid } from "../components/ProductSizesGrid";
import { useCatalogueLookups } from "../hooks/useCatalogueLookups";
import { CatalogueLimits } from "../logic/catalogueLimits";
import {
  createEmptyProductForm,
  hasProductFormErrors,
  toCreateProductRequest,
  toUpdateProductRequest,
  validateProductForm,
  valuesFromProduct,
  type ProductFormErrors,
  type ProductFormField,
  type ProductFormValues,
  type ProductVariantRowErrors,
} from "../logic/productFormLogic";
import {
  ProductStatusCodes,
  type CreateProductRequest,
  type NextProductCodeResponse,
  type ProductDetailResponse,
  type ProductSavedResponse,
  type UpdateProductRequest,
} from "../types/catalogueTypes";

const TAB_BASIC_INFORMATION = "basic";
const TAB_EXTRA = "extra";
const TAB_IMAGES = "images";
const TAB_PRICE_HISTORY = "history";

// New Product and the edit page of View Products (docx 4.1) share this form. Basic Info holds the names, the classification and the Sizes
// grid; Extra holds weight, tax and the description; Images holds four pictures (after the first save); Price History lists every price
// change of an existing product. The product code is given by the server when the product is first saved. Ctrl+S saves.
export function ProductFormPage({ productId }: { productId?: string }) {
  const { translateMessage } = useTranslation();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const isEditing = productId !== undefined;
  const [values, setValues] = useState<ProductFormValues>(createEmptyProductForm);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [rowErrors, setRowErrors] = useState<ProductVariantRowErrors>({});
  const [message, setMessage] = useState<string>();
  const [loadedProduct, setLoadedProduct] = useState<ProductDetailResponse | null>(null);
  const [activeTab, setActiveTab] = useState<string>(TAB_BASIC_INFORMATION);

  const product = useApiQuery<ProductDetailResponse>(isEditing ? ApiEndpoints.products.byId(productId) : null, { enabled: isEditing });
  const nextCode = useApiQuery<NextProductCodeResponse>(isEditing ? null : ApiEndpoints.products.nextCode, { enabled: !isEditing });
  const lookups = useCatalogueLookups(values.departmentId || undefined);
  const create = useApiMutation<CreateProductRequest, ProductSavedResponse>(ApiEndpoints.products.list);
  const update = useApiMutation<UpdateProductRequest>(isEditing ? ApiEndpoints.products.byId(productId) : "", { method: "PUT" });
  const maySave = hasPermission(isEditing ? PermissionCodes.PRODUCTS.NEW_PRODUCT.EDIT : PermissionCodes.PRODUCTS.NEW_PRODUCT.ADD);
  const mayChangeSalePrice = hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.CHANGE_SELLING_PRICE);

  // The loaded product fills the form (adjusting state while rendering, not in an effect).
  if (product.data && product.data !== loadedProduct) {
    setLoadedProduct(product.data);
    setValues(valuesFromProduct(product.data));
    setErrors({});
    setRowErrors({});
  }

  function change<TField extends keyof ProductFormValues>(field: TField, value: ProductFormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  const fieldErrors = isEditing ? update.fieldErrorMessages : create.fieldErrorMessages;
  const errorText = (field: ProductFormField) => (errors[field] ? translateMessage(errors[field]) : fieldErrors[field]);
  const nullable = (id: string) => (id === "" ? null : id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateProductForm(values);
    setErrors(found.errors);
    setRowErrors(found.rowErrors);
    setMessage(undefined);
    if (hasProductFormErrors(found)) {
      // The Basic Info tab holds the sizes and the main fields; the Extra tab holds weight, tax and description.
      const onlyExtraFieldsFailed = !found.errors.name && !found.errors.nameUrdu && !found.errors.departmentId && !found.errors.categoryId && !found.errors.variants && Object.keys(found.rowErrors).length === 0;
      if (onlyExtraFieldsFailed) setActiveTab(TAB_EXTRA);
      else setActiveTab(TAB_BASIC_INFORMATION);
      return;
    }
    if (loadedProduct) {
      const result = await update.execute(toUpdateProductRequest(values, loadedProduct.rowVersion));
      if (!result.ok) return setMessage(result.problem.message);
      showToast(translateMessage("catalogue.toast.productSaved"), ToneNames.success);
      product.refetch();
      return;
    }
    const result = await create.execute(toCreateProductRequest(values));
    if (!result.ok) return setMessage(result.problem.message);
    showToast(translateMessage("catalogue.toast.productCreated", { code: result.data.code }), ToneNames.success);
    // The pictures can be added once the product exists, so the new product opens on its edit page.
    router.push(ApplicationRoutes.editProduct(result.data.productId));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  }

  if (isEditing && product.status === "loading") return <LoadingIndicator />;
  if (isEditing && product.status === "error") return <FormResultNotice errorMessage={product.problem?.message} />;

  const isSaving = create.isPending || update.isPending;
  const statusOptions = [
    { value: ProductStatusCodes.active, label: translateMessage("common.status.active") },
    { value: ProductStatusCodes.inactive, label: translateMessage("common.status.inactive") },
  ];

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6" noValidate>
      <PageHeader
        title={translateMessage(isEditing ? "catalogue.product.editTitle" : "navigation.item.newProduct")}
        subtitle={translateMessage(isEditing ? "catalogue.product.editSubtitle" : "catalogue.product.newSubtitle")}
        actions={
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(ApplicationRoutes.viewProducts)}>
              {translateMessage("catalogue.product.backToList")}
            </Button>
            {maySave && <SubmitButton label={translateMessage("common.save")} pendingLabel={translateMessage("common.pleaseWait")} isPending={isSaving} />}
          </div>
        }
      />
      <FormResultNotice errorMessage={message} />

      <Tabs value={activeTab} onValueChange={(next) => setActiveTab(String(next))}>
        <TabsList>
          <TabsTrigger value={TAB_BASIC_INFORMATION}>{translateMessage("catalogue.product.tabBasic")}</TabsTrigger>
          <TabsTrigger value={TAB_EXTRA}>{translateMessage("catalogue.product.tabExtra")}</TabsTrigger>
          <TabsTrigger value={TAB_IMAGES}>{translateMessage("catalogue.product.tabImages")}</TabsTrigger>
          {isEditing && <TabsTrigger value={TAB_PRICE_HISTORY}>{translateMessage("catalogue.product.tabHistory")}</TabsTrigger>}
        </TabsList>

        <TabsContent value={TAB_BASIC_INFORMATION} className="space-y-6">
          <SectionCard title={translateMessage("catalogue.product.basicTitle")}>
            <div className="grid gap-4 md:grid-cols-3">
              <TextInputField label={translateMessage("catalogue.field.productCode")} name="catalogueProductCode" dir="ltr" readOnly value={loadedProduct?.code ?? nextCode.data?.code ?? ""} hint={translateMessage(isEditing ? "catalogue.product.codeFixed" : "catalogue.product.codeAssigned")} />
              <TextInputField label={translateMessage("catalogue.field.productName")} name="name" required maxLength={CatalogueLimits.productNameMaximumLength} value={values.name} onChange={(event) => change("name", event.target.value)} errorMessage={errorText("name")} />
              <TextInputField label={translateMessage("catalogue.field.productNameUrdu")} name="nameUrdu" dir="rtl" maxLength={CatalogueLimits.productNameMaximumLength} value={values.nameUrdu} onChange={(event) => change("nameUrdu", event.target.value)} errorMessage={errorText("nameUrdu")} />
              <FormField label={translateMessage("catalogue.filter.department")} name="departmentId" isRequired errorMessage={errorText("departmentId")}>
                {(controlProps) => <SearchableSelect {...controlProps} options={lookups.departmentOptions} value={nullable(values.departmentId)} onValueChange={(next) => setValues((current) => ({ ...current, departmentId: next ?? "", categoryId: "" }))} />}
              </FormField>
              <FormField label={translateMessage("catalogue.filter.category")} name="categoryId" isRequired errorMessage={errorText("categoryId")}>
                {(controlProps) => <SearchableSelect {...controlProps} options={lookups.categoryOptions} value={nullable(values.categoryId)} isDisabled={values.departmentId === ""} onValueChange={(next) => change("categoryId", next ?? "")} />}
              </FormField>
              <FormField label={translateMessage("catalogue.filter.brand")} name="brandId">
                {(controlProps) => <SearchableSelect {...controlProps} options={lookups.brandOptions} value={nullable(values.brandId)} isClearable onValueChange={(next) => change("brandId", next ?? "")} />}
              </FormField>
              <FormField label={translateMessage("catalogue.filter.season")} name="seasonId">
                {(controlProps) => <SearchableSelect {...controlProps} options={lookups.seasonOptions} value={nullable(values.seasonId)} isClearable onValueChange={(next) => change("seasonId", next ?? "")} />}
              </FormField>
              <FormField label={translateMessage("catalogue.filter.gender")} name="genderId">
                {(controlProps) => <SearchableSelect {...controlProps} options={lookups.genderOptions} value={nullable(values.genderId)} isClearable onValueChange={(next) => change("genderId", next ?? "")} />}
              </FormField>
              <FormField label={translateMessage("catalogue.field.productType")} name="productTypeId">
                {(controlProps) => <SearchableSelect {...controlProps} options={lookups.productTypeOptions} value={nullable(values.productTypeId)} isClearable onValueChange={(next) => change("productTypeId", next ?? "")} />}
              </FormField>
              <FormField label={translateMessage("catalogue.field.unit")} name="unitId">
                {(controlProps) => <SearchableSelect {...controlProps} options={lookups.unitOptions} value={nullable(values.unitId)} isClearable onValueChange={(next) => change("unitId", next ?? "")} />}
              </FormField>
              <FormField label={translateMessage("catalogue.field.location")} name="locationId">
                {(controlProps) => <SearchableSelect {...controlProps} options={lookups.locationOptions} value={nullable(values.locationId)} isClearable onValueChange={(next) => change("locationId", next ?? "")} />}
              </FormField>
              <FormField label={translateMessage("catalogue.field.status")} name="status">
                {(controlProps) => <OptionSelect {...controlProps} value={values.status} onValueChange={(next) => change("status", next)} options={statusOptions} />}
              </FormField>
            </div>
          </SectionCard>
          <SectionCard title={translateMessage("catalogue.sizes.title")} description={translateMessage("catalogue.sizes.description")}>
            <ProductSizesGrid rows={values.variants} onRowsChange={(rows) => change("variants", rows)} rowErrors={rowErrors} lookups={lookups} canChangeSalePriceOfSavedSizes={mayChangeSalePrice} />
            {errors.variants && (
              <p role="alert" className="mt-2 text-xs font-medium text-destructive">
                {translateMessage(errors.variants)}
              </p>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value={TAB_EXTRA}>
          <SectionCard title={translateMessage("catalogue.product.extraTitle")}>
            <div className="grid gap-4 md:grid-cols-3">
              <QuantityField label={translateMessage("catalogue.field.weight")} name="weight" value={values.weight} onValueChange={(next) => change("weight", next)} errorMessage={errorText("weight")} hint={translateMessage("catalogue.field.weightHint")} />
              <PercentageField label={translateMessage("catalogue.field.taxRate")} name="taxRate" value={values.taxRate} onValueChange={(next) => change("taxRate", next)} errorMessage={errorText("taxRate")} />
              <TextInputField label={translateMessage("catalogue.field.taxCode")} name="taxCode" dir="ltr" maxLength={CatalogueLimits.taxCodeMaximumLength} value={values.taxCode} onChange={(event) => change("taxCode", event.target.value)} errorMessage={errorText("taxCode")} />
              <div className="md:col-span-3">
                <FormField label={translateMessage("catalogue.field.description")} name="description" errorMessage={errorText("description")}>
                  {(controlProps) => <Textarea {...controlProps} rows={5} maxLength={CatalogueLimits.descriptionMaximumLength} value={values.description} onChange={(event) => change("description", event.target.value)} />}
                </FormField>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value={TAB_IMAGES}>
          <SectionCard title={translateMessage("catalogue.product.imagesTitle")} description={translateMessage("catalogue.product.imagesDescription")}>
            <ProductImagesPanel productId={productId} filledSlots={(loadedProduct?.images ?? []).map((image) => image.slot)} canEdit={hasPermission(PermissionCodes.PRODUCTS.NEW_PRODUCT.EDIT)} onChanged={product.refetch} />
          </SectionCard>
        </TabsContent>

        {isEditing && (
          <TabsContent value={TAB_PRICE_HISTORY}>
            <SectionCard title={translateMessage("catalogue.history.title")} isPadded={false}>
              <ProductPriceHistoryPanel productId={productId} />
            </SectionCard>
          </TabsContent>
        )}
      </Tabs>
    </form>
  );
}
