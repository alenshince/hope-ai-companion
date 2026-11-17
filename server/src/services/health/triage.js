/**
 * Health & Red-Flag Triage Engine
 * Intercepts medical emergencies, self-harm, and life-threatening symptoms.
 * Delivers immediate compassionate crisis response with national emergency hotlines.
 * Strictly upholds non-doctor boundaries: NO diagnosis, NO prescription, NO dose alteration.
 */

// Country-specific emergency contacts
export const EMERGENCY_NUMBERS = {
  IN: {
    country: 'India',
    emergency: '112',
    ambulance: '108',
    mentalHealth: '14416 (Tele-MANAS) or 1800-891-4416',
    kiranHelpline: '1800-599-0019',
    healthPortal: '1075'
  },
  US: {
    country: 'United States',
    emergency: '911',
    ambulance: '911',
    mentalHealth: '988 (Suicide & Crisis Lifeline)',
    kiranHelpline: null,
    healthPortal: null
  },
  UK: {
    country: 'United Kingdom',
    emergency: '999',
    ambulance: '999',
    mentalHealth: '111 (NHS Mental Health Services)',
    kiranHelpline: null,
    healthPortal: '111'
  },
  DEFAULT: {
    country: 'International',
    emergency: '112 (Europe/India) or 911 (US)',
    ambulance: 'Local emergency services',
    mentalHealth: '14416 (India Tele-MANAS) or 988 (US) or local crisis helpline',
    kiranHelpline: null,
    healthPortal: null
  }
};

// Patterns signaling acute medical emergencies
const MEDICAL_RED_FLAGS = [
  {
    type: 'cardiac',
    regex: /\b(chest pain|crushing pain in chest|pain radiating to (left arm|jaw)|heart attack|sudden chest tightness)\b/i,
    severity: 'critical',
    advice: 'Sudden or crushing chest pain can indicate a cardiovascular emergency (such as a heart attack).'
  },
  {
    type: 'stroke',
    regex: /\b(face drooping|slurred speech|arm weakness|cannot speak properly|sudden numbness on one side|FAST signs|stroke)\b/i,
    severity: 'critical',
    advice: 'Face drooping, arm weakness, and difficulty speaking are classic warning signs of a stroke requiring immediate emergency intervention.'
  },
  {
    type: 'respiratory',
    regex: /\b(cannot breathe|severe shortness of breath|gasping for air|turning blue|severe asthma attack|choking)\b/i,
    severity: 'critical',
    advice: 'Acute difficulty breathing is a medical emergency that requires immediate oxygenation and clinical care.'
  },
  {
    type: 'bleeding',
    regex: /\b(severe bleeding|uncontrolled bleeding|gushing blood|deep laceration that won't stop bleeding)\b/i,
    severity: 'critical',
    advice: 'Uncontrolled bleeding requires immediate pressure and urgent emergency treatment.'
  },
  {
    type: 'anaphylaxis',
    regex: /\b(throat swelling|anaphylaxis|swollen lips and tongue|cannot swallow and hives|allergic reaction cannot breathe)\b/i,
    severity: 'critical',
    advice: 'Severe allergic reactions with airway constriction (anaphylaxis) require immediate emergency epinephrine/hospital care.'
  }
];

// Patterns signaling mental health crises / self-harm
const MENTAL_HEALTH_CRISIS = [
  /\b(kill myself|want to die|end my life|commit suicide|suicidal thoughts|don't want to live anymore|slit my wrist|take all pills|hurt myself)\b/i,
  /(ജീവനൊടുക്കാൻ|മരിക്കാൻ തോന്നുന്നു|ആത്മഹത്യ|മരിക്കണം)/ // Malayalam crisis expressions (no ASCII \b)
];

/**
 * Evaluates whether text triggers red-flag triage
 * @param {string} text
 * @param {string} [country='IN']
 * @returns {{ isRedFlag: boolean, type: string|null, response: string|null, numbers: object }}
 */
export function evaluateRedFlagTriage(text, country = 'IN') {
  if (!text || typeof text !== 'string') {
    return { isRedFlag: false, type: null, response: null, numbers: EMERGENCY_NUMBERS.IN };
  }

  const clean = text.trim();
  const contacts = EMERGENCY_NUMBERS[country.toUpperCase()] || EMERGENCY_NUMBERS.IN;

  // 1. Check Mental Health & Self-Harm Red Flags
  const isSelfHarm = MENTAL_HEALTH_CRISIS.some(pattern => pattern.test(clean));
  if (isSelfHarm) {
    const isMalayalam = /[\u0D00-\u0D7F]/.test(clean);

    let message;
    if (isMalayalam) {
      message = `സാരമില്ല കേട്ടോ, ഞാൻ പറയുന്നത് ശ്രദ്ധിച്ചു കേൾക്കൂ. നിങ്ങൾ ഒറ്റയ്ക്കല്ല, നിങ്ങളുടെ ജീവിതം വളരെ വിലപ്പെട്ടതാണ്.
ഇത്തരം വിഷമഘട്ടങ്ങളിൽ നിങ്ങളെ കേൾക്കാനും സഹായിക്കാനും വിദഗ്ദ്ധരായ ആളുകൾ സദാ സന്നദ്ധരായി ഒപ്പമുണ്ട്.

ദയവായി ഇപ്പോൾ തന്നെ ഈ നമ്പറിലേക്ക് വിളിക്കൂ:
- **Tele-MANAS (24x7 സൗജന്യ മാനസികാരോഗ്യ ഹെൽപ്പ്‌ലൈൻ)**: **14416** അല്ലെങ്കിൽ **1800-891-4416**
- **ദേശീയ അടിയന്തര സഹായ നമ്പർ**: **112**
- **KIRAN Helpline**: **1800-599-0019**

ദയവായി നിങ്ങളുടെ അടുത്തുള്ള കുടുംബാംഗങ്ങളോടോ സുഹൃത്തുക്കളോടോ ഈ കാര്യം സംസാരിക്കൂ. എനിക്ക് നിങ്ങളെ നഷ്ടപ്പെടാൻ ആഗ്രഹമില്ല, നിങ്ങൾക്കൊപ്പം നിൽക്കാൻ ആളുകളുണ്ട്.`;
    } else {
      message = `Please stay with me for a moment. You are not alone, and your life is deeply important.
What you are experiencing right now is overwhelming, but there is genuine, compassionate support available 24/7 with professionals who care and want to help you through this.

Please reach out immediately to these free, confidential crisis resources:
- **Tele-MANAS (India Mental Health Helpline - 24/7 Free)**: **14416** or **1800-891-4416**
- **National Emergency Helpline**: **${contacts.emergency}**
- **KIRAN Mental Health Line**: **1800-599-0019**

Please connect right now with a loved one, a close friend, or a professional who can be by your side. Help is ready for you.`;
    }

    return {
      isRedFlag: true,
      type: 'mental_health_crisis',
      severity: 'emergency',
      response: message,
      numbers: contacts
    };
  }

  // 2. Check Acute Medical Emergencies
  for (const flag of MEDICAL_RED_FLAGS) {
    if (flag.regex.test(clean)) {
      const isMalayalam = /[\u0D00-\u0D7F]/.test(clean);

      let message;
      if (isMalayalam) {
        message = `⚠️ **അടിയന്തര ശ്രദ്ധ ആവശ്യമുള്ള ലക്ഷണങ്ങൾ:**
${flag.advice}

ഞാൻ ഒരു AI ആണ്, ഒരു ഡോക്ടറല്ല. ഇത്തരം ലക്ഷണങ്ങൾ കണ്ടാൽ ഒട്ടും സമയം കളയാതെ ഉടനടി വൈദ്യസഹായം തേടേണ്ടതുണ്ട്:
- **അടിയന്തര ആംബുലൻസ് സർവീസ്**: **108** അല്ലെങ്കിൽ **112**
- **അടിയന്തര ഹെൽപ്പ്‌ലൈൻ**: **112**

ദയവായി ഉടൻ തന്നെ അടുത്തുള്ള ആശുപത്രിയിലെ എമർജൻസി വിഭാഗത്തിലേക്ക് പോകുകയോ ഡോക്ടറെ ബന്ധപ്പെടുകയോ ചെയ്യുക.`;
      } else {
        message = `⚠️ **Urgent Medical Alert:**
${flag.advice}

Hope is an AI companion, **not a doctor**. These symptoms require immediate professional clinical evaluation:
- **Emergency Ambulance Service**: **${contacts.ambulance}**
- **National Emergency Helpline**: **${contacts.emergency}**

Please immediately go to the nearest emergency room or dial emergency services. Do not wait or self-treat.`;
      }

      return {
        isRedFlag: true,
        type: flag.type,
        severity: 'emergency',
        response: message,
        numbers: contacts
      };
    }
  }

  return {
    isRedFlag: false,
    type: null,
    response: null,
    numbers: contacts
  };
}
