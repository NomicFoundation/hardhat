/**
 * This is a dictionary of type names to functions that receive the param name
 * and the raw string value. They validate the value, throwing if invalid, and
 * convert the right type.
 */
module.exports = {
  string: (name, s) => s,
  boolean: (name, s) => {
    if (s.toLowerCase() === "true") return true;
    if (s.toLowerCase() === "false") return false;
    throw new Error(`Unrecognized boolean value "${s}" of param ${name}`);
  },
  int: (name, s) => {
    const parsed = parseInt(s, 10);
    if (isNaN(parsed))
      throw new Error(`Unrecognized integer value "${s}" of param ${name}`);

    return parsed;
  },
  float: (name, s) => {
    const parsed = parseFloat(s);
    if (isNaN(parsed))
      throw new Error(`Unrecognized float value "${s}" of param ${name}`);

    return parsed;
  }
};
