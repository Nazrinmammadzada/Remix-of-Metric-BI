// HR-issued evaluation surveys to employees

const KEY = "evaluation_surveys_v1";

export type PeriodType = "halfYear" | "annual";

export interface EvaluationSurvey {
  id: string;
  periodType: PeriodType;
  half?: "H1" | "H2";
  year: number;
  deadline: string; // ISO date
  employeeIds: string[];
  notifyEmail: boolean;
  createdAt: number;
}

export const getSurveys = (): EvaluationSurvey[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};

export const addSurvey = (s: Omit<EvaluationSurvey, "id" | "createdAt">) => {
  const list = getSurveys();
  const next: EvaluationSurvey = { ...s, id: `srv_${Date.now()}`, createdAt: Date.now() };
  list.push(next);
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("surveys-updated"));
  return next;
};
