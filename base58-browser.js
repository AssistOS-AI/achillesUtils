/**
 * Browser wrapper for base58.js UMD module
 * Converts UMD exports to ES6 module exports
 */
import './base58.js';
const { encode, decode } = globalThis.base58 || window.base58;
export { encode, decode };
export default { encode, decode };