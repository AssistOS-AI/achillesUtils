(function (root, factory) {
    if (typeof exports === 'object') {
        // Node.js
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define([], factory);
    } else {
        // Browser globals
        root.base58 = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // Simple helper to create Uint8Array from various inputs
    function createBuffer(data) {
        if (data instanceof Uint8Array) return data;
        if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) return new Uint8Array(data);
        if (Array.isArray(data)) return new Uint8Array(data);
        if (typeof data === 'string') {
            const arr = new Uint8Array(data.length);
            for (let i = 0; i < data.length; i++) {
                arr[i] = data.charCodeAt(i);
            }
            return arr;
        }
        return new Uint8Array(data);
    }

    // Polyfill fill method for older browsers
    function fillArray(arr, value, start = 0, end = arr.length) {
        for (let i = start; i < end; i++) {
            arr[i] = value;
        }
    }

    const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const BASE = ALPHABET.length;
    const LEADER = ALPHABET.charAt(0);
    const FACTOR = Math.log(BASE) / Math.log(256); // log(BASE) / log(256), rounded up
    const iFACTOR = Math.log(256) / Math.log(BASE); // log(256) / log(BASE), rounded up

    const BASE_MAP = new Uint8Array(256);
    fillArray(BASE_MAP, 255);
    for (let i = 0; i < ALPHABET.length; i++) {
        let x = ALPHABET.charAt(i);
        let xc = x.charCodeAt(0);
        if (BASE_MAP[xc] !== 255) {
            throw new TypeError(x + ' is ambiguous');
        }
        BASE_MAP[xc] = i;
    }

    function encode(source) {
        if (Array.isArray(source) || source instanceof Uint8Array || typeof source === "string" || (typeof Buffer !== 'undefined' && Buffer.isBuffer(source))) {
            source = createBuffer(source);
        }
        if (!(source instanceof Uint8Array)) {
            throw new TypeError('Expected Buffer, Uint8Array, Array, or string');
        }
        if (source.length === 0) {
            return '';
        }
        // Skip & count leading zeroes.
        let zeroes = 0;
        let length = 0;
        let pbegin = 0;
        const pend = source.length;
        while (pbegin !== pend && source[pbegin] === 0) {
            pbegin++;
            zeroes++;
        }
        // Allocate enough space in big-endian base58 representation.
        const size = ((pend - pbegin) * iFACTOR + 1) >>> 0;
        const b58 = new Uint8Array(size);
        // Process the bytes.
        while (pbegin !== pend) {
            let carry = source[pbegin];
            // Apply "b58 = b58 * 256 + ch".
            let i = 0;
            for (let it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
                carry += (256 * b58[it1]) >>> 0;
                b58[it1] = (carry % BASE) >>> 0;
                carry = (carry / BASE) >>> 0;
            }
            if (carry !== 0) {
                throw new Error('Non-zero carry');
            }
            length = i;
            pbegin++;
        }
        // Skip leading zeroes in base58 result.
        let it2 = size - length;
        while (it2 !== size && b58[it2] === 0) {
            it2++;
        }
        // Translate the result into a string.
        let str = LEADER.repeat(zeroes);
        for (; it2 < size; ++it2) {
            str += ALPHABET.charAt(b58[it2]);
        }
        return str;
    }

    function decode(source) {
        if (typeof source !== 'string') {
            throw new TypeError('Expected String');
        }
        if (source.length === 0) {
            return new Uint8Array(0);
        }
        let psz = 0;
        // Skip leading spaces.
        if (source[psz] === ' ') {
            return;
        }
        // Skip and count leading '1's.
        let zeroes = 0;
        let length = 0;
        while (source[psz] === LEADER) {
            zeroes++;
            psz++;
        }
        // Allocate enough space in big-endian base256 representation.
        const size = (((source.length - psz) * FACTOR) + 1) >>> 0; // log(58) / log(256), rounded up.
        const b256 = new Uint8Array(size);
        // Process the characters.
        while (source[psz]) {
            // Decode character
            let carry = BASE_MAP[source.charCodeAt(psz)];
            // Invalid character
            if (carry === 255) {
                return;
            }
            let i = 0;
            for (let it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
                carry += (BASE * b256[it3]) >>> 0;
                b256[it3] = (carry % 256) >>> 0;
                carry = (carry / 256) >>> 0;
            }
            if (carry !== 0) {
                throw new Error('Non-zero carry');
            }
            length = i;
            psz++;
        }
        // Skip trailing spaces.
        if (source[psz] === ' ') {
            return;
        }
        // Skip leading zeroes in b256.
        let it4 = size - length;
        while (it4 !== size && b256[it4] === 0) {
            it4++;
        }
        const vch = new Uint8Array(zeroes + (size - it4));
        fillArray(vch, 0x00, 0, zeroes);
        let j = zeroes;
        while (it4 !== size) {
            vch[j++] = b256[it4++];
        }
        return vch;
    }

    return {
        encode,
        decode
    };
}));