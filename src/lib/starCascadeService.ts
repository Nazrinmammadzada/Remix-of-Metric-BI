// Star Person Cascade Service — thin re-export layer over orgStore.
// Rəhbər rolu birbaşa ŞƏXSƏ verilir (vəzifəyə deyil). Kaskadlama tamamilə
// dinamikdir — heç bir sabit səviyyə adı və ya matris yoxdur.
export {
  setStarPerson,
  isStarPerson,
  getStarHolderOfUnit,
  getStarHoldersOfUnit,
  getSubordinatesOfStarHolder,
  resolveCascadeChain,
  resolveAllCascadeChains,
  validateStarStructure,
  routeKpiToUnit,
  MissingStarError,
  type CascadeNode,
  type StarValidationIssue,
} from "./orgStore";
