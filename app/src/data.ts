/** Bundles the course content at build time (no network requests, so the app works offline). */
import syllabusJson from "../../syllabus/part1.json";
import glycolysis from "../../pathways/glycolysis.json";
import type { Syllabus, UnitFile } from "../../src/content/types.ts";
import { createCatalog } from "./lib/catalog.ts";
import type { Pathway } from "./lib/pathway.ts";

const unitModules = import.meta.glob<UnitFile>("../../content/part1/*.json", { eager: true, import: "default" });

export const catalog = createCatalog(syllabusJson as Syllabus, Object.values(unitModules));
export const pathways: Pathway[] = [glycolysis as Pathway];
