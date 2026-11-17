/**
 * Safe Mathematical Calculator Tool
 * Evaluates mathematical expressions using a secure tokenizer and recursive-descent parser.
 * Does NOT use eval() or Function constructor.
 */

export function calculate(expression) {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Expression must be a non-empty string');
  }

  // Sanitize and replace constants
  const clean = expression
    .toLowerCase()
    .replace(/\bpi\b/g, String(Math.PI))
    .replace(/\be\b/g, String(Math.E))
    .replace(/\s+/g, '');

  // Only allow valid mathematical characters: numbers, operators, parentheses, commas, function names
  if (!/^[0-9+\-*/%^().,a-z]+$/.test(clean)) {
    throw new Error('Invalid characters in mathematical expression');
  }

  let index = 0;

  function peek() {
    return clean[index];
  }

  function get() {
    return clean[index++];
  }

  function parseNumber() {
    let str = '';
    while (index < clean.length && (/[0-9.]/.test(peek()))) {
      str += get();
    }
    const val = Number(str);
    if (isNaN(val)) {
      throw new Error(`Invalid number format near position ${index}`);
    }
    return val;
  }

  function parsePrimary() {
    if (peek() === '-') {
      get();
      return -parsePrimary();
    }
    if (peek() === '+') {
      get();
      return parsePrimary();
    }

    if (peek() === '(') {
      get(); // consume '('
      const val = parseExpression();
      if (get() !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      return val;
    }

    // Check for math functions (sqrt, sin, cos, abs, etc.)
    if (/[a-z]/.test(peek())) {
      let funcName = '';
      while (index < clean.length && /[a-z]/.test(peek())) {
        funcName += get();
      }
      if (get() !== '(') {
        throw new Error(`Expected '(' after function ${funcName}`);
      }
      const arg = parseExpression();
      if (get() !== ')') {
        throw new Error(`Missing ')' after function ${funcName}`);
      }

      switch (funcName) {
        case 'sqrt': return Math.sqrt(arg);
        case 'abs': return Math.abs(arg);
        case 'sin': return Math.sin(arg);
        case 'cos': return Math.cos(arg);
        case 'tan': return Math.tan(arg);
        case 'round': return Math.round(arg);
        case 'floor': return Math.floor(arg);
        case 'ceil': return Math.ceil(arg);
        case 'log': return Math.log10(arg);
        case 'ln': return Math.log(arg);
        default:
          throw new Error(`Unknown mathematical function: ${funcName}`);
      }
    }

    return parseNumber();
  }

  function parsePower() {
    let base = parsePrimary();
    while (peek() === '^') {
      get();
      const exponent = parsePrimary();
      base = Math.pow(base, exponent);
    }
    return base;
  }

  function parseTerm() {
    let value = parsePower();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = get();
      const next = parsePower();
      if (op === '*') value *= next;
      else if (op === '/') {
        if (next === 0) throw new Error('Division by zero');
        value /= next;
      } else if (op === '%') {
        value %= next;
      }
    }
    return value;
  }

  function parseExpression() {
    let value = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = get();
      const next = parseTerm();
      if (op === '+') value += next;
      else if (op === '-') value -= next;
    }
    return value;
  }

  const result = parseExpression();
  if (index < clean.length) {
    throw new Error(`Unexpected character '${clean[index]}' at position ${index}`);
  }
  return Number(result.toFixed(8));
}

