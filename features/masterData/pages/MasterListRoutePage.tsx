"use client";

import { MasterListScreen } from "../components/MasterListScreen";
import { SizesOfSizeGroupPanel } from "../components/SizesOfSizeGroupPanel";
import { MasterListScreenDefinitions, type MasterListScreenKey } from "../masterListScreenDefinitions";

// The page of one simple master list. Size groups also show their sizes under the grid.
export function MasterListRoutePage({ screenKey }: { screenKey: MasterListScreenKey }) {
  const definition = MasterListScreenDefinitions[screenKey];
  return <MasterListScreen {...definition} belowGrid={screenKey === "sizeGroups" ? <SizesOfSizeGroupPanel /> : undefined} />;
}
