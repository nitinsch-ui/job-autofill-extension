// Schema dot-path -> alias phrases + weight + optional input type hints.
// Loaded first among content scripts; defines the global FIELD_DICTIONARY, SELECT_SYNONYMS, DENYLIST_TERMS.

const FIELD_DICTIONARY = {
  "personal.firstName": {
    weight: 1.0,
    aliases: ["first name", "given name", "fname", "legal first name", "preferred first name", "first"]
  },
  "personal.lastName": {
    weight: 1.0,
    aliases: ["last name", "surname", "family name", "lname", "legal last name", "last"]
  },
  "personal.middleName": {
    weight: 0.9,
    aliases: ["middle name", "middle initial", "mname"]
  },
  "personal.preferredName": {
    weight: 0.8,
    aliases: ["preferred name", "nickname", "goes by", "display name"]
  },
  "personal.pronouns": {
    weight: 0.8,
    aliases: ["pronouns", "preferred pronouns"]
  },
  "contact.email": {
    weight: 1.0,
    aliases: ["email", "email address", "e mail", "e-mail", "work email", "personal email"],
    inputTypeHints: ["email"]
  },
  "contact.phone": {
    weight: 1.0,
    aliases: ["phone", "phone number", "mobile", "mobile number", "cell", "cell phone",
              "telephone", "contact number", "primary phone"],
    inputTypeHints: ["tel"]
  },
  "address.street1": {
    weight: 0.9,
    aliases: ["address", "street address", "address line 1", "address 1", "street", "mailing address"]
  },
  "address.street2": {
    weight: 0.9,
    aliases: ["address line 2", "address 2", "apt", "suite", "unit", "apartment"]
  },
  "address.city": {
    weight: 1.0,
    aliases: ["city", "town", "municipality", "city or town"]
  },
  "address.state": {
    weight: 1.0,
    aliases: ["state", "province", "region", "state or province", "state province"]
  },
  "address.zip": {
    weight: 1.0,
    aliases: ["zip", "zip code", "postal code", "postcode", "zip postal code"]
  },
  "address.country": {
    weight: 1.0,
    aliases: ["country", "nation", "country of residence"]
  },
  "links.linkedin": {
    weight: 1.0,
    aliases: ["linkedin", "linkedin url", "linkedin profile", "linkedin profile url"],
    inputTypeHints: ["url"]
  },
  "links.github": {
    weight: 1.0,
    aliases: ["github", "github url", "github profile", "github username"],
    inputTypeHints: ["url"]
  },
  "links.portfolio": {
    weight: 0.9,
    aliases: ["portfolio", "portfolio url", "portfolio website", "work samples", "personal website", "website url"],
    inputTypeHints: ["url"]
  },
  "links.website": {
    weight: 0.8,
    aliases: ["website", "personal site", "blog", "homepage"],
    inputTypeHints: ["url"]
  },
  "workAuthorization.authorizedToWorkInCountry": {
    weight: 1.0,
    aliases: ["authorized to work", "legally authorized to work", "work authorization",
              "eligible to work", "authorized in the us", "legally eligible",
              "are you authorized to work in the us", "are you authorized to work"]
  },
  "workAuthorization.requiresSponsorship": {
    weight: 1.0,
    aliases: ["require sponsorship", "visa sponsorship", "need sponsorship",
              "require visa", "currently require sponsorship", "sponsorship required"]
  },
  "experience.totalYearsExperience": {
    weight: 0.9,
    aliases: ["years of experience", "total experience", "years experience",
              "how many years", "total years"],
    inputTypeHints: ["number"]
  },
  "experience.currentTitle": {
    weight: 0.8,
    aliases: ["current title", "job title", "current position", "position title", "your title"]
  },
  "experience.currentEmployer": {
    weight: 0.8,
    aliases: ["current employer", "current company", "employer", "company name", "where do you work"]
  },
  "experience.desiredSalary": {
    weight: 0.9,
    aliases: ["desired salary", "expected salary", "salary expectation", "compensation expectations",
              "desired compensation", "salary requirements"],
    inputTypeHints: ["number"]
  },
  "experience.willingToRelocate": {
    weight: 0.9,
    aliases: ["willing to relocate", "open to relocate", "relocation", "relocate"]
  },
  "experience.willingToTravel": {
    weight: 0.85,
    aliases: ["willing to travel", "open to travel", "travel required", "travel"]
  },
  "experience.noticePeriod": {
    weight: 0.85,
    aliases: ["notice period", "available to start", "start date", "earliest start",
              "when can you start"]
  },
  "documents.resumeText": {
    weight: 0.7,
    aliases: ["paste your resume", "resume text", "cv text", "resume paste", "paste resume here",
              "copy and paste your resume"]
  },
  "documents.coverLetterTemplate": {
    weight: 0.7,
    aliases: ["cover letter", "cover letter text", "letter of interest"]
  },
  "freeTextAnswers.whyThisCompany": {
    weight: 0.55,
    aliases: ["why do you want to work here", "why are you interested in this company",
              "why this company", "what interests you about", "why do you want to join"]
  },
  "freeTextAnswers.whyThisRole": {
    weight: 0.55,
    aliases: ["why are you interested in this role", "why this position",
              "why this role", "why do you want this job"]
  },
  "freeTextAnswers.greatestStrength": {
    weight: 0.5,
    aliases: ["greatest strength", "biggest strength", "top strength", "describe yourself"]
  },
  "freeTextAnswers.additionalInfo": {
    weight: 0.45,
    aliases: ["additional information", "anything else", "other information",
              "is there anything else", "additional comments"]
  },
  // Demographics — only matched when demographics.optOut is false
  "demographics.gender": {
    weight: 0.9, isDemographic: true,
    aliases: ["gender", "gender identity", "sex"]
  },
  "demographics.race": {
    weight: 0.9, isDemographic: true,
    aliases: ["race", "race ethnicity", "racial group", "ethnicity"]
  },
  "demographics.veteranStatus": {
    weight: 0.9, isDemographic: true,
    aliases: ["veteran status", "military status", "protected veteran", "veteran"]
  },
  "demographics.disabilityStatus": {
    weight: 0.9, isDemographic: true,
    aliases: ["disability status", "disability", "disabled"]
  },
  "demographics.hispanicOrLatino": {
    weight: 0.9, isDemographic: true,
    aliases: ["hispanic or latino", "hispanic", "latino", "latinx"]
  }
};

// Synonym tables used when matching <select> options and radio button labels.
const SELECT_SYNONYMS = {
  country: {
    "united states": ["us", "usa", "u.s.", "u.s.a.", "united states of america", "america"],
    "united kingdom": ["uk", "u.k.", "great britain", "gb"],
    "canada": ["ca", "can"]
  },
  yesNo: {
    "yes": ["true", "authorized", "eligible", "1", "y"],
    "no": ["false", "not authorized", "ineligible", "0", "n"]
  }
};

// Terms that should never be auto-interacted with (legal agreements, consent, etc.)
const DENYLIST_TERMS = [
  "agree", "terms", "consent", "certify", "acknowledge",
  "i confirm", "i accept", "privacy policy", "terms of service",
  "eeo is the law", "background check authorization"
];
