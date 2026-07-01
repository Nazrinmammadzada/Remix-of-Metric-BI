// Star Position Cascade Service — thin re-export layer over orgStore.
// Hər hansı sabit səviyyə adı yoxdur; kaskadlama tamamilə dinamikdir.
export {
  setStarPosition,
  getStarPositionOfUnit,
  getStarHolderOfUnit,
  getStarHoldersOfUnit,
  resolveCascadeChain,
  resolveAllCascadeChains,
  validateStarStructure,
  routeKpiToUnit,
  MissingStarError,
  type CascadeNode,
  type StarValidationIssue,
} from "./orgStore";
