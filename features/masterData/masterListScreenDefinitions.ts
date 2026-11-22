// One entry per simple master list screen: which endpoint it talks to and which permissions it needs.
// The pages (app/(company)/settings/<list>/page.tsx) pick their entry by key, so a new list is one entry here.
import { ApiEndpoints } from "@/lib/constants/apiEndpoints";
import { PermissionCodes, type PermissionCode } from "@/lib/contracts/permissionCodes";
import type { MessageKey } from "@/lib/i18n/messageKeys";

export type MasterListScreenDefinition = {
  listPath: string;
  titleMessageKey: MessageKey;
  subtitleMessageKey: MessageKey;
  addPermissionCode: PermissionCode;
  editPermissionCode: PermissionCode;
  deletePermissionCode: PermissionCode;
  offlineCacheName: string;
};

export const MasterListScreenDefinitions = {
  departments: {
    listPath: ApiEndpoints.masterData.departments,
    titleMessageKey: "navigation.item.departments",
    subtitleMessageKey: "masterData.subtitle.departments",
    addPermissionCode: PermissionCodes.SETTINGS.DEPARTMENT.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.DEPARTMENT.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.DEPARTMENT.DELETE,
    offlineCacheName: "masterDataDepartments",
  },
  brands: {
    listPath: ApiEndpoints.masterData.brands,
    titleMessageKey: "navigation.item.brands",
    subtitleMessageKey: "masterData.subtitle.brands",
    addPermissionCode: PermissionCodes.SETTINGS.COMPANY_BRAND.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.COMPANY_BRAND.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.COMPANY_BRAND.DELETE,
    offlineCacheName: "masterDataBrands",
  },
  seasons: {
    listPath: ApiEndpoints.masterData.seasons,
    titleMessageKey: "navigation.item.seasons",
    subtitleMessageKey: "masterData.subtitle.seasons",
    addPermissionCode: PermissionCodes.SETTINGS.SEASON.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.SEASON.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.SEASON.DELETE,
    offlineCacheName: "masterDataSeasons",
  },
  genders: {
    listPath: ApiEndpoints.masterData.genders,
    titleMessageKey: "navigation.item.genders",
    subtitleMessageKey: "masterData.subtitle.genders",
    addPermissionCode: PermissionCodes.SETTINGS.GENDER.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.GENDER.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.GENDER.DELETE,
    offlineCacheName: "masterDataGenders",
  },
  colors: {
    listPath: ApiEndpoints.masterData.colors,
    titleMessageKey: "navigation.item.colors",
    subtitleMessageKey: "masterData.subtitle.colors",
    addPermissionCode: PermissionCodes.SETTINGS.COLOR.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.COLOR.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.COLOR.DELETE,
    offlineCacheName: "masterDataColors",
  },
  locations: {
    listPath: ApiEndpoints.masterData.locations,
    titleMessageKey: "navigation.item.locations",
    subtitleMessageKey: "masterData.subtitle.locations",
    addPermissionCode: PermissionCodes.SETTINGS.LOCATION.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.LOCATION.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.LOCATION.DELETE,
    offlineCacheName: "masterDataLocations",
  },
  units: {
    listPath: ApiEndpoints.masterData.units,
    titleMessageKey: "navigation.item.units",
    subtitleMessageKey: "masterData.subtitle.units",
    addPermissionCode: PermissionCodes.SETTINGS.UNIT.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.UNIT.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.UNIT.DELETE,
    offlineCacheName: "masterDataUnits",
  },
  citiesAndAreas: {
    listPath: ApiEndpoints.masterData.cities,
    titleMessageKey: "navigation.item.citiesAndAreas",
    subtitleMessageKey: "masterData.subtitle.citiesAndAreas",
    addPermissionCode: PermissionCodes.SETTINGS.CITY_AREA.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.CITY_AREA.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.CITY_AREA.DELETE,
    offlineCacheName: "masterDataCities",
  },
  sizeGroups: {
    listPath: ApiEndpoints.masterData.sizeGroups,
    titleMessageKey: "navigation.item.sizeGroups",
    subtitleMessageKey: "masterData.subtitle.sizeGroups",
    addPermissionCode: PermissionCodes.SETTINGS.SIZE_GROUP.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.SIZE_GROUP.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.SIZE_GROUP.DELETE,
    offlineCacheName: "masterDataSizeGroups",
  },
  productTypes: {
    listPath: ApiEndpoints.masterData.productTypes,
    titleMessageKey: "navigation.item.productTypes",
    subtitleMessageKey: "masterData.subtitle.productTypes",
    addPermissionCode: PermissionCodes.SETTINGS.PRODUCT_TYPE.ADD,
    editPermissionCode: PermissionCodes.SETTINGS.PRODUCT_TYPE.EDIT,
    deletePermissionCode: PermissionCodes.SETTINGS.PRODUCT_TYPE.DELETE,
    offlineCacheName: "masterDataProductTypes",
  },
} as const satisfies Record<string, MasterListScreenDefinition>;

export type MasterListScreenKey = keyof typeof MasterListScreenDefinitions;
