// Canonical profile data shape + defaults.
// Loaded via <script> in options/popup pages, and importScripts() in the service worker.

const SCHEMA_VERSION = 1;

function getDefaultProfile() {
  return {
    schemaVersion: SCHEMA_VERSION,
    personal: {
      firstName: "",
      middleName: "",
      lastName: "",
      preferredName: "",
      pronouns: "",
      dateOfBirth: ""
    },
    contact: {
      email: "",
      phone: "",
      phoneCountryCode: "+1"
    },
    address: {
      street1: "",
      street2: "",
      city: "",
      state: "",
      zip: "",
      country: "United States"
    },
    links: {
      linkedin: "",
      github: "",
      portfolio: "",
      website: ""
    },
    workAuthorization: {
      authorizedToWorkInCountry: "Yes",
      requiresSponsorship: "No",
      visaStatus: ""
    },
    experience: {
      totalYearsExperience: "",
      currentTitle: "",
      currentEmployer: "",
      desiredSalary: "",
      desiredSalaryPeriod: "year",
      noticePeriod: "",
      willingToRelocate: "No",
      willingToTravel: "No"
    },
    workHistory: [],
    education: [],
    demographics: {
      optOut: true,
      gender: "",
      race: "",
      veteranStatus: "",
      disabilityStatus: "",
      hispanicOrLatino: ""
    },
    documents: {
      resumeText: "",
      resumeFileName: "",
      resumeFileDataUrl: "",
      coverLetterTemplate: ""
    },
    freeTextAnswers: {
      whyThisCompany: "",
      whyThisRole: "",
      greatestStrength: "",
      additionalInfo: ""
    },
    learnedAnswers: []
  };
}

function makeLearnedAnswerEntry(questionText, value) {
  return {
    id: `la_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    questionText,
    value,
    createdAt: new Date().toISOString()
  };
}

function makeEmptyWorkHistoryEntry() {
  return {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    employer: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    description: ""
  };
}

function makeEmptyEducationEntry() {
  return {
    id: `ed_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    school: "",
    degree: "",
    fieldOfStudy: "",
    gpa: "",
    startDate: "",
    endDate: "",
    current: false
  };
}

function migrateProfile(profile) {
  if (!profile || typeof profile !== "object") return getDefaultProfile();
  if (!Array.isArray(profile.learnedAnswers)) profile.learnedAnswers = [];
  if (profile.schemaVersion === SCHEMA_VERSION) return profile;
  // No prior versions yet; just stamp the current version.
  profile.schemaVersion = SCHEMA_VERSION;
  return profile;
}
