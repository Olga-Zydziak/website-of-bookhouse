(() => {
  const DEFAULT_TAB_CONTENT = window.PUBLISHING_TAB_CONTENT || {};
  const DEFAULT_THEME_OVERRIDES = window.PUBLISHING_THEME_OVERRIDES || {};
  const THEME_STORAGE_KEY = 'publishingThemeOverrides';
  const THEME_TOKENS = [
    '--color-background',
    '--color-surface',
    '--color-surface-alt',
    '--color-accent',
    '--color-accent-muted',
    '--color-accent-rgb',
    '--color-text-primary',
    '--color-text-secondary',
    '--shadow-elevated',
    '--page-shade-direction',
    '--page-shade-strength',
    '--page-shade-soft',
    '--page-shade-panel',
    '--tabs-size-scale'
  ];

  const toFullHex = (value) => {
    if (typeof value !== 'string') {
      return '';
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    if (/^#([\da-f]{3})$/i.test(trimmed)) {
      return `#${trimmed
        .slice(1)
        .split('')
        .map((char) => char + char)
        .join('')}`.toLowerCase();
    }

    if (/^#([\da-f]{6})$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    const rgbMatch = trimmed.match(/^rgba?\((\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      const componentToHex = (component) => {
        const parsed = Math.max(0, Math.min(255, Number(component) || 0));
        return parsed.toString(16).padStart(2, '0');
      };
      return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
    }

    return '';
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const computeAccentMuted = (hex, alpha = 0.12) => {
    const normalized = toFullHex(hex);
    if (!normalized) {
      return '';
    }

    const bigint = parseInt(normalized.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const computeAccentRgb = (hex) => {
    const normalized = toFullHex(hex);
    if (!normalized) {
      return '';
    }

    const bigint = parseInt(normalized.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };

  const computeShadeSoft = (strength) => clamp(Number(strength) / 3, 0, 0.35).toFixed(2);

  const computeShadePanel = (strength) => clamp(Number(strength) * 0.6, 0, 0.45).toFixed(2);

  const loadThemeOverrides = () => {
    try {
      const storedValue = window.localStorage?.getItem(THEME_STORAGE_KEY);
      const storedOverrides = storedValue ? JSON.parse(storedValue) : {};
      return { ...DEFAULT_THEME_OVERRIDES, ...storedOverrides };
    } catch (error) {
      console.warn('Unable to load stored theme overrides.', error);
      return { ...DEFAULT_THEME_OVERRIDES };
    }
  };

  const applyThemeOverrides = (overrides = {}) => {
    const root = document.documentElement;
    const merged = { ...overrides };
    if (merged['--color-accent']) {
      if (!merged['--color-accent-muted']) {
        const accentMuted = computeAccentMuted(merged['--color-accent']);
        if (accentMuted) {
          merged['--color-accent-muted'] = accentMuted;
        }
      }
      if (!merged['--color-accent-rgb']) {
        const accentRgb = computeAccentRgb(merged['--color-accent']);
        if (accentRgb) {
          merged['--color-accent-rgb'] = accentRgb;
        }
      }
    }

    if (merged['--page-shade-strength']) {
      const numericStrength = Number(merged['--page-shade-strength']);
      if (!Number.isNaN(numericStrength)) {
        if (!merged['--page-shade-soft']) {
          merged['--page-shade-soft'] = computeShadeSoft(numericStrength);
        }
        if (!merged['--page-shade-panel']) {
          merged['--page-shade-panel'] = computeShadePanel(numericStrength);
        }
      }
    }

    THEME_TOKENS.forEach((token) => {
      const value = merged[token];
      if (value) {
        root.style.setProperty(token, value);
      } else {
        root.style.removeProperty(token);
      }
    });
  };

  const loadOverrides = () => {
    try {
      const storedValue = window.localStorage?.getItem('publishingTabContent');
      return storedValue ? JSON.parse(storedValue) : {};
    } catch (error) {
      console.warn('Unable to load stored tab content overrides.', error);
      return {};
    }
  };

  const mergeContent = (base, overrides) => {
    const merged = { ...base };
    Object.entries(overrides || {}).forEach(([key, value]) => {
      if (value == null) {
        return;
      }

      const baseValue = base[key];

      if (Array.isArray(value)) {
        merged[key] = value.slice();
        return;
      }

      if (typeof value === 'object') {
        const nextValue = { ...(typeof baseValue === 'object' && !Array.isArray(baseValue) ? baseValue : {}), ...value };

        if (Array.isArray(value.body)) {
          nextValue.body = value.body.slice();
        }

        if (value.contactDetails || baseValue?.contactDetails) {
          nextValue.contactDetails = {
            ...(baseValue?.contactDetails || {}),
            ...(value.contactDetails || {})
          };
        }

        merged[key] = nextValue;
        return;
      }

      merged[key] = value;
    });
    return merged;
  };

  applyThemeOverrides(loadThemeOverrides());

  const TAB_CONTENT = mergeContent(DEFAULT_TAB_CONTENT, loadOverrides());

  const tabButtons = document.querySelectorAll('.tabs__button');
  const tabPanel = document.getElementById('tab-panel');
  const tabPanelTitle = document.getElementById('tab-panel-title');
  const tabPanelBody = document.getElementById('tab-panel-body');

  const createParagraph = (text) => {
    const paragraphElement = document.createElement('p');
    paragraphElement.className = 'panels__text';
    paragraphElement.textContent = text;
    return paragraphElement;
  };

  const createList = (items) => {
    const listElement = document.createElement('ul');
    listElement.className = 'panels__list';
    items.forEach((itemText) => {
      const listItem = document.createElement('li');
      listItem.className = 'panels__list-item';
      listItem.textContent = itemText;
      listElement.appendChild(listItem);
    });
    return listElement;
  };

  const scriptCache = new Map();

  const loadExternalScript = (url) => {
    if (!url) {
      return Promise.reject(new Error('Script URL missing.'));
    }

    if (scriptCache.has(url)) {
      return scriptCache.get(url);
    }

    const existing = document.querySelector(`script[src="${url}"]`);

    if (existing) {
      if (existing.dataset.loaded === 'true' || existing.readyState === 'complete') {
        const resolved = Promise.resolve();
        scriptCache.set(url, resolved);
        return resolved;
      }

      const promise = new Promise((resolve, reject) => {
        existing.addEventListener('load', () => {
          existing.dataset.loaded = 'true';
          resolve();
        });
        existing.addEventListener('error', () => {
          scriptCache.delete(url);
          reject(new Error(`Failed to load script: ${url}`));
        });
      });

      scriptCache.set(url, promise);
      return promise;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.charset = 'utf-8';
    script.dataset.cfasync = 'false';

    const promise = new Promise((resolve, reject) => {
      script.addEventListener('load', () => {
        script.dataset.loaded = 'true';
        resolve();
      });

      script.addEventListener('error', () => {
        scriptCache.delete(url);
        reject(new Error(`Failed to load script: ${url}`));
      });
    });

    document.head.appendChild(script);
    scriptCache.set(url, promise);
    return promise;
  };

  const initialiseSellastic = (args, attempt = 0) => {
    if (typeof window.xProductBrowser === 'function') {
      window.xProductBrowser(...args);
      return Promise.resolve();
    }

    if (attempt > 6) {
      return Promise.reject(new Error('Sellastic initializer unavailable.'));
    }

    return new Promise((resolve, reject) => {
      window.setTimeout(() => {
        initialiseSellastic(args, attempt + 1).then(resolve).catch(reject);
      }, 200 * (attempt + 1));
    });
  };

  const createSellasticStore = (config = {}) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'panels__store';

    const containerId = config.containerId || `sellastic-store-${Math.random().toString(36).slice(2, 7)}`;
    const storeFrame = document.createElement('div');
    storeFrame.id = containerId;
    storeFrame.className = 'panels__store-frame';
    wrapper.appendChild(storeFrame);

    const status = document.createElement('p');
    status.className = 'panels__store-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = config.loadingMessage || 'Loading bookstore…';
    wrapper.appendChild(status);

    const args = Array.isArray(config.arguments) ? config.arguments.slice() : [];
    if (!args.some((argument) => typeof argument === 'string' && argument.trim().startsWith('id='))) {
      args.push(`id=${containerId}`);
    }

    const showError = (message) => {
      status.hidden = false;
      status.textContent = message || config.errorMessage || 'Unable to load the bookstore. Please try again later.';
    };

    loadExternalScript(config.scriptUrl)
      .then(() => initialiseSellastic(args))
      .then(() => {
        status.hidden = true;
      })
      .catch(() => {
        showError(config.errorMessage);
      });

    return wrapper;
  };

  const setStatusMessage = (statusElement, state, message) => {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message;
    statusElement.classList.remove('panels__form-status--success', 'panels__form-status--error');
    if (state === 'success') {
      statusElement.classList.add('panels__form-status--success');
    }
    if (state === 'error') {
      statusElement.classList.add('panels__form-status--error');
    }
  };

  const parseFormSubmitResponse = async (response) => {
    const resultText = await response.text();
    let parsedResult = null;

    if (resultText) {
      try {
        parsedResult = JSON.parse(resultText);
      } catch (error) {
        parsedResult = null;
      }
    }

    if (!response.ok) {
      const errorMessage = parsedResult?.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = parsedResult;
      throw error;
    }

    if (parsedResult && String(parsedResult.success).toLowerCase() === 'false') {
      const error = new Error(parsedResult.message || 'The form service rejected the submission.');
      error.status = response.status;
      error.details = parsedResult;
      throw error;
    }

    return {
      message: parsedResult?.message || ''
    };
  };

  const submitViaVanillaTransport = (endpoint, payload = {}, details = {}) =>
    new Promise((resolve) => {
      if (!endpoint) {
        resolve(false);
        return;
      }

      const frame = document.createElement('iframe');
      const frameName = `contact-transport-${Date.now()}`;
      frame.name = frameName;
      frame.hidden = true;
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'absolute';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';

      const form = document.createElement('form');
      form.method = 'post';
      form.action = endpoint;
      form.target = frameName;
      form.acceptCharset = 'utf-8';
      form.style.position = 'absolute';
      form.style.left = '-9999px';
      form.style.top = 'auto';
      form.style.width = '1px';
      form.style.height = '1px';

      const appendField = (name, value) => {
        if (value === undefined || value === null || `${value}`.trim() === '') {
          return;
        }
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = `${value}`;
        form.appendChild(input);
      };

      Object.entries(payload).forEach(([key, value]) => {
        appendField(key, value);
      });

      if (!('_next' in payload)) {
        appendField('_next', details.nextUrl || window.location.href);
      }

      const attachments = Array.isArray(details.attachments)
        ? details.attachments.filter((file) => file instanceof File)
        : [];

      if (attachments.length) {
        if (typeof DataTransfer === 'undefined') {
          console.warn('Attachments fallback transport is not supported in this browser.');
        } else {
          const attachmentInput = document.createElement('input');
          attachmentInput.type = 'file';
          attachmentInput.name = attachments.length === 1 ? 'attachment' : 'attachments[]';
          attachmentInput.multiple = attachments.length > 1;
          attachmentInput.style.position = 'absolute';
          attachmentInput.style.left = '-9999px';
          attachmentInput.style.width = '1px';
          attachmentInput.style.height = '1px';
          attachmentInput.setAttribute('aria-hidden', 'true');

          const dataTransfer = new DataTransfer();
          attachments.forEach((file) => {
            try {
              dataTransfer.items.add(file);
            } catch (error) {
              console.warn('Unable to append attachment to fallback transport.', error);
            }
          });

          if (dataTransfer.files.length) {
            attachmentInput.files = dataTransfer.files;
            form.appendChild(attachmentInput);

            if (attachments.length === 1) {
              const supplementalInput = document.createElement('input');
              supplementalInput.type = 'file';
              supplementalInput.name = 'attachments[]';
              supplementalInput.style.position = 'absolute';
              supplementalInput.style.left = '-9999px';
              supplementalInput.style.width = '1px';
              supplementalInput.style.height = '1px';
              supplementalInput.setAttribute('aria-hidden', 'true');

              const supplementalTransfer = new DataTransfer();
              try {
                supplementalTransfer.items.add(attachments[0]);
                supplementalInput.files = supplementalTransfer.files;
                form.appendChild(supplementalInput);
              } catch (error) {
                console.warn('Unable to append supplemental attachment input.', error);
              }
            }
          }
        }
      }

      if (details.subject) {
        appendField('_subject', details.subject);
      }

      document.body.append(frame, form);

      const cleanup = () => {
        form.remove();
        frame.remove();
      };

      const timeoutId = window.setTimeout(() => {
        cleanup();
        resolve(false);
      }, 8000);

      frame.addEventListener(
        'load',
        () => {
          window.clearTimeout(timeoutId);
          cleanup();
          resolve(true);
        },
        { once: true }
      );

      try {
        form.submit();
      } catch (submissionError) {
        window.clearTimeout(timeoutId);
        cleanup();
        resolve(false);
      }
    });

  const sendUrlEncodedPayload = async (endpoint, payload) => {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      referrerPolicy: 'no-referrer',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json'
      },
      body: params.toString()
    });

    return parseFormSubmitResponse(response);
  };

  const sendJsonPayload = async (endpoint, payload) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      referrerPolicy: 'no-referrer',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return parseFormSubmitResponse(response);
  };

  const sendFormDataPayload = async (endpoint, payload, attachments = []) => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value);
      }
    });

    attachments.forEach((file, index) => {
      if (!(file instanceof File)) {
        return;
      }
      const fieldName = attachments.length === 1 && index === 0 ? 'attachment' : 'attachments[]';
      formData.append(fieldName, file, file.name);
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      referrerPolicy: 'no-referrer',
      headers: {
        Accept: 'application/json'
      },
      body: formData
    });

    return parseFormSubmitResponse(response);
  };

  const buildEndpoint = (details = {}) => {
    const emailTarget = details.formRecipient || details.emailAddress;

    if (details.formEndpoint) {
      if (!emailTarget) {
        return details.formEndpoint;
      }
      const expectedSegment = encodeURIComponent(emailTarget);
      if (details.formEndpoint.includes(expectedSegment)) {
        return details.formEndpoint;
      }
    }

    if (!emailTarget) {
      return '';
    }

    return `https://formsubmit.co/ajax/${encodeURIComponent(emailTarget)}`;
  };

  const normaliseFallbackEndpoint = (endpoint) => {
    if (!endpoint) {
      return '';
    }

    if (endpoint.includes('/ajax/')) {
      return endpoint.replace('/ajax/', '/');
    }

    return endpoint;
  };

  const normaliseContactDetails = (details = {}) => {
    const emailAddress = (details.emailAddress || details.formRecipient || '').trim();
    const phoneNumber = details.phoneNumber?.trim() || '';
    const submittingMessage = details.submittingMessage || 'Sending your message…';
    const successMessage = details.successMessage || 'Thank you! We will be in touch shortly.';
    const errorMessage = details.errorMessage || 'Sorry, something went wrong. Please try again later.';
    const subject = details.subject || 'New inquiry from the Publishing Portfolio contact form';

    if (!emailAddress && !phoneNumber) {
      return null;
    }

    return {
      phoneLabel: details.phoneLabel || 'Telefon',
      phoneNumber,
      emailLabel: details.emailLabel || 'E-mail',
      emailAddress,
      formRecipient: emailAddress,
      formEndpoint: buildEndpoint({ ...details, emailAddress }),
      submittingMessage,
      successMessage,
      errorMessage,
      subject
    };
  };

  const buildContactSection = (details = {}) => {
    const contactWrapper = document.createElement('div');
    contactWrapper.className = 'panels__contact';

    const contactList = document.createElement('dl');
    contactList.className = 'panels__contact-list';

    if (details.phoneLabel && details.phoneNumber) {
      const phoneTerm = document.createElement('dt');
      phoneTerm.className = 'panels__contact-term';
      phoneTerm.textContent = details.phoneLabel;

      const phoneDefinition = document.createElement('dd');
      phoneDefinition.className = 'panels__contact-definition';
      const phoneLink = document.createElement('a');
      phoneLink.className = 'panels__contact-link';
      const sanitizedNumber = details.phoneNumber.replace(/[^+\d]/g, '');
      phoneLink.href = sanitizedNumber ? `tel:${sanitizedNumber}` : '#';
      phoneLink.textContent = details.phoneNumber;
      phoneDefinition.appendChild(phoneLink);

      contactList.appendChild(phoneTerm);
      contactList.appendChild(phoneDefinition);
    }

    if (details.emailLabel && details.emailAddress) {
      const emailTerm = document.createElement('dt');
      emailTerm.className = 'panels__contact-term';
      emailTerm.textContent = details.emailLabel;

      const emailDefinition = document.createElement('dd');
      emailDefinition.className = 'panels__contact-definition';
      const emailLink = document.createElement('a');
      emailLink.className = 'panels__contact-link';
      emailLink.href = `mailto:${details.emailAddress}`;
      emailLink.textContent = details.emailAddress;
      emailDefinition.appendChild(emailLink);

      contactList.appendChild(emailTerm);
      contactList.appendChild(emailDefinition);
    }

    if (contactList.childElementCount) {
      contactWrapper.appendChild(contactList);
    }

    const contactForm = document.createElement('form');
    contactForm.className = 'panels__form';
    contactForm.noValidate = true;
    contactForm.method = 'post';
    contactForm.enctype = 'multipart/form-data';
    contactForm.action = details.formEndpoint || '';

    const formIdSuffix = Math.random().toString(36).slice(2, 7);
    const nameFieldId = `contact-name-${formIdSuffix}`;
    const emailFieldId = `contact-email-${formIdSuffix}`;
    const messageFieldId = `contact-message-${formIdSuffix}`;
    const attachmentFieldId = `contact-attachment-${formIdSuffix}`;
    const statusFieldId = `contact-status-${formIdSuffix}`;

    const fieldsWrapper = document.createElement('div');
    fieldsWrapper.className = 'panels__form-fields';

    const createInputField = ({ id, name, label, type, placeholder, required, attributes = {} }) => {
      const field = document.createElement('div');
      field.className = 'panels__form-field';

      const fieldLabel = document.createElement('label');
      fieldLabel.className = 'panels__form-label';
      fieldLabel.setAttribute('for', id);
      fieldLabel.textContent = label;

      const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      input.className = type === 'textarea' ? 'panels__form-textarea' : 'panels__form-input';
      input.id = id;
      input.name = name || id;
      input.placeholder = placeholder;
      if (required) {
        input.required = true;
      }
      if (type && type !== 'textarea') {
        input.type = type;
      }
      if (type === 'textarea') {
        input.rows = 5;
      }

      Object.entries(attributes).forEach(([attributeName, attributeValue]) => {
        if (attributeValue === false || attributeValue == null) {
          return;
        }

        if (attributeValue === true) {
          input.setAttribute(attributeName, '');
          return;
        }

        input.setAttribute(attributeName, attributeValue);
      });

      field.appendChild(fieldLabel);
      field.appendChild(input);
      return { field, input };
    };

    const nameField = createInputField({
      id: nameFieldId,
      name: 'name',
      label: 'Your name',
      type: 'text',
      placeholder: 'Jane Doe',
      required: true
    });
    const emailField = createInputField({
      id: emailFieldId,
      name: 'email',
      label: 'Your email',
      type: 'email',
      placeholder: 'you@example.com',
      required: true
    });
    const messageField = createInputField({
      id: messageFieldId,
      name: 'message',
      label: 'Message',
      type: 'textarea',
      placeholder: 'Tell us more about your project…',
      required: true
    });
    messageField.field.classList.add('panels__form-field--wide');

    const attachmentsField = createInputField({
      id: attachmentFieldId,
      name: 'attachments[]',
      label: 'Attachments (optional)',
      type: 'file',
      placeholder: '',
      required: false,
      attributes: { multiple: true, 'aria-describedby': `${attachmentFieldId}-help` }
    });
    attachmentsField.field.classList.add('panels__form-field--wide');

    const attachmentHelp = document.createElement('p');
    attachmentHelp.className = 'panels__form-help';
    attachmentHelp.id = `${attachmentFieldId}-help`;
    attachmentHelp.textContent = 'You can add up to 5 files (max 10 MB each).';
    attachmentsField.field.appendChild(attachmentHelp);

    fieldsWrapper.append(
      nameField.field,
      emailField.field,
      messageField.field,
      attachmentsField.field
    );

    const actionsWrapper = document.createElement('div');
    actionsWrapper.className = 'panels__form-actions';

    const submitButton = document.createElement('button');
    submitButton.className = 'panels__form-button';
    submitButton.type = 'submit';
    submitButton.textContent = 'Send message';
    actionsWrapper.appendChild(submitButton);

    const statusMessage = document.createElement('p');
    statusMessage.className = 'panels__form-status';
    statusMessage.id = statusFieldId;
    statusMessage.setAttribute('role', 'status');
    statusMessage.setAttribute('aria-live', 'polite');

    contactForm.append(fieldsWrapper, actionsWrapper, statusMessage);

    const getPayload = () => ({
      name: nameField.input.value.trim(),
      email: emailField.input.value.trim(),
      message: messageField.input.value.trim(),
      recipient: details.formRecipient || details.emailAddress || '',
      attachments: Array.from(attachmentsField.input.files || [])
    });

    const validatePayload = (payload) => {
      if (!payload.name || !payload.email || !payload.message) {
        return { valid: false, message: 'Please provide a valid name, email address, and message.' };
      }
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(payload.email)) {
        return { valid: false, message: 'Please provide a valid name, email address, and message.' };
      }

      if (payload.attachments?.length) {
        const MAX_FILES = 5;
        const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
        const MAX_TOTAL_SIZE_BYTES = 25 * 1024 * 1024;

        if (payload.attachments.length > MAX_FILES) {
          return {
            valid: false,
            message: `Please upload no more than ${MAX_FILES} files.`
          };
        }

        let totalSize = 0;
        for (const file of payload.attachments) {
          totalSize += file.size;
          if (file.size > MAX_FILE_SIZE_BYTES) {
            return {
              valid: false,
              message: `Each file must be 10 MB or smaller. Remove "${file.name}" and try again.`
            };
          }
        }

        if (totalSize > MAX_TOTAL_SIZE_BYTES) {
          return {
            valid: false,
            message: 'The combined size of your attachments must be 25 MB or less.'
          };
        }
      }

      return { valid: true };
    };

    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = getPayload();

      const validation = validatePayload(payload);
      if (!validation.valid) {
        setStatusMessage(statusMessage, 'error', validation.message);
        return;
      }

      const endpoint = buildEndpoint(details);
      setStatusMessage(statusMessage, null, details.submittingMessage || 'Sending your message…');
      submitButton.disabled = true;

      try {
        if (!endpoint) {
          throw new Error('No delivery endpoint configured.');
        }

        const requestPayload = {
          name: payload.name,
          email: payload.email,
          message: payload.message,
          _replyto: payload.email,
          _template: 'table',
          _captcha: 'false'
        };

        if (payload.recipient) {
          requestPayload._to = payload.recipient;
        }

        if (details.subject) {
          requestPayload._subject = details.subject;
        }

        let result = null;
        let fallbackUsed = false;
        let lastError = null;

        const attachments = payload.attachments || [];
        const hasAttachments = attachments.length > 0;

        const submissionAttempts = [
          ...(hasAttachments
            ? []
            : [
                async () => sendUrlEncodedPayload(endpoint, requestPayload),
                async () => sendJsonPayload(endpoint, requestPayload)
              ]),
          async () => sendFormDataPayload(endpoint, requestPayload, attachments)
        ];

        for (const attempt of submissionAttempts) {
          try {
            result = await attempt();
            lastError = null;
            break;
          } catch (attemptError) {
            lastError = attemptError;
          }
        }

        if (!result) {
          console.warn('FormSubmit direct submission failed, falling back to iframe transport.', lastError);
          const fallbackEndpoint = normaliseFallbackEndpoint(endpoint);
          const fallbackResult = await submitViaVanillaTransport(
            fallbackEndpoint,
            requestPayload,
            {
              subject: details.subject,
              nextUrl: window.location.href,
              attachments
            }
          );
          if (!fallbackResult) {
            throw lastError || new Error('Unable to deliver the form payload.');
          }
          fallbackUsed = true;
        }

        contactForm.reset();
        if (fallbackUsed) {
          const successCopy =
            details.successMessage || 'Thank you! We will be in touch shortly.';
          setStatusMessage(
            statusMessage,
            'success',
            `${successCopy} Jeśli to Twoja pierwsza wiadomość, sprawdź skrzynkę e-mail w celu potwierdzenia formularza.`
          );
        } else {
          setStatusMessage(
            statusMessage,
            'success',
            result?.message || details.successMessage || 'Thank you! We will be in touch shortly.'
          );
        }
      } catch (error) {
        console.error('Contact form submission failed.', error);
        let additionalInfo = '';
        if (error?.message) {
          if (!/request failed/i.test(error.message) || /verify/i.test(error.message)) {
            additionalInfo = ` ${error.message}`;
          }
        }
        if (!additionalInfo) {
          additionalInfo =
            ' If this is your first submission, check your inbox for a verification email from the form provider.';
        }
        setStatusMessage(
          statusMessage,
          'error',
          `${details.errorMessage || 'Sorry, something went wrong. Please try again later.'}${additionalInfo}`
        );
      } finally {
        submitButton.disabled = false;
      }
    });

    contactWrapper.appendChild(contactForm);
    return contactWrapper;
  };

  const renderTabContent = (tabKey, trigger, { focusPanel = true } = {}) => {
    const content = TAB_CONTENT[tabKey];
    if (!content) {
      return;
    }

    tabPanelTitle.textContent = content.title;
    tabPanelBody.innerHTML = '';

    content.body?.forEach((entry) => {
      if (typeof entry === 'string') {
        tabPanelBody.appendChild(createParagraph(entry));
        return;
      }

      if (entry?.type === 'list' && Array.isArray(entry.items)) {
        tabPanelBody.appendChild(createList(entry.items));
      }
    });

    if (content.store?.type === 'sellastic') {
      tabPanelBody.appendChild(createSellasticStore(content.store));
    }

    if (content.contactDetails) {
      const contactDetails = normaliseContactDetails(content.contactDetails);
      if (contactDetails) {
        content.contactDetails = contactDetails;
        tabPanelBody.appendChild(buildContactSection(contactDetails));
      }
    }

    tabPanel.setAttribute('aria-labelledby', trigger.id);
    if (focusPanel) {
      tabPanel.focus({ preventScroll: true });
    }
  };

  tabButtons.forEach((button) => {
    const content = TAB_CONTENT[button.dataset.tab];
    if (content?.tabLabel || content?.title) {
      button.textContent = content.tabLabel || content.title;
    }

    button.addEventListener('click', () => {
      if (button.getAttribute('aria-selected') === 'true') {
        return;
      }

      tabButtons.forEach((btn) => {
        btn.classList.remove('tabs__button--active');
        btn.setAttribute('aria-selected', 'false');
      });

      button.classList.add('tabs__button--active');
      button.setAttribute('aria-selected', 'true');

      renderTabContent(button.dataset.tab, button);
    });
  });

  const activeTab = document.querySelector('.tabs__button[aria-selected="true"]') || tabButtons[0];
  if (activeTab) {
    renderTabContent(activeTab.dataset.tab, activeTab, { focusPanel: false });
  }

  const yearTarget = document.getElementById('current-year');
  if (yearTarget) {
    yearTarget.textContent = new Date().getFullYear();
  }
})();
