"use client";

import { useState } from "react";
import { useWorkingStoreId } from "@/lib/session/useWorkingStoreId";
import { currentSalaryMonth, salaryMonthToFirstDayIsoDate, type SalaryMonth } from "../logic/salaryMonth";

// Which salary sheet a screen shows: a store and a month. The store starts as the one chosen in the top bar (or the person's only store); until a store is
// chosen nothing is requested. The month starts as the current month.
export function useSalarySheetSelection() {
  const workingStoreId = useWorkingStoreId();
  const [chosenStoreId, setChosenStoreId] = useState<string | null>(null);
  const [salaryMonth, setSalaryMonth] = useState<SalaryMonth>(() => currentSalaryMonth());
  const storeId = chosenStoreId ?? workingStoreId ?? "";
  return {
    storeId,
    setStoreId: setChosenStoreId,
    salaryMonth,
    setSalaryMonth,
    monthIsoDate: salaryMonthToFirstDayIsoDate(salaryMonth),
  };
}
