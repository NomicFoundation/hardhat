module.exports = {
  isExternalModule(name) {
    return isModule(name) || isScoped(name);
  },
};

const moduleRegExp = /^\w/;
function isModule(name) {
  return name && moduleRegExp.test(name);
}

const scopedRegExp = /^@[^/]+\/?[^/]+/;
function isScoped(name) {
  return name && scopedRegExp.test(name);
}
