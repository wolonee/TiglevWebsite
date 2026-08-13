/**
 * Описание панели фильтров приходит из данных, а не из вёрстки.
 *
 * `facets.json` пересобирается парсером после каждого обхода каталога
 * (`python3 parser/carclick.py facets`). Марки появляются и исчезают,
 * счётчики плывут — вёрстка просто читает файл и рисует по нему панель.
 * Поэтому здесь только типы и загрузка; списка значений в коде нет.
 */

import facetsJson from "./facets.json";

export type FacetValue = {
  value: string;
  label: string;
  count: number;
};

export type CheckboxFacet = {
  key: string;
  type: "checkbox";
  label: string;
  column?: string;
  hint?: string;
  values: FacetValue[];
};

export type RangeBucket = {
  from: number;
  to: number | null;
  label: string;
  count: number;
};

export type RangeFacet = {
  key: string;
  type: "range";
  label: string;
  column?: string;
  min: number;
  max: number;
  unit: string;
  buckets: RangeBucket[];
};

export type BrandNode = FacetValue & { models?: FacetValue[] };

export type SearchTreeFacet = {
  key: string;
  type: "search-tree";
  label: string;
  hint?: string;
  values: BrandNode[];
};

export type Facet = CheckboxFacet | RangeFacet | SearchTreeFacet;

export type OptionFacet = {
  id: number;
  label: string;
  count: number;
  share: number;
};

export type OptionGroup = {
  title: string;
  options: OptionFacet[];
};

export type SkippedFacet = {
  field: string;
  label: string;
  reason: string;
};

export type FacetsSpec = {
  generatedAt: string;
  totalLots: number;
  detailFetched: number;
  note?: string;
  basic: Facet[];
  advanced: Facet[];
  optionGroups: OptionGroup[];
  skipped: SkippedFacet[];
};

export const facets = facetsJson as unknown as FacetsSpec;

export function findFacet(key: string): Facet | undefined {
  return [...facets.basic, ...facets.advanced].find((facet) => facet.key === key);
}
