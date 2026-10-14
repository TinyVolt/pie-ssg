import { numpy as np, defaultDevice, init, jit, blockUntilReady, vmap } from '@jax-js/jax';

let currentDevice: 'cpu' | 'wasm' | 'webgpu' = 'cpu';
const setDevice = (d: 'cpu' | 'wasm' | 'webgpu'): void => {
  currentDevice = d;
  defaultDevice(d);
};

// Keep cpu as an immediate synchronous fallback until init() resolves.
setDevice('cpu');

export const deviceReady: Promise<void> = (async () => {
  const devices = await init();
  if (devices.includes('webgpu')) {
    setDevice('webgpu');
  } else {
    setDevice('wasm');
  }
})();

export const getDevice = (): 'cpu' | 'wasm' | 'webgpu' => currentDevice;

export const withCpuDevice = <T>(fn: () => T): T => {
  const prev = currentDevice;
  if (prev === 'cpu') return fn();
  setDevice('cpu');
  try {
    return fn();
  } finally {
    setDevice(prev);
  }
};

export { np, jit, blockUntilReady, vmap };

const USE_JAX_TENSORS = true;

export type Dtype = typeof USE_JAX_TENSORS extends true ? np.Array : number;

let numericMode = false;
export const setNumericMode = (on: boolean): void => { numericMode = on; };
export const isNumericMode = (): boolean => numericMode;
const useJax = (): boolean => USE_JAX_TENSORS && !numericMode;

export const withNumericMode = <T>(fn: () => T): T => {
  if (numericMode) return fn();
  setNumericMode(true);
  try {
    return fn();
  } finally {
    setNumericMode(false);
  }
};

/** Wrap a plain number as a Dtype value */
export const scalar = (v: number): Dtype => 
  (useJax() ? np.array(v) : v) as Dtype;

/** Extract a plain number from a Dtype value */
export const num = (a: Dtype): number => {
  try {
    if (typeof a === 'number') return a;

    const arr = a as np.Array;

    if (typeof arr.item === 'function') {
      // If it's a real array and we call item(), we should do so without consuming it,
      // so we should use its .ref if available
      const arrRef = (arr as np.Array).ref;
      if (arrRef && typeof arrRef.item === 'function') {
        try {
          return arrRef.item();
        } catch (e) {
          // Fallback if ref is already freed or something
        }
      }
      return arr.item();
    }

    // If we're tracing and the underlying value has a primal
    if ((arr as any).primal && typeof (arr as any).primal.pval?.val?.item === 'function') {
      return (arr as any).primal.pval.val.item();
    }

    // As a last resort, just cast it to number (which usually yields NaN if it's an object)
    return Number(arr);
  } catch (error) {
    console.error(`Error extracting number from Dtype: ${error instanceof Error ? error.message : String(error)}`);
    return NaN;
  }
};

/** Polymorphic Math Layer */

// In numeric mode an operand may still be a JAX tensor (a value cached by a
// node that last recomputed in tensor mode); borrow-read it to a number.
const asNum = (a: Dtype): number =>
  (typeof a === 'number' ? a : num(a));

// In tensor mode an operand may still be a plain number (a value cached by a
// node that last recomputed in numeric mode); promote it to a fresh array.
const asArr = (a: Dtype): np.Array =>
  (typeof a === 'number' ? np.array(a) : a) as np.Array;

/**
 * Gets a reference to a Dtype if it is a JAX tensor,
 * so that it is not consumed when passed to another operation.
 */
export const ref = (a: Dtype): Dtype =>
  (useJax() && typeof a !== 'number' ? (a as np.Array).ref : a) as Dtype;

export const add = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.add(asArr(a), asArr(b)) : (asNum(a) + asNum(b))) as Dtype;

export const sub = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.subtract(asArr(a), asArr(b)) : (asNum(a) - asNum(b))) as Dtype;

export const mul = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.multiply(asArr(a), asArr(b)) : (asNum(a) * asNum(b))) as Dtype;

export const div = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.divide(asArr(a), asArr(b)) : (asNum(a) / asNum(b))) as Dtype;

export const sqrt = (a: Dtype): Dtype => 
  (useJax() ? np.sqrt(asArr(a)) : Math.sqrt(asNum(a))) as Dtype;

export const pow = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.power(asArr(a), asArr(b)) : Math.pow(asNum(a), asNum(b))) as Dtype;

export const cos = (a: Dtype): Dtype => 
  (useJax() ? np.cos(asArr(a)) : Math.cos(asNum(a))) as Dtype;

export const sin = (a: Dtype): Dtype => 
  (useJax() ? np.sin(asArr(a)) : Math.sin(asNum(a))) as Dtype;

export const acos = (a: Dtype): Dtype => 
  (useJax() ? np.arccos(asArr(a)) : Math.acos(asNum(a))) as Dtype;

export const asin = (a: Dtype): Dtype => 
  (useJax() ? np.arcsin(asArr(a)) : Math.asin(asNum(a))) as Dtype;

export const atan = (a: Dtype): Dtype => 
  (useJax() ? np.arctan(asArr(a)) : Math.atan(asNum(a))) as Dtype;

export const atan2 = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.arctan2(asArr(a), asArr(b)) : Math.atan2(asNum(a), asNum(b))) as Dtype;

export const log = (a: Dtype): Dtype => 
  (useJax() ? np.log(asArr(a)) : Math.log(asNum(a))) as Dtype;

export const exp = (a: Dtype): Dtype => 
  (useJax() ? np.exp(asArr(a)) : Math.exp(asNum(a))) as Dtype;

export const log10 = (a: Dtype): Dtype => 
  (useJax() ? np.log10(asArr(a)) : Math.log10(asNum(a))) as Dtype;

export const abs = (a: Dtype): Dtype => 
  (useJax() ? np.abs(asArr(a)) : Math.abs(asNum(a))) as Dtype;

export const sign = (a: Dtype): Dtype => 
  (useJax() ? np.sign(asArr(a)) : Math.sign(asNum(a))) as Dtype;

export const floor = (a: Dtype): Dtype => 
  (useJax() ? np.floor(asArr(a)) : Math.floor(asNum(a))) as Dtype;

export const ceil = (a: Dtype): Dtype => 
  (useJax() ? np.ceil(asArr(a)) : Math.ceil(asNum(a))) as Dtype;

export const round = (a: Dtype): Dtype => 
  (useJax() ? np.round(asArr(a)) : Math.round(asNum(a))) as Dtype;

export const tan = (a: Dtype): Dtype => 
  (useJax() ? np.tan(asArr(a)) : Math.tan(asNum(a))) as Dtype;

export const mod = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.fmod(asArr(a), asArr(b)) : (asNum(a) % asNum(b))) as Dtype;

export const minimum = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.minimum(asArr(a), asArr(b)) : Math.min(asNum(a), asNum(b))) as Dtype;

export const maximum = (a: Dtype, b: Dtype): Dtype => 
  (useJax() ? np.maximum(asArr(a), asArr(b)) : Math.max(asNum(a), asNum(b))) as Dtype;

export const mean = (a: Dtype): Dtype => 
  (useJax() ? np.mean(asArr(a)) : asNum(a)) as Dtype;

export const std = (a: Dtype): Dtype => 
  (useJax() ? np.std(asArr(a)) : asNum(a)) as Dtype;

export const var_ = (a: Dtype): Dtype => 
  (useJax() ? np.var_(asArr(a)) : asNum(a)) as Dtype;