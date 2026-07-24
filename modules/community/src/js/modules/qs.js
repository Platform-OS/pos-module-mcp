// querySelector - find in parent, return one element
const $q = (s, p = document) => p.querySelector(s);

// querySelectorAll - find all in parent, return array with element(s)
const $qa = (s, p = document) => Array.from(p.querySelectorAll(s));

export { $q, $qa };
