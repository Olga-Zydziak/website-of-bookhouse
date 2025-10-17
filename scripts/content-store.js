const TAB_DEFAULT_CONTENT = {
  publishing: {
    title: 'Publishing House',
    paragraphs: [
      'Celebrate your publishing heritage with a concise mission statement that speaks to your editorial vision and the authors you champion.',
      'Share recent milestones such as award-winning releases, international rights deals, or community initiatives that distinguish your house.'
    ],
    bullets: [
      "Core genres: literary fiction, narrative nonfiction, children's literature",
      'Flagship imprints focused on debut voices and translated works',
      'Collaborations with cultural institutions and festival partners'
    ]
  },
  authors: {
    title: 'For Authors',
    paragraphs: [
      'Outline how prospective authors can submit manuscripts, including response timelines and what to expect after hitting send.',
      'Explain the editorial partnership — from developmental edits to cover design — that helps storytellers feel supported at every step.'
    ],
    bullets: [
      'Downloadable submission checklist',
      'Monthly virtual pitch sessions hosted by senior editors',
      'Author mentorship program pairing debut writers with alumni'
    ]
  },
  selfPublishing: {
    title: 'Self-publishing',
    paragraphs: [
      'Empower independent creators with transparent packages that combine print-on-demand, distribution, and marketing coaching.',
      'Clarify which services are à la carte so authors can tailor support to their publishing goals and budget.'
    ],
    bullets: [
      'Production suite: editing, layout, ISBN registration',
      'Distribution reach: global eBook platforms and boutique bookstores',
      'Launch toolkit: press release templates and social media calendars'
    ]
  },
  bookstore: {
    title: 'Bookstore',
    paragraphs: [
      'Spotlight your curated collections with seasonal displays, staff picks, and themed bundles designed to delight avid readers.',
      'Promote events hosted in-store or online — from author signings to book club roundtables — that build community around the written word.'
    ],
    bullets: [
      'Signature collections refreshed monthly',
      'Exclusive signed editions for loyalty members',
      'Personalized recommendations via concierge service'
    ]
  },
  contact: {
    title: 'Contact',
    paragraphs: [
      'Provide tailored contact pathways for media, rights inquiries, partnership proposals, and aspiring authors.'
    ],
    bullets: [],
    form: {
      id: 'contact-form',
      successMessage: 'Your message has been queued. We will be in touch shortly.',
      submitText: 'Send message',
      fields: [
        {
          label: 'Full name',
          name: 'name',
          type: 'text',
          autocomplete: 'name',
          required: true
        },
        {
          label: 'Email address',
          name: 'email',
          type: 'email',
          autocomplete: 'email',
          required: true
        },
        {
          label: 'Topic',
          name: 'topic',
          type: 'select',
          options: [
            { value: 'general', label: 'General inquiry' },
            { value: 'media', label: 'Media & publicity' },
            { value: 'authors', label: 'Author relations' }
          ],
          required: true
        },
        {
          label: 'Message',
          name: 'message',
          type: 'textarea',
          required: true,
          rows: 6
        }
      ]
    }
  }
};

const DEFAULT_GRADIENT = {
  direction: 'top',
  start: '#5a8dee',
  end: '#0f1117'
};

const STORAGE_PREFIX = 'publishingSite:';
export const STORAGE_KEYS = Object.freeze({
  tabContent: `${STORAGE_PREFIX}tabs:v1`,
  gradient: `${STORAGE_PREFIX}gradient:v1`
});

const deepClone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const sanitiseArrayOfStrings = (candidate) => {
  if (!Array.isArray(candidate)) {
    return [];
  }
  return candidate
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
};

const mergeTabEntry = (defaultEntry, overrideEntry) => {
  const result = { ...deepClone(defaultEntry) };

  if (!overrideEntry || typeof overrideEntry !== 'object') {
    return result;
  }

  if (typeof overrideEntry.title === 'string' && overrideEntry.title.trim().length > 0) {
    result.title = overrideEntry.title.trim();
  }

  if ('paragraphs' in overrideEntry) {
    const paragraphs = sanitiseArrayOfStrings(overrideEntry.paragraphs);
    if (paragraphs.length > 0) {
      result.paragraphs = paragraphs;
    }
  }

  if ('bullets' in overrideEntry) {
    result.bullets = sanitiseArrayOfStrings(overrideEntry.bullets);
  }

  if (defaultEntry.form) {
    result.form = deepClone(defaultEntry.form);
  }

  return result;
};

const safeReadStorage = (key) => {
  try {
    if (!('localStorage' in window)) {
      return null;
    }
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const safeWriteStorage = (key, value) => {
  try {
    if (!('localStorage' in window)) {
      return false;
    }
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
};

const parseStoredJson = (value) => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

export const loadTabContentState = () => {
  const baseState = deepClone(TAB_DEFAULT_CONTENT);
  const storedValue = parseStoredJson(safeReadStorage(STORAGE_KEYS.tabContent));

  if (!storedValue || typeof storedValue !== 'object') {
    return baseState;
  }

  Object.keys(baseState).forEach((tabKey) => {
    if (tabKey in storedValue) {
      baseState[tabKey] = mergeTabEntry(baseState[tabKey], storedValue[tabKey]);
    }
  });

  return baseState;
};

export const saveTabContentState = (state) => {
  if (!state || typeof state !== 'object') {
    return false;
  }

  const payload = {};
  Object.keys(TAB_DEFAULT_CONTENT).forEach((tabKey) => {
    const defaultEntry = TAB_DEFAULT_CONTENT[tabKey];
    const candidate = state[tabKey];
    const merged = mergeTabEntry(defaultEntry, candidate);
    payload[tabKey] = {
      title: merged.title,
      paragraphs: merged.paragraphs,
      bullets: merged.bullets
    };
  });

  return safeWriteStorage(STORAGE_KEYS.tabContent, JSON.stringify(payload));
};

const normaliseHex = (value, fallback) => {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
  return hexPattern.test(trimmed) ? trimmed : fallback;
};

const normaliseDirection = (value) => (value === 'bottom' ? 'bottom' : 'top');

export const loadGradientSettings = () => {
  const storedValue = parseStoredJson(safeReadStorage(STORAGE_KEYS.gradient));
  const defaults = { ...DEFAULT_GRADIENT };

  if (!storedValue || typeof storedValue !== 'object') {
    return defaults;
  }

  return {
    direction: normaliseDirection(storedValue.direction),
    start: normaliseHex(storedValue.start, defaults.start),
    end: normaliseHex(storedValue.end, defaults.end)
  };
};

export const saveGradientSettings = (settings) => {
  if (!settings || typeof settings !== 'object') {
    return false;
  }

  const payload = {
    direction: normaliseDirection(settings.direction),
    start: normaliseHex(settings.start, DEFAULT_GRADIENT.start),
    end: normaliseHex(settings.end, DEFAULT_GRADIENT.end)
  };

  return safeWriteStorage(STORAGE_KEYS.gradient, JSON.stringify(payload));
};

export const getTabKeys = () => Object.keys(TAB_DEFAULT_CONTENT);

export const getDefaultTabContent = () => deepClone(TAB_DEFAULT_CONTENT);
