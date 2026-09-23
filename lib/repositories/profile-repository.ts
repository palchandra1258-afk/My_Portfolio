// Access boundary between UI code and the current profile/resume content
// source. Delegates entirely to content/resume-data.ts — no transformation,
// no new data model.
export {
  personal,
  education,
  experience,
  achievements,
  financeAreas,
  technologyXFinanceAreas,
  skills,
  additionalVerifiedSkills,
} from "@/content/resume-data";
